import type { TenantId } from "../core/types";

export type MemoryItemType =
  | "business_profile"
  | "conversation_message"
  | "conversation_summary"
  | "email"
  | "dm"
  | "review"
  | "document"
  | "custom";

export type MemoryStatus = "active" | "archived" | "deleted" | "suppressed";

export type MemoryImportance = "low" | "normal" | "high" | "pinned";

export type MemoryOrigin =
  | "user"
  | "agent"
  | "ingest_email"
  | "ingest_dm"
  | "ingest_review"
  | "ingest_audio"
  | "system"
  | "other";

export type MemoryScope = "tenant" | "team" | "user" | "session";

export type MemoryMetadata = {
  status?: MemoryStatus;
  importance?: MemoryImportance;
  origin?: MemoryOrigin;
  scope?: MemoryScope;
  projectId?: string;
  ttlSeconds?: number;
  expiresAt?: string;
  flags?: string[];
  memoryMode?: "full" | "off" | "ephemeral";
  [key: string]: unknown;
};

export type MemoryWriteRequest = {
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  metadata?: MemoryMetadata;
  sourceId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  documentId?: string | null;
  createdAt?: Date;
};

export type LocalMemoryRecord = {
  id: string;
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  metadata?: MemoryMetadata;
  sourceId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  documentId?: string | null;
  createdAt: Date;
};

export type MemorySearchRequest = {
  tenantId: TenantId;
  type?: MemoryItemType | null;
  query: string;
  limit?: number;
};

export type MemorySearchResult = {
  id: string;
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  metadata?: MemoryMetadata;
  sourceId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  documentId?: string | null;
  createdAt: Date;
  score?: number;
};
