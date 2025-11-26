import { randomUUID } from "crypto";
import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import {
  SocialScheduleRequest,
  SocialScheduleResponse,
  SocialSchedulePlan,
  SocialSchedulePost,
} from "./types";

export async function generateSocialSchedule(input: SocialScheduleRequest): Promise<SocialScheduleResponse> {
  const channel = "agent_social";
  const now = new Date();
  const model = getSummaryModel();

  let plan: SocialSchedulePlan = {
    posts: [],
    notes: "Keine detaillierte Planung möglich, Rohdaten wurden als Fallback verwendet.",
  };

  try {
    const response = await openai.responses.create({
      model,
      instructions:
        "You are a social media scheduler for a small business. " +
        "You receive a goal, brief, platforms, date range and desired posts per week. " +
        "Return ONLY minified JSON without markdown, comments or explanations. " +
        'Schema: {"plan": {"posts": [{"date": string, "time": string, "platform": string, "theme"?: string, "captionIdea"?: string, "imageUseCase"?: string}], "notes"?: string}}. ' +
        "Distribute posts evenly across the date range, respect the requested platforms, and adapt themes to the goal and brief. " +
        "If includeCaptionIdeas is true, add short caption ideas per post.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                goal: input.goal,
                brief: input.brief,
                platforms: input.platforms,
                startDate: input.startDate,
                endDate: input.endDate,
                postsPerWeek: input.postsPerWeek,
                timezone: input.timezone,
                includeCaptionIdeas: input.includeCaptionIdeas,
                metadata: input.metadata,
              }),
            },
          ],
        },
      ],
    } as any);

    const text = (response as any).output_text as string | undefined;

    if (text) {
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (parsed && parsed.plan && Array.isArray(parsed.plan.posts)) {
        const posts: SocialSchedulePost[] = parsed.plan.posts.map((p: any, index: number) => {
          const date = typeof p.date === "string" ? p.date : "";
          const time = typeof p.time === "string" ? p.time : "09:00";
          const platform =
            typeof p.platform === "string" && p.platform
              ? p.platform
              : input.platforms[0] ?? "other";

          const post: SocialSchedulePost = {
            id: typeof p.id === "string" && p.id.length > 0 ? p.id : randomUUID() + "-" + index,
            date,
            time,
            platform: platform as any,
            theme: typeof p.theme === "string" ? p.theme : undefined,
            captionIdea:
              typeof p.captionIdea === "string" && input.includeCaptionIdeas
                ? p.captionIdea
                : undefined,
            imageUseCase:
              typeof p.imageUseCase === "string" ? p.imageUseCase : undefined,
          };

          return post;
        });

        plan = {
          posts,
          notes: typeof parsed.plan.notes === "string" ? parsed.plan.notes : undefined,
        };
      }
    }
  } catch {
    plan = {
      posts: [],
      notes:
        "Die automatische Planung ist fehlgeschlagen. Bitte versuche es später erneut oder passe deine Anfrage an.",
    };
  }

  const usageType: UsageEventType = "social_schedule" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/social/schedule",
    timestamp: now,
    metadata: {
      goal: input.goal,
      platforms: input.platforms,
      startDate: input.startDate,
      endDate: input.endDate,
      postsPerWeek: input.postsPerWeek,
      timezone: input.timezone,
      includeCaptionIdeas: input.includeCaptionIdeas,
    },
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    plan,
  };
}
