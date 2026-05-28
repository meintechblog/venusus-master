// PostgreSQL connection pool + helpers for venusus-master
// Hybrid search: pgvector (semantic) + tsvector (FTS) with Reciprocal Rank Fusion

import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://venusus:venusus_local_only@127.0.0.1:5432/venusus_master";

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

export const pool: Pool =
  globalForPool.__pgPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") globalForPool.__pgPool = pool;

// -------- Stats for homepage dashboard --------

export type Stats = {
  documentCount: number;
  chunkCount: number;
  sourceTypeCount: number;
  victronOfficialCount: number;
  communityDriverCount: number;
  ownFindingsCount: number;
  pdfCount: number;
  proPortalCount: number;
  liveDocCount: number;
  memoryCount: number;
  sourceRepoCount: number;
  dbSizeBytes: number;
  lastIngestAt: string | null;
};

export async function getStats(): Promise<Stats> {
  const { rows } = await pool.query("SELECT * FROM v_stats");
  const r = rows[0] ?? {};
  return {
    documentCount: Number(r.document_count ?? 0),
    chunkCount: Number(r.chunk_count ?? 0),
    sourceTypeCount: Number(r.source_type_count ?? 0),
    victronOfficialCount: Number(r.victron_official_count ?? 0),
    communityDriverCount: Number(r.community_driver_count ?? 0),
    ownFindingsCount: Number(r.own_findings_count ?? 0),
    pdfCount: Number(r.pdf_count ?? 0),
    proPortalCount: Number(r.pro_portal_count ?? 0),
    liveDocCount: Number(r.live_doc_count ?? 0),
    memoryCount: Number(r.memory_count ?? 0),
    sourceRepoCount: Number(r.source_repo_count ?? 0),
    dbSizeBytes: Number(r.db_size_bytes ?? 0),
    lastIngestAt: r.last_ingest_at ? new Date(r.last_ingest_at).toISOString() : null,
  };
}

// -------- Embedding service client --------

const EMBED_URL = process.env.EMBED_URL ?? "http://127.0.0.1:8765";

