import { openai } from "../../integrations/openai/client";
import { toFile } from "openai/uploads";
import { MemoryWriteRequest, MemoryItemType } from "../memory/types";
import { MemoryDomain } from "./types";

const storeCache: Record<string, string> = {};
const domainStoreCache: Record<string, string> = {};

function mapMemoryTypeToDomain(type: MemoryItemType): MemoryDomain {
  if (type === "business_profile") {
    return "business_profile";
  }
  if (type === "document") {
    return "documents";
  }
  if (type === "email") {
    return "emails";
  }
  if (type === "dm" || type === "custom" || type === "conversation_message") {
    return "social_posts";
  }
  if (type === "review") {
    return "reviews";
  }
  return "documents";
}

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

export async function getDomainVectorStoreId(tenantId: string, domain: MemoryDomain) {
  const key = tenantId + ":" + domain;
  const cached = domainStoreCache[key];
  if (cached) {
    return cached;
  }
  const store = await openai.vectorStores.create({
    name: `aklow-${tenantId}-${domain}`
  });
  domainStoreCache[key] = store.id;
  return store.id;
}

export async function uploadTextToVectorStore(tenantId: string, text: string) {
  const storeId = await getVectorStoreId(tenantId);
  const file = await toFile(Buffer.from(text, "utf-8"), "memory.txt", { type: "text/plain" });
  const result = await openai.vectorStores.files.upload(storeId, file);
  return result;
}

export async function uploadMemoryToVectorStores(request: MemoryWriteRequest, text: string) {
  const globalStoreId = await getVectorStoreId(request.tenantId);
  const globalFile = await toFile(Buffer.from(text, "utf-8"), "memory.txt", { type: "text/plain" });
  await openai.vectorStores.files.upload(globalStoreId, globalFile);
  const domain = mapMemoryTypeToDomain(request.type);
  const domainStoreId = await getDomainVectorStoreId(request.tenantId, domain);
  const domainFile = await toFile(Buffer.from(text, "utf-8"), "memory.txt", { type: "text/plain" });
  await openai.vectorStores.files.upload(domainStoreId, domainFile);
}

export async function uploadDocumentFileToVectorStores(
  tenantId: string,
  buffer: Buffer,
  fileName: string,
  fileType: string
) {
  const globalStoreId = await getVectorStoreId(tenantId);
  const globalFileForUpload = await toFile(buffer, fileName, { type: fileType });
  const globalFile = await openai.vectorStores.files.upload(globalStoreId, globalFileForUpload);
  const domainStoreId = await getDomainVectorStoreId(tenantId, "documents");
  const domainFileForUpload = await toFile(buffer, fileName, { type: fileType });
  const domainFile = await openai.vectorStores.files.upload(domainStoreId, domainFileForUpload);
  return {
    globalStoreId,
    documentStoreId: domainStoreId,
    globalFileId: globalFile.id,
    documentFileId: domainFile.id
  };
}
