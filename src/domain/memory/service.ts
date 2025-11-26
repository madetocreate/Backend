import { MemorySearchRequest, MemorySearchResult, MemoryWriteRequest } from "./types";

export async function writeMemory(_request: MemoryWriteRequest): Promise<void> {
  return;
}

export async function searchMemory(_request: MemorySearchRequest): Promise<MemorySearchResult[]> {
  return [];
}
