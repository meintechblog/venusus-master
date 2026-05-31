"""
venusus-master Content-Ingest-Pipeline.

Reads Markdown documents from:
  - /opt/venusus-master/content/own-findings/      → source-type 'own-findings'
  - /opt/venusus-master/content/docs/              → source-type 'own-findings'  (eigene docs/01-20)
  - /opt/venusus-master/content/memory/            → source-type 'memory'
  - /opt/venusus-master/content/victron-official/  → source-type 'victron-official' / 'live-doc' / 'pdf-manual' / 'pro-portal'
  - /opt/venusus-master/content/community-drivers/ → source-type 'community-driver'

Chunks each doc, embeds chunks via the local FastAPI embedding service,
upserts into Postgres (documents + chunks tables).

Idempotent: re-ingest replaces all chunks of a doc but preserves doc id.
"""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
import psycopg
from psycopg.rows import dict_row

# Production sets DATABASE_URL in the environment; this is a local-dev placeholder.
PG_DSN = os.environ.get(
    "DATABASE_URL", "postgres://venusus:<password>@127.0.0.1:5432/venusus_master"
)
EMBED_URL = os.environ.get("EMBED_URL", "http://127.0.0.1:8765")
CONTENT_ROOT = Path(os.environ.get("CONTENT_ROOT", "/opt/venusus-master/content"))

# ----- Source-type inference --------------------------------------------------

def infer_source(rel_path: Path) -> tuple[str, str, str | None, str | None]:
    """
    Returns (category, source_type, subcategory, source_url_hint).
    """
    parts = rel_path.parts
    name = parts[0] if parts else ""

    # sync-content.sh rsyncs knowledge/<subtree> → content/knowledge/<subtree>.
    # Strip the prefix and re-dispatch so victron-official/community-drivers/
    # victron-professional/meintechblog get their proper source-type instead
    # of falling through to the 'misc' default.
    if name == "knowledge" and len(parts) > 1:
        return infer_source(Path(*parts[1:]))

    if name == "docs":
        return ("our-installation", "own-findings", None, None)

    if name == "memory":
        return ("findings-and-decisions", "memory", None, None)

    if name == "own-findings":
        return ("findings-and-decisions", "own-findings", None, None)

    if name == "reports":
        return ("findings-and-decisions", "own-findings", "report", None)

    if name == "meintechblog":
        return ("community-blogs", "live-doc", "meintechblog", None)

    if name == "community-forum":
        return ("community-blogs", "live-doc", "community-forum", None)

    if name == "research-papers":
        # Peer-reviewed scientific papers (PDF + curated markdown article).
        # New display category "research-papers"; source_type stays within the
        # existing enum (live-doc for the .md article; PDFs default to pdf-manual).
        sub = parts[1] if len(parts) > 1 else None  # e.g. "lfp"
        return ("research-papers", "live-doc", sub, None)

    if name == "victron-official":
        if len(parts) > 1 and parts[1] == "live-docs":
            return ("victron-official", "live-doc", None, None)
        if len(parts) > 1 and parts[1] == "wiki":
            return ("victron-official", "live-doc", "wiki", None)
        if len(parts) > 1 and parts[1] == "datasheets":
            return ("victron-official", "pdf-manual", None, None)
        if len(parts) > 1 and parts[1] == "source-repos":
            sub = parts[2] if len(parts) > 2 else None
            return ("victron-official", "source-repo", sub, None)
        return ("victron-official", "victron-official", None, None)

    if name == "victron-professional":
        return ("pro-portal", "pro-portal", parts[1] if len(parts) > 1 else None, None)

    if name == "community-drivers":
        sub = parts[1] if len(parts) > 1 else None
        return ("community-drivers", "community-driver", sub, None)

    return ("misc", "victron-official", None, None)


# ----- Frontmatter parser (very small, no extra deps) ------------------------

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return ({}, text)
    fm_block = m.group(1)
    body = text[m.end():]
    fm: dict[str, str] = {}
    current = None
    for line in fm_block.splitlines():
        if ":" in line and not line.startswith(" "):
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"').strip("'")
            current = k.strip()
    return (fm, body)


# ----- Chunking ---------------------------------------------------------------

def split_by_headings(text: str) -> list[tuple[str, str]]:
    """
    Returns list of (heading_path, chunk_text).
    Splits on H2/H3 markdown headings, keeping the full heading chain as path.
    """
    lines = text.splitlines()
    chunks: list[tuple[str, str]] = []
    current_h1 = ""
    current_h2 = ""
    current_h3 = ""
    buffer: list[str] = []

    def flush():
        body = "\n".join(buffer).strip()
        if body:
            path = " > ".join(filter(None, [current_h1, current_h2, current_h3]))
            chunks.append((path or current_h1 or "Top", body))

    for line in lines:
        if line.startswith("# ") and not line.startswith("##"):
            flush()
            buffer = []
            current_h1 = line[2:].strip()
            current_h2 = ""
            current_h3 = ""
        elif line.startswith("## "):
            flush()
            buffer = []
            current_h2 = line[3:].strip()
            current_h3 = ""
        elif line.startswith("### "):
            flush()
            buffer = []
            current_h3 = line[4:].strip()
        else:
            buffer.append(line)
    flush()
    return chunks


