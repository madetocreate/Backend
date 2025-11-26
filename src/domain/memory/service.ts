import { randomUUID } from "crypto";
import { MemoryWriteRequest, MemorySearchRequest, MemorySearchResult, LocalMemoryRecord } from "./types";
import { shouldStoreLocally, shouldStoreInVector } from "./policy";
import { uploadMemoryToVectorStores } from "../vector/service";

const localMemory: LocalMemoryRecord[] = [];

export async function writeMemory(request: MemoryWriteRequest) {
  const text =
    typeof request.content === "string"
      ? request.content
      : String(request.content ?? "");

  const createdAt = request.createdAt ?? new Date();

  if (shouldStoreInVector(request.type)) {
    await uploadMemoryToVectorStores(request, text);
  }

  if (shouldStoreLocally(request.type)) {
    const record: LocalMemoryRecord = {
      id: randomUUID(),
      tenantId: request.tenantId,
      type: request.type,
      content: text,
      metadata: request.metadata,
      sourceId: request.sourceId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      documentId: request.documentId,
      createdAt
    };
    localMemory.push(record);
  }
}

export async function searchMemory(request: MemorySearchRequest): Promise<MemorySearchResult[]> {
  const { tenantId, type, query, limit = 20 } = request;
  const q = query.toLowerCase();
  const results: MemorySearchResult[] = [];

  for (const record of localMemory) {
    if (record.tenantId !== tenantId) {
      continue;
    }
    if (type && record.type !== type) {
      continue;
    }
    if (!record.content.toLowerCase().includes(q)) {
      continue;
    }
    results.push({
      id: record.id,
      tenantId: record.tenantId,
      type: record.type,
      content: record.content,
      metadata: record.metadata,
      sourceId: record.sourceId,
      score: undefined
    });
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
