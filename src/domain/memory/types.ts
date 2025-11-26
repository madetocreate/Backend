import { TenantId, ConversationId, MessageId, DocumentId } from "../core/types";

export type MemoryItemType =
  | "business_profile"
  | "conversation_message"
  | "email"
  | "dm"
  | "review"
  | "document"
  | "custom";

export type MemoryWriteRequest = {
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  metadata?: Record<string, unknown>;
  sourceId?: string;
  conversationId?: ConversationId;
  messageId?: MessageId;
  documentId?: DocumentId;
  createdAt?: Date;
};

export type MemorySearchRequest = {
  tenantId: TenantId;
  type?: MemoryItemType;
  query: string;
  limit?: number;
};

export type MemorySearchResult = {
  id: string;
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  createdAt: Date;
  score?: number;
  metadata?: Record<string, unknown>;
  sourceId?: string;
};

export type LocalMemoryRecord = {
  id: string;
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  metadata?: Record<string, unknown>;
  sourceId?: string;
  conversationId?: ConversationId;
  messageId?: MessageId;
  documentId?: DocumentId;
  createdAt: Date;
};

export type VectorMemoryRecord = {
  id: string;
  tenantId: TenantId;
  type: MemoryItemType;
  content: string;
  metadata?: Record<string, unknown>;
  sourceId?: string;
};
