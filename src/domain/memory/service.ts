import {
  MemoryWriteRequest,
  MemorySearchRequest,
  MemorySearchResult,
  LocalMemoryRecord,
  MemoryItemType,
  MemoryStatus
} from "./types";
import { shouldStoreLocally, shouldStoreInVector } from "./policy";
import {
  createMemoryRecordFromWriteRequest,
  saveMemoryRecord,
  searchMemoryRecords,
  getConversationMemoryRecords,
  updateMemoryStatus
} from "./repository";
import { indexMemoryForTenant } from "../vectorLocal/service";
import { updateVectorStatusForMemory } from "../vectorLocal/repository";

export async function writeMemory(
  request: MemoryWriteRequest
): Promise<LocalMemoryRecord | null> {
  const createdAt = request.createdAt ?? new Date();
  const metadata = request.metadata ?? {};

  const mode = (metadata as any).memoryMode;
  if (mode === "off" || mode === "ephemeral") {
    return null;
  }

  let record: LocalMemoryRecord | null = null;

  if (shouldStoreLocally(request.type)) {
    record = createMemoryRecordFromWriteRequest(
      { ...request, metadata },
      request.content,
      createdAt
    );
    saveMemoryRecord(record);
  }

  if (shouldStoreInVector(request.type, metadata)) {
    try {
      if (record) {
        await indexMemoryForTenant(record);
      } else {
        const temp = createMemoryRecordFromWriteRequest(
          { ...request, metadata },
          request.content,
          createdAt
        );
        await indexMemoryForTenant(temp);
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          type: "vector_index_error",
          tenantId: request.tenantId,
          memoryType: request.type,
          error: (error as any)?.message ?? "unknown_error"
        })
      );
    }
  }

  return record;
}

export async function searchMemory(
  request: MemorySearchRequest
): Promise<MemorySearchResult[]> {
  return searchMemoryRecords(request);
}

export async function getConversationMemory(params: {
  tenantId: string;
  conversationId: string;
  limit?: number;
  types?: MemoryItemType[];
}): Promise<LocalMemoryRecord[]> {
  return getConversationMemoryRecords(params);
}

export async function setMemoryStatus(params: {
  tenantId: string;
  id: string;
  status: MemoryStatus;
}): Promise<boolean> {
  const ok = updateMemoryStatus(params.tenantId, params.id, params.status);
  if (!ok) {
    return false;
  }
  try {
    updateVectorStatusForMemory(params.tenantId, params.id, params.status);
  } catch {
  }
  return true;
}