def further_chunk(text: str, max_chars: int = 2400, overlap: int = 240) -> list[str]:
    """Fallback: if a section is huge, split by paragraphs/length."""
    if len(text) <= max_chars:
        return [text]
    paras = text.split("\n\n")
    out: list[str] = []
    cur = ""
    for p in paras:
        if len(cur) + len(p) + 2 < max_chars:
            cur = (cur + "\n\n" + p) if cur else p
        else:
            if cur:
                out.append(cur)
            cur = p
    if cur:
        out.append(cur)
    # naive overlap: prepend last overlap chars of previous chunk to next
    overlapped: list[str] = []
    prev = ""
    for c in out:
        if prev and overlap > 0:
            overlapped.append(prev[-overlap:] + "\n\n" + c)
        else:
            overlapped.append(c)
        prev = c
    return overlapped


# ----- Embeddings ------------------------------------------------------------

def embed_batch(texts: list[str], kind: str = "passage") -> list[list[float]]:
    if not texts:
        return []
    with httpx.Client(timeout=120) as client:
        r = client.post(f"{EMBED_URL}/embed", json={"texts": texts, "kind": kind})
        r.raise_for_status()
        return r.json()["embeddings"]


def vec_literal(v: list[float]) -> str:
    return "[" + ",".join(repr(round(float(x), 7)) for x in v) + "]"


# ----- DB helpers ------------------------------------------------------------

def upsert_document(cur, *, slug: str, title: str, summary: str, category: str,
                    subcategory: str | None, source_type: str, source_url: str | None,
                    internal_path: str, last_updated: datetime, has_own_content: bool,
                    tags: list[str]) -> int:
    cur.execute(
        """
        INSERT INTO documents (slug, title, summary, category, subcategory, source_type,
                               source_url, internal_path, last_updated, has_own_content, tags)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          source_type = EXCLUDED.source_type,
          source_url = EXCLUDED.source_url,
          internal_path = EXCLUDED.internal_path,
          last_updated = EXCLUDED.last_updated,
          has_own_content = EXCLUDED.has_own_content,
          tags = EXCLUDED.tags
        RETURNING id
        """,
        (slug, title, summary, category, subcategory, source_type, source_url,
         internal_path, last_updated, has_own_content, tags),
    )
    return cur.fetchone()["id"]


