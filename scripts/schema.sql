-- venusus-master Knowledge Base — PostgreSQL + pgvector Schema
-- Hybrid Search: tsvector (FTS) + vector (semantic) with Reciprocal Rank Fusion

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Documents: one row per ingested source file
CREATE TABLE IF NOT EXISTS documents (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  source_type     TEXT NOT NULL CHECK (source_type IN (
    'victron-official','community-driver','own-findings',
    'pdf-manual','live-doc','pro-portal','source-repo','memory'
  )),
  source_url      TEXT,
  internal_path   TEXT NOT NULL,
  last_updated    TIMESTAMPTZ NOT NULL,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_own_content BOOLEAN NOT NULL DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}'::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_documents_category   ON documents(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_documents_source     ON documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_own        ON documents(has_own_content);
CREATE INDEX IF NOT EXISTS idx_documents_updated    ON documents(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tags       ON documents USING GIN(tags);

-- Chunks: per-document split units, each with its own embedding
-- multilingual-e5-small produces 384-dim embeddings
CREATE TABLE IF NOT EXISTS chunks (
  id            BIGSERIAL PRIMARY KEY,
  doc_id        BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  heading_path  TEXT,                          -- z.B. "6. Controlling depth of discharge > 6.2 BatteryLife"
  content       TEXT NOT NULL,
  token_count   INTEGER,
  embedding     vector(384),                   -- multilingual-e5-small
  tsv           tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(heading_path,'')), 'A') ||
    setweight(to_tsvector('simple', content), 'B')
  ) STORED,
  UNIQUE (doc_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc          ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv          ON chunks USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding    ON chunks USING hnsw (embedding vector_cosine_ops);

-- Stats view for the home dashboard (cheap to compute, served fresh on every request)
CREATE OR REPLACE VIEW v_stats AS
SELECT
  (SELECT COUNT(*) FROM documents)                                            AS document_count,
  (SELECT COUNT(*) FROM chunks)                                               AS chunk_count,
  (SELECT COUNT(DISTINCT source_type) FROM documents)                         AS source_type_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'victron-official')     AS victron_official_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'community-driver')     AS community_driver_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'own-findings')         AS own_findings_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'pdf-manual')           AS pdf_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'pro-portal')           AS pro_portal_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'live-doc')             AS live_doc_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'memory')               AS memory_count,
  (SELECT COUNT(*) FROM documents WHERE source_type = 'source-repo')          AS source_repo_count,
  (SELECT pg_database_size(current_database()))                               AS db_size_bytes,
  (SELECT MAX(ingested_at) FROM documents)                                    AS last_ingest_at;

-- Audit trail for re-ingest runs
CREATE TABLE IF NOT EXISTS ingest_runs (
  id              BIGSERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  documents_added INTEGER DEFAULT 0,
  documents_updated INTEGER DEFAULT 0,
  documents_removed INTEGER DEFAULT 0,
  chunks_total    INTEGER DEFAULT 0,
  notes           TEXT
);

-- Notification trigger for SSE: announce when documents change
CREATE OR REPLACE FUNCTION notify_doc_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('doc_change', json_build_object(
    'op', TG_OP,
    'doc_id', COALESCE(NEW.id, OLD.id),
    'slug', COALESCE(NEW.slug, OLD.slug)
  )::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_notify ON documents;
CREATE TRIGGER documents_notify
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION notify_doc_change();
