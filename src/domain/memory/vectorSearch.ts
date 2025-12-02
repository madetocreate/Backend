import { searchMemoryVectors } from "../../infra/postgres/memoryStore"

export interface PgVectorSearchOptions {
  tenantId: string
  domain: string
  queryEmbedding: number[]
  limit?: number
  maxDistance?: number
}

export interface PgVectorSearchItem {
  id: number
  entryId: number
  tenantId: string
  domain: string
  content: string
  distance: number
  createdAt: string
}

export async function searchPgVectors(options: PgVectorSearchOptions): Promise<PgVectorSearchItem[]> {
  const { tenantId, domain, queryEmbedding, limit = 8, maxDistance } = options

  const results = await searchMemoryVectors(tenantId, domain, queryEmbedding, limit)

  if (typeof maxDistance === "number") {
    return results.filter((r) => r.distance <= maxDistance)
  }

  return results
}

export async function searchPgConversationContext(options: {
  tenantId: string
  queryEmbedding: number[]
  limit?: number
  maxDistance?: number
}): Promise<PgVectorSearchItem[]> {
  return searchPgVectors({
    tenantId: options.tenantId,
    domain: "conversation",
    queryEmbedding: options.queryEmbedding,
    limit: options.limit,
    maxDistance: options.maxDistance
  })
}

export async function searchPgDocumentContext(options: {
  tenantId: string
  queryEmbedding: number[]
  limit?: number
  maxDistance?: number
}): Promise<PgVectorSearchItem[]> {
  return searchPgVectors({
    tenantId: options.tenantId,
    domain: "document",
    queryEmbedding: options.queryEmbedding,
    limit: options.limit,
    maxDistance: options.maxDistance
  })
}

export async function searchPgReviewContext(options: {
  tenantId: string
  queryEmbedding: number[]
  limit?: number
  maxDistance?: number
}): Promise<PgVectorSearchItem[]> {
  return searchPgVectors({
    tenantId: options.tenantId,
    domain: "review",
    queryEmbedding: options.queryEmbedding,
    limit: options.limit,
    maxDistance: options.maxDistance
  })
}
