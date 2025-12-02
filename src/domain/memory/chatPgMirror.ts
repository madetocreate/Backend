import { mirrorMemoryToPostgres } from "../../infra/postgres/memoryMirror"

export async function mirrorChatMessageToPostgres(options: {
  tenantId: string
  role: "user" | "assistant" | "system"
  content: string
  sessionId?: string
  embedding?: number[]
}): Promise<void> {
  const { tenantId, role, content, sessionId, embedding } = options

  const metadata: Record<string, unknown> = {
    source: "chat",
    role
  }

  if (sessionId) {
    metadata.sessionId = sessionId
  }

  await mirrorMemoryToPostgres({
    tenantId,
    kind: "conversation",
    content,
    metadata,
    domain: "conversation",
    embedding
  })
}
