import { pgQuery } from "./client"

export type MemoryEntryStatus = "active" | "archived" | "deleted"

export interface MemoryEntry {
  id: number
  tenantId: string
  kind: string
  content: string
  metadata?: Record<string, unknown>
  status: MemoryEntryStatus
  createdAt: string
}

function toVectorLiteral(values: number[]): string {
  return "[" + values.join(",") + "]"
}

export async function insertMemoryEntry(
  tenantId: string,
  kind: string,
  content: string,
  metadata: Record<string, unknown> | null,
  status: MemoryEntryStatus = "active"
): Promise<MemoryEntry> {
  const result = await pgQuery<{
    id: number
    tenant_id: string
    kind: string
    content: string
    metadata: Record<string, unknown> | null
    status: string
    created_at: string
  }>(
    "INSERT INTO memory_entries (tenant_id, kind, content, metadata, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, tenant_id, kind, content, metadata, status, created_at",
    [tenantId, kind, content, metadata, status]
  )

  const row = result.rows[0]

  return {
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    content: row.content,
    metadata: row.metadata ?? undefined,
    status: row.status as MemoryEntryStatus,
    createdAt: row.created_at
  }
}

export async function insertMemoryVector(
  tenantId: string,
  domain: string,
  entryId: number,
  embedding: number[],
  content: string
): Promise<void> {
  await pgQuery(
    "INSERT INTO memory_vectors (tenant_id, domain, entry_id, embedding, content) VALUES ($1, $2, $3, $4::vector, $5)",
    [tenantId, domain, entryId, toVectorLiteral(embedding), content]
  )
}

export interface VectorSearchResult {
  id: number
  entryId: number
  tenantId: string
  domain: string
  content: string
  distance: number
  createdAt: string
}

export async function searchMemoryVectors(
  tenantId: string,
  domain: string,
  queryEmbedding: number[],
  limit: number
): Promise<VectorSearchResult[]> {
  const literal = toVectorLiteral(queryEmbedding)

  const result = await pgQuery<{
    id: number
    entry_id: number
    tenant_id: string
    domain: string
    content: string
    distance: number
    created_at: string
  }>(
    "SELECT id, entry_id, tenant_id, domain, content, embedding <-> $3::vector AS distance, created_at FROM memory_vectors WHERE tenant_id = $1 AND domain = $2 ORDER BY embedding <-> $3::vector ASC LIMIT $4",
    [tenantId, domain, literal, limit]
  )

  return result.rows.map((row) => ({
    id: row.id,
    entryId: row.entry_id,
    tenantId: row.tenant_id,
    domain: row.domain,
    content: row.content,
    distance: row.distance,
    createdAt: row.created_at
  }))
}
