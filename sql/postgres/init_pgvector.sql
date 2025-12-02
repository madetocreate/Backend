CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_entries (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  kind text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_vectors (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  domain text NOT NULL,
  entry_id bigint NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_tenant_kind_status_created_at
ON memory_entries (tenant_id, kind, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_vectors_tenant_domain
ON memory_vectors (tenant_id, domain);

CREATE INDEX IF NOT EXISTS idx_memory_vectors_embedding_l2
ON memory_vectors USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);
