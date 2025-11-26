import { TenantId } from "../core/types";

export type MemoryDomain =
  | "business_profile"
  | "documents"
  | "emails"
  | "reviews"
  | "social_posts";

export type VectorStoreReference = {
  tenantId: TenantId;
  domain: MemoryDomain;
  vectorStoreId: string;
};
