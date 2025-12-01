import { TenantId } from "../core/types";

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "x"
  | "other";

export type SocialGoal = "brand" | "launch" | "evergreen" | "promo" | "other";

export type SocialSchedulePost = {
  id: string;
  date: string;
  time: string;
  platform: SocialPlatform;
  theme?: string;
  captionIdea?: string;
  imageUseCase?: string;
};

export type SocialSchedulePlan = {
  posts: SocialSchedulePost[];
  notes?: string;
};

export type SocialScheduleRequest = {
  tenantId: TenantId;
  sessionId: string;
  goal: SocialGoal;
  brief: string;
  platforms: SocialPlatform[];
  startDate: string;
  endDate: string;
  postsPerWeek?: number;
  timezone?: string;
  includeCaptionIdeas?: boolean;
  metadata?: Record<string, unknown>;
};

export type SocialScheduleResponse = {
  tenantId: TenantId;
  sessionId: string;
  channel: string;
  plan: SocialSchedulePlan;
};
