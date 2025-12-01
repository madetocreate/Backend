import type { TenantId } from "../core/types";

export type VectorDomain =
  | "business_profile"
  | "documents"
  | "emails"
  | "reviews"
  | "social_posts"
  | "conversation"
  | "generic";

export interface VectorRecord {
  id: string;
  tenantId: TenantId;
  domain: VectorDomain;
  sourceType: "memory" | "file";
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface VectorSearchResult extends VectorRecord {
  score: number;
}
