import { TenantId } from "../core/types";

export type ContentImageRequest = {
  tenantId: TenantId;
  sessionId: string;
  prompt: string;
  useCase?: string;
  stylePreset?: "photo" | "illustration" | "icon" | "abstract" | "3d" | "isometric";
  locale?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  quality?: "low" | "medium" | "high";
  n?: number;
  channel?: string;
  metadata?: Record<string, unknown>;
};

export type ContentImage = {
  id: string;
  mimeType: string;
  size: "1024x1024" | "1024x1536" | "1536x1024";
  prompt: string;
  altText?: string;
  useCase?: string;
  stylePreset?: string;
  b64: string;
  createdAt: string;
};

export type ContentImageResponse = {
  tenantId: TenantId;
  sessionId: string;
  channel: string;
  images: ContentImage[];
};
