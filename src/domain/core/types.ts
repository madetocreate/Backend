export type TenantId = string;
export type UserId = string;
export type ConversationId = string;
export type MessageId = string;
export type DocumentId = string;

export type Channel =
  | "app"
  | "website"
  | "gmail"
  | "outlook"
  | "instagram_dm"
  | "facebook_messenger"
  | "telegram"
  | string;

export type UserRole = "admin" | "member";

export type Tenant = {
  id: TenantId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: UserId;
  tenantId: TenantId;
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Conversation = {
  id: ConversationId;
  tenantId: TenantId;
  sessionId: string;
  channel: Channel;
  subject?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type Message = {
  id: MessageId;
  conversationId: ConversationId;
  tenantId: TenantId;
  role: MessageRole;
  channel: Channel;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type DocumentSource =
  | "upload"
  | "email"
  | "dm"
  | "review"
  | "other";

export type Document = {
  id: DocumentId;
  tenantId: TenantId;
  title: string;
  source: DocumentSource;
  mimeType?: string;
  openaiFileId?: string;
  vectorStoreId?: string;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
};