def replace_chunks(cur, doc_id: int, chunks_with_embeddings: list[tuple[str, str, list[float]]]):
    cur.execute("DELETE FROM chunks WHERE doc_id = %s", (doc_id,))
    for i, (heading, content, vec) in enumerate(chunks_with_embeddings):
        cur.execute(
            """
            INSERT INTO chunks (doc_id, chunk_index, heading_path, content, token_count, embedding)
            VALUES (%s,%s,%s,%s,%s,%s::vector)
            """,
            (doc_id, i, heading, content, len(content) // 4, vec_literal(vec)),
        )


# ----- Main ingest -----------------------------------------------------------

def slug_for(rel_path: Path) -> str:
    s = str(rel_path.with_suffix(""))
    s = re.sub(r"[^a-zA-Z0-9_\-/]+", "-", s)
    s = s.replace("/", "--").strip("-")
    return s.lower()


def title_from_markdown(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
        if line.strip():
            return line.strip()[:120]
    return fallback


def summary_from_markdown(text: str) -> str:
    paras = [p.strip() for p in text.split("\n\n") if p.strip() and not p.startswith("#") and not p.startswith(">")]
    return (paras[0][:300] + "…") if paras and len(paras[0]) > 300 else (paras[0] if paras else "")


def extract_pdf_text(fp: Path) -> str:
    try:
        import pypdf
    except ImportError:
        return ""
    out = []
    with fp.open("rb") as f:
        reader = pypdf.PdfReader(f)
        for i, page in enumerate(reader.pages, 1):
            try:
                txt = page.extract_text() or ""
            except Exception:
                txt = ""
            if txt.strip():
                out.append(f"## Page {i}\n\n{txt.strip()}")
    return "\n\n".join(out)


DATE_PREFIX_RE = re.compile(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}[\s\d:]*")


def title_from_pdf_text(body: str, fallback: str) -> str:
    # Walk first ~40 lines, pick the first plausible title.
    for raw in body.splitlines()[:40]:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        # Strip leading timestamp e.g. "2019-06-08 22:47 1/4 How to update..."
        line = DATE_PREFIX_RE.sub("", line).strip()
        if len(line) < 5 or len(line) > 140:
            continue
        if line.lower().startswith(("page ", "seite ", "http", "www.")):
            continue
        if line.replace(" ", "").isdigit():
            continue
        # Skip marketing slash-fests ("/ Perfect Charging / Perfect Welding")
        if line.count("/") >= 2 and len(line.split("/")) > 2:
            continue
        # Skip lines that are mostly punctuation / dots / dashes
        if sum(ch.isalpha() for ch in line) < len(line) * 0.4:
            continue
        return line
    return fallback


def ingest_file(cur, fp: Path, run_stats: dict):
    rel = fp.relative_to(CONTENT_ROOT)
    if fp.suffix.lower() == ".pdf":
        category, _, subcategory, _ = infer_source(rel)
        source_type = "pdf-manual"
        body = extract_pdf_text(fp)
        if not body.strip():
            print(f"  WARN {fp}: empty PDF text", flush=True)
            return
        fm = {}
        fallback_title = fp.stem.replace("_", " ").replace("-", " ")
        title = title_from_pdf_text(body, fallback_title)
        summary = body.split("\n\n", 1)[0][:300]
    else:
        category, source_type, subcategory, _ = infer_source(rel)
        text = fp.read_text(encoding="utf-8", errors="ignore")
        fm, body = parse_frontmatter(text)
        title = fm.get("name") or title_from_markdown(body, fp.stem)
        summary = fm.get("description") or summary_from_markdown(body)

    # Heuristic for source_url: scan first ~10 lines for "Source: URL" / "Quelle: URL"
    source_url = None
    for line in body.splitlines()[:15]:
        m = re.search(r"(?:Source|Quelle)\s*[:=]\s*(https?://\S+)", line, re.IGNORECASE)
        if m:
            source_url = m.group(1).rstrip(")")
            break

    mtime = datetime.fromtimestamp(fp.stat().st_mtime, tz=timezone.utc)
    slug = slug_for(rel)
    tags = []

    has_own = source_type in ("own-findings", "memory")

    doc_id = upsert_document(cur,
        slug=slug, title=title, summary=summary, category=category, subcategory=subcategory,
        source_type=source_type, source_url=source_url, internal_path=str(rel),
        last_updated=mtime, has_own_content=has_own, tags=tags)

    # Chunk
    sections = split_by_headings(body) or [("Top", body)]
    expanded: list[tuple[str, str]] = []
    for heading, section in sections:
        for sub in further_chunk(section, max_chars=2400, overlap=240):
            expanded.append((heading, sub))
    if not expanded:
        expanded = [("Top", body[:2000])]

    # Embed in batches of 32 for throughput
    BATCH = 32
    embeddings: list[list[float]] = []
    contents = [c for _, c in expanded]
    for i in range(0, len(contents), BATCH):
        embeddings.extend(embed_batch(contents[i:i+BATCH], kind="passage"))

    triples = [(h, c, e) for (h, c), e in zip(expanded, embeddings)]
    replace_chunks(cur, doc_id, triples)
    run_stats["chunks_total"] += len(triples)
    run_stats["documents_added"] += 1


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--content", default=str(CONTENT_ROOT))
    args = p.parse_args()
    root = Path(args.content)
    if not root.exists():
        print(f"content root {root} not found", file=sys.stderr)
        sys.exit(1)

    run_stats = {"chunks_total": 0, "documents_added": 0, "documents_updated": 0, "documents_removed": 0}

    with psycopg.connect(PG_DSN, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO ingest_runs (started_at) VALUES (NOW()) RETURNING id")
            run_id = cur.fetchone()["id"]
            conn.commit()

            count = 0
            files = sorted(list(root.rglob("*.md")) + list(root.rglob("*.pdf")))
            for fp in files:
                # skip hidden/git
                if any(part.startswith(".") for part in fp.relative_to(root).parts):
                    continue
                try:
                    ingest_file(cur, fp, run_stats)
                    count += 1
                    if count % 10 == 0:
                        conn.commit()
                        print(f"  ... {count} docs ingested", flush=True)
                except Exception as e:
                    print(f"  WARN {fp}: {e}", flush=True)
            conn.commit()

            cur.execute(
                """UPDATE ingest_runs SET finished_at=NOW(),
                   documents_added=%s, chunks_total=%s WHERE id=%s""",
                (run_stats["documents_added"], run_stats["chunks_total"], run_id),
            )
            conn.commit()

    print(f"Done. {count} documents, {run_stats['chunks_total']} chunks.")


if __name__ == "__main__":
    main()
