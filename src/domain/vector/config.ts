import { MemoryDomain, VectorStoreReference } from "./types";
import { TenantId } from "../core/types";

const vectorStoreMap = new Map<string, VectorStoreReference>();

export function getVectorStoreKey(tenantId: TenantId, domain: MemoryDomain) {
  return tenantId + ":" + domain;
}

export async function resolveVectorStore(params: { tenantId: TenantId; domain: MemoryDomain }): Promise<VectorStoreReference> {
  const key = getVectorStoreKey(params.tenantId, params.domain);
  const existing = vectorStoreMap.get(key);
  if (existing) return existing;
  throw new Error("VectorStore not initialized for tenant/domain");
}

export function setVectorStore(ref: VectorStoreReference) {
  const key = getVectorStoreKey(ref.tenantId, ref.domain);
  vectorStoreMap.set(key, ref);
}
