import { TenantId } from "../../core/types";

export type ResearchScope = "general" | "market" | "competitors" | "tech" | "custom";

export type ResearchSourceKind = "web" | "internal";

export type ResearchSource = {
  id: string;
  title: string;
  url?: string;
  kind: ResearchSourceKind;
  snippet?: string;
};

export type ResearchRequest = {
  tenantId: TenantId;
  sessionId: string;
  question: string;
  scope?: ResearchScope;
  maxSources?: number;
  channel?: string;
  metadata?: Record<string, unknown>;
};

export type ResearchResponse = {
  tenantId: TenantId;
  sessionId: string;
  channel: string;
  answer: string;
  sources: ResearchSource[];
};
