import type { TenantId } from "../core/types";

export type ShoppingItemPriority = "low" | "normal" | "high";

export type ShoppingItemSource =
  | "user"
  | "assistant"
  | "pantry"
  | "recipe"
  | "other";

export type ShoppingItem = {
  id: string;
  name: string;
  normalizedName?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  priority?: ShoppingItemPriority;
  tags?: string[];
  source?: ShoppingItemSource;
};

export type ShoppingJobType =
  | "weekly_shop"
  | "restock"
  | "recipe_based"
  | "ad_hoc";

export type ShoppingProviderPreference =
  | "list_only"
  | "aggregator"
  | "local_store"
  | "unknown";

export type ShoppingProviderKey =
  | "list_only"
  | "online_search"
  | "custom";

export type ShoppingRequest = {
  tenantId: TenantId;
  sessionId: string;
  message: string;
  language?: string;
  countryCode?: string | null;
  preferredStore?: string | null;
  metadata?: Record<string, unknown>;
};

export type ShoppingJob = {
  tenantId: TenantId;
  sessionId: string;
  jobType: ShoppingJobType;
  items: ShoppingItem[];
  providerPreference: ShoppingProviderPreference;
  providerKey?: ShoppingProviderKey;
  providerLabel?: string;
  notes?: string;
  priceSummary?: string;
  rawPlan?: unknown;
};

export type ShoppingResponse = {
  tenantId: TenantId;
  sessionId: string;
  content: string;
  job: ShoppingJob;
};
