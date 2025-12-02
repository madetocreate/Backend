import { insertMemoryEntry, insertMemoryVector } from "./memoryStore"

type MirrorKind = "conversation" | "document" | "review" | "email" | "note" | "other"

export async function mirrorMemoryToPostgres(options: {
  tenantId: string
  kind: MirrorKind
  content: string
  metadata?: Record<string, unknown> | null
  domain?: string
  embedding?: number[]
}): Promise<void> {
  const { tenantId, kind, content, metadata = null, domain, embedding } = options

  try {
    const entry = await insertMemoryEntry(tenantId, kind, content, metadata, "active")

    if (domain && embedding && embedding.length > 0) {
      await insertMemoryVector(tenantId, domain, entry.id, content, embedding)
    }
  } catch (error) {
    console.error("mirrorMemoryToPostgres error", error)
  }
}
