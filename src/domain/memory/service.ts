import { MemoryWriteRequest, MemorySearchRequest, MemorySearchResult } from "./types";
import { shouldStoreLocally, shouldStoreInVector } from "./policy";
import { uploadMemoryToVectorStores } from "../vector/service";
import { createMemoryRecordFromWriteRequest, saveMemoryRecord, searchMemoryRecords } from "./repository";

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
    const record = createMemoryRecordFromWriteRequest(request, text, createdAt);
    saveMemoryRecord(record);
  }
}

export async function searchMemory(request: MemorySearchRequest): Promise<MemorySearchResult[]> {
  return searchMemoryRecords(request);
}
