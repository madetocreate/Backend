import { MemoryWriteRequest } from "./types";
import { uploadTextToVectorStore } from "../vector/service";

export async function writeMemory(request: MemoryWriteRequest) {
  const text = typeof request.content === "string"
    ? request.content
    : String(request.content ?? "");

  await uploadTextToVectorStore(request.tenantId, text);
}

export async function searchMemory() {
  return [];
}
