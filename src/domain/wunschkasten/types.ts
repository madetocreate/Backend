import { TenantId, Channel } from "../core/types";

export type WunschTrack = "marketing" | "automation" | "fun" | "custom";

export type AudienceType = "business" | "private" | "mixed";

export type WunschkastenSessionState = {
  tenantId: TenantId;
  sessionId: string;
  track?: WunschTrack;
  audience?: AudienceType;
  goals?: string[];
  platforms?: string[];
  metadata?: Record<string, unknown>;
};

export type WunschkastenStepActionKind = "message" | "pill" | "card";

export type WunschkastenStepInput = {
  tenantId: TenantId;
  sessionId: string;
  channel: Channel;
  action: WunschkastenStepActionKind;
  message?: string;
  selectedPillId?: string;
  selectedCardId?: string;
  state?: WunschkastenSessionState;
  metadata?: Record<string, unknown>;
};

export type SuggestionPill = {
  id: string;
  label: string;
  intent?: string;
  source: "static" | "dynamic";
};

export type SuggestionCard = {
  id: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  track?: WunschTrack;
};

export type OfferPreview = {
  id: string;
  title: string;
  description: string;
  priceHint?: string;
  deliveryTimeHint?: string;
  tier?: string;
  metadata?: Record<string, unknown>;
};

export type AutomationTriggerType = string;

export type AutomationTrigger = {
  type: AutomationTriggerType;
  source?: string;
  event?: string;
  schedule?: {
    cron?: string;
    frequency?: string;
    timeOfDay?: string;
  };
  conditions?: string[];
};

export type AutomationActionChannel = string;

export type AutomationAction = {
  id: string;
  kind: string;
  channel?: AutomationActionChannel;
  description: string;
  requiresHumanReview?: boolean;
  metadata?: Record<string, unknown>;
};

export type AutomationBlueprintComplexity = string;

export type AutomationBlueprint = {
  id: string;
  name: string;
  description: string;
  audience?: AudienceType;
  track?: WunschTrack;
  goals?: string[];
  platforms?: string[];
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  estimatedComplexity?: AutomationBlueprintComplexity;
  estimatedSystems?: string[];
  notes?: string[];
  metadata?: Record<string, unknown>;
};

export type WunschkastenStepResponse = {
  tenantId: TenantId;
  sessionId: string;
  channel: Channel;
  message: string;
  state: WunschkastenSessionState;
  pills: SuggestionPill[];
  cards: SuggestionCard[];
  offers?: OfferPreview[];
  blueprint?: AutomationBlueprint;
  researchSummary?: string;
  analysisSummary?: string;
};

export type WunschOrderStatus = "requested" | "in_progress" | "live" | "cancelled";

export type WunschOrderId = string;

export type WunschOrder = {
  id: WunschOrderId;
  tenantId: TenantId;
  sessionId: string;
  audience?: AudienceType;
  track?: WunschTrack;
  offerId: string;
  offerTitle: string;
  offerDescription: string;
  priceHint?: string;
  deliveryTimeHint?: string;
  tier?: string;
  blueprintSummary?: string;
  blueprint?: AutomationBlueprint;
  researchSummary?: string;
  analysisSummary?: string;
  stateSnapshot?: WunschkastenSessionState;
  status: WunschOrderStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export type CreateWunschOrderInput = {
  tenantId: TenantId;
  sessionId: string;
  audience?: AudienceType;
  track?: WunschTrack;
  offer: OfferPreview;
  blueprintSummary?: string;
  stateSnapshot?: WunschkastenSessionState;
  blueprint?: AutomationBlueprint;
  metadata?: Record<string, unknown>;
};

export type CreateBlueprintInput = {
  tenantId: TenantId;
  sessionId: string;
  channel: Channel;
  idea?: string;
  state?: WunschkastenSessionState;
};

export type CreateBlueprintResult = {
  tenantId: TenantId;
  sessionId: string;
  channel: Channel;
  blueprint: AutomationBlueprint;
  researchSummary?: string;
  analysisSummary?: string;
};
