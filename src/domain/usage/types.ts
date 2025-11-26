import { TenantId, UserId } from "../core/types";

export type UsageEventType =
  | "chat_request"
  | "chat_stream"
  | "ingest_email"
  | "ingest_dm"
  | "ingest_review";

export type UsageEvent = {
  tenantId: TenantId;
  userId?: UserId;
  type: UsageEventType;
  route: string;
  timestamp: Date;
  tokensIn?: number;
  tokensOut?: number;
  metadata?: Record<string, unknown>;
};
