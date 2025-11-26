import { TenantId } from "../../core/types";
import { ContentImage } from "../content/types";

export type MarketingGoal = "social_post" | "landingpage" | "newsletter" | "ad" | "other";

export type MarketingContentRequest = {
  tenantId: TenantId;
  sessionId: string;
  goal: MarketingGoal;
  brief: string;
  channel?: string;
  locale?: string;
  includeImages?: boolean;
  imageCount?: number;
  metadata?: Record<string, unknown>;
};

export type MarketingTexts = {
  primary: string;
  variants?: string[];
  headline?: string;
  subheadline?: string;
  callToAction?: string;
  hashtags?: string[];
};

export type MarketingImagePlan = {
  useCase: string;
  prompt: string;
  stylePreset?: "photo" | "illustration" | "icon" | "abstract" | "3d" | "isometric";
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type MarketingImageResult = {
  plan: MarketingImagePlan;
  images: ContentImage[];
};

export type MarketingContentResponse = {
  tenantId: TenantId;
  sessionId: string;
  channel: string;
  goal: MarketingGoal;
  texts: MarketingTexts;
  images?: MarketingImageResult[];
};
