import { randomUUID } from "crypto";
import type {
  ShoppingJob,
  ShoppingJobType,
  ShoppingProviderPreference,
  ShoppingProviderKey
} from "./types";

export type ShoppingAutomationItem = {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
};

export type ShoppingAutomationPayload = {
  id: string;
  tenantId: string;
  sessionId: string;
  jobType: ShoppingJobType;
  providerPreference: ShoppingProviderPreference;
  providerKey?: ShoppingProviderKey;
  countryCode?: string | null;
  items: ShoppingAutomationItem[];
};

export function buildShoppingAutomationPayload(params: {
  job: ShoppingJob;
  countryCode?: string | null;
}): ShoppingAutomationPayload {
  const items: ShoppingAutomationItem[] = params.job.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    notes: item.notes,
    category: item.category
  }));

  return {
    id: randomUUID(),
    tenantId: params.job.tenantId,
    sessionId: params.job.sessionId,
    jobType: params.job.jobType,
    providerPreference: params.job.providerPreference,
    providerKey: params.job.providerKey,
    countryCode: params.countryCode ?? null,
    items
  };
}