export async function embedQuery(query: string): Promise<number[]> {
  const resp = await fetch(`${EMBED_URL}/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ texts: [query], kind: "query" }),
  });
  if (!resp.ok) throw new Error(`Embedding service ${resp.status}`);
  const data = (await resp.json()) as { embeddings: number[][] };
  return data.embeddings[0];
}

export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

// -------- Hybrid search with Reciprocal Rank Fusion --------

export type SearchHit = {
  id: number;
  docId: number;
  slug: string;
  title: string;
  category: string;
  subcategory: string | null;
  sourceType: string;
  sourceUrl: string | null;
  internalPath: string;
  lastUpdated: string;
  hasOwnContent: boolean;
  headingPath: string | null;
  snippet: string;
  matchScore: number;
};

const RRF_K = 60; // constant for Reciprocal Rank Fusion

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Build a match-aware snippet: window the text around the first matched term
// (instead of always taking the head of the chunk), HTML-escape it so code-ish
// chunk content can't break the markup, then wrap matched terms in <mark>.
// Semantic-only hits with no literal term in the chunk fall back to the head.
function makeSnippet(text: string, terms: string[], win = 300): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  let pos = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  let start = 0;
  if (pos > 80) {
    start = pos - 80;
    // snap forward to the next word boundary so we don't cut mid-word
    const sp = text.indexOf(" ", start);
    if (sp !== -1 && sp - start < 40) start = sp + 1;
  }
  const prefix = start > 0 ? "…" : "";
  const suffix = start + win < text.length ? "…" : "";
  let slice = escapeHtml(text.slice(start, start + win));
  for (const term of terms) {
    const re = new RegExp(`(${escapeRegExp(term)})`, "ig");
    slice = slice.replace(re, "<mark>$1</mark>");
  }
  return prefix + slice + suffix;
}

export async function hybridSearch(query: string, limit = 20): Promise<SearchHit[]> {
  const queryEmbedding = await embedQuery(query);
  const vecLiteral = toVectorLiteral(queryEmbedding);

  // Two parallel ranked lists, then RRF
  const { rows } = await pool.query(
    `
    WITH semantic AS (
      SELECT
        c.id            AS chunk_id,
        c.doc_id,
        c.content,
        c.heading_path,
        ROW_NUMBER() OVER (ORDER BY c.embedding <=> $1::vector) AS rnk
      FROM chunks c
      ORDER BY c.embedding <=> $1::vector
      LIMIT 80
    ),
    fts AS (
      SELECT
        c.id            AS chunk_id,
        c.doc_id,
        c.content,
        c.heading_path,
        ROW_NUMBER() OVER (ORDER BY ts_rank(c.tsv, plainto_tsquery('simple', $2)) DESC) AS rnk
      FROM chunks c
      WHERE c.tsv @@ plainto_tsquery('simple', $2)
      ORDER BY ts_rank(c.tsv, plainto_tsquery('simple', $2)) DESC
      LIMIT 80
    ),
    fused AS (
      SELECT
        COALESCE(s.chunk_id, f.chunk_id)  AS chunk_id,
        COALESCE(s.doc_id,  f.doc_id)     AS doc_id,
        COALESCE(s.content, f.content)    AS content,
        COALESCE(s.heading_path, f.heading_path) AS heading_path,
        COALESCE(1.0 / ($3 + s.rnk), 0)   AS s_score,
        COALESCE(1.0 / ($3 + f.rnk), 0)   AS f_score
      FROM semantic s FULL OUTER JOIN fts f USING (chunk_id)
    ),
    best_per_doc AS (
      -- Collapse to the single best-scoring chunk per document so a doc with
      -- many matching chunks shows up once, not N times.
      SELECT DISTINCT ON (doc_id)
        chunk_id, doc_id, content, heading_path,
        (s_score + f_score) AS score
      FROM fused
      ORDER BY doc_id, (s_score + f_score) DESC
    ),
    ranked AS (
      SELECT chunk_id, doc_id, content, heading_path, score
      FROM best_per_doc
      ORDER BY score DESC
      LIMIT $4
    )
    SELECT
      r.chunk_id        AS id,
      r.doc_id,
      d.slug,
      d.title,
      d.category,
      d.subcategory,
      d.source_type     AS "sourceType",
      d.source_url      AS "sourceUrl",
      d.internal_path   AS "internalPath",
      d.last_updated    AS "lastUpdated",
      d.has_own_content AS "hasOwnContent",
      r.content,
      r.heading_path,
      r.score::float    AS "matchScore"
    FROM ranked r
    JOIN documents d ON d.id = r.doc_id
    ORDER BY r.score DESC
    `,
    [vecLiteral, query, RRF_K, limit]
  );

  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

  return rows.map((r) => ({
    id: Number(r.id),
    docId: Number(r.doc_id),
    slug: r.slug,
    title: r.title,
    category: r.category,
    subcategory: r.subcategory,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    internalPath: r.internalPath,
    lastUpdated: new Date(r.lastUpdated).toISOString(),
    hasOwnContent: r.hasOwnContent,
    headingPath: (r.heading_path as string | null) ?? null,
    snippet: makeSnippet((r.content as string | null) ?? "", terms),
    matchScore: Number(r.matchScore),
  }));
}

// -------- Documents API for category pages and doc reader --------

export async function listDocumentsByCategory(category: string) {
  const { rows } = await pool.query(
    `SELECT slug, title, summary, subcategory, source_type AS "sourceType", source_url AS "sourceUrl",
            last_updated AS "lastUpdated", has_own_content AS "hasOwnContent", tags
       FROM documents
      WHERE category = $1
      ORDER BY last_updated DESC, title ASC`,
    [category]
  );
  return rows;
}

export async function getDocumentBySlug(slug: string) {
  const { rows } = await pool.query(
    `SELECT d.*, (SELECT string_agg(c.content, E'\n\n' ORDER BY c.chunk_index) FROM chunks c WHERE c.doc_id = d.id) AS content
       FROM documents d WHERE d.slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function listFindingsChronological() {
  const { rows } = await pool.query(
    `SELECT slug, title, summary, last_updated AS "lastUpdated", subcategory,
            source_type AS "sourceType", category, internal_path AS "internalPath",
            has_own_content AS "hasOwnContent", source_url AS "sourceUrl", tags
       FROM documents WHERE source_type IN ('own-findings','memory')
       ORDER BY last_updated DESC`
  );
  return rows;
}

export async function listAllCategories() {
  const { rows } = await pool.query(
    `SELECT category AS slug, COUNT(*)::int AS count
       FROM documents
      GROUP BY category
      ORDER BY count DESC, category ASC`
  );
  return rows as { slug: string; count: number }[];
}

export async function listRecentDocuments(limit = 5) {
  const { rows } = await pool.query(
    `SELECT slug, title, summary, category, subcategory,
            source_type AS "sourceType", source_url AS "sourceUrl",
            internal_path AS "internalPath", last_updated AS "lastUpdated",
            has_own_content AS "hasOwnContent", tags
       FROM documents
      ORDER BY last_updated DESC, title ASC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function listAllDocumentSlugs() {
  const { rows } = await pool.query(`SELECT slug FROM documents`);
  return rows.map((r) => r.slug as string);
}

export async function listAllCategorySlugs() {
  const { rows } = await pool.query(`SELECT DISTINCT category AS slug FROM documents`);
  return rows.map((r) => r.slug as string);
}

export type LiveSearchHit = {
  slug: string;
  title: string;
  summary: string;
  sourceType: string;
  category: string;
};

export async function liveSearchTitles(query: string, limit = 8): Promise<LiveSearchHit[]> {
  // Cheap title+summary trigram + tsvector hybrid for typeahead.
  // No embedding — instant, no GPU/CPU spin, good enough for autocomplete.
  const q = query.trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  // Build dynamic AND-ILIKE across tokens against title || ' ' || summary.
  // First param is full query (for trigram score). Tokens follow as $2..$N.
  const tokenParams = tokens.map((_, i) => `$${i + 2}`);
  const ilikeClauses = tokenParams
    .map((p) => `(title ILIKE '%' || ${p} || '%' OR COALESCE(summary,'') ILIKE '%' || ${p} || '%')`)
    .join(" AND ");

  const sql = `
    SELECT slug, title, COALESCE(summary,'') AS summary,
           source_type AS "sourceType", category,
           GREATEST(
             similarity(title, $1) * 2,
             similarity(COALESCE(summary,''), $1)
           ) AS score
      FROM documents
     WHERE ${ilikeClauses}
        OR similarity(title, $1) > 0.25
     ORDER BY score DESC NULLS LAST, length(title) ASC
     LIMIT $${tokens.length + 2}
  `;
  const { rows } = await pool.query(sql, [q, ...tokens, limit]);
  return rows as LiveSearchHit[];
}
