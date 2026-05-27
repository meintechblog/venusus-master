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
  snippet: string;
  matchScore: number;
};

const RRF_K = 60; // constant for Reciprocal Rank Fusion

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
    ranked AS (
      SELECT
        chunk_id, doc_id, content, heading_path,
        (s_score + f_score) AS score
      FROM fused
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

  // Build snippets: first ~300 chars of chunk content with naive query highlighting
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  const highlight = (text: string) => {
    let out = text.slice(0, 320);
    for (const term of terms) {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
      out = out.replace(re, "<mark>$1</mark>");
    }
    return out;
  };

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
    snippet: highlight(r.content ?? ""),
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
    `SELECT slug, title, summary, last_updated AS "lastUpdated", subcategory
       FROM documents WHERE source_type = 'own-findings'
       ORDER BY last_updated DESC`
  );
  return rows;
}
