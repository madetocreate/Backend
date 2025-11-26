import { openai } from "../../integrations/openai/client";
import { toFile } from "openai/uploads";

const storeCache: Record<string, string> = {};

export async function getVectorStoreId(tenantId: string) {
  if (storeCache[tenantId]) return storeCache[tenantId];
  return await ensureVectorStore(tenantId);
}

export async function ensureVectorStore(tenantId: string) {
  const store = await openai.vectorStores.create({
    name: `aklow-${tenantId}`
  });
  storeCache[tenantId] = store.id;
  return store.id;
}

export async function uploadTextToVectorStore(tenantId: string, text: string) {
  const storeId = await getVectorStoreId(tenantId);
  const file = await toFile(Buffer.from(text, "utf-8"), "memory.txt", { type: "text/plain" });
  const result = await openai.vectorStores.files.upload(storeId, file);
  return result;
}
