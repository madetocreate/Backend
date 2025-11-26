import { TenantId } from "../core/types";
import { MemoryDomain, VectorStoreReference } from "./types";

export type ResolveVectorStoreParams = {
  tenantId: TenantId;
  domain: MemoryDomain;
};

export type ResolveVectorStoreResult = VectorStoreReference;

export async function resolveVectorStore(
  _params: ResolveVectorStoreParams
): Promise<ResolveVectorStoreResult> {
  throw new Error(
    "resolveVectorStore is not implemented yet. It will return the OpenAI Vector Store ID for the given tenant and domain."
  );
}
