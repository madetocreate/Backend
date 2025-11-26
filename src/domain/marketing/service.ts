import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import {
  MarketingContentRequest,
  MarketingContentResponse,
  MarketingTexts,
  MarketingImagePlan,
  MarketingImageResult,
} from "./types";
import { generateImageForTenant } from "../content/service";

function buildFallbackTexts(input: MarketingContentRequest): MarketingTexts {
  return {
    primary: input.brief,
  };
}

function normalizeGoal(goal: string): string {
  if (goal === "social_post" || goal === "landingpage" || goal === "newsletter" || goal === "ad" || goal === "other") {
    return goal;
  }
  return "other";
}

export async function generateMarketingContent(input: MarketingContentRequest): Promise<MarketingContentResponse> {
  const channel = "agent_marketing";
  const now = new Date();
  const model = getSummaryModel();

  let texts: MarketingTexts = buildFallbackTexts(input);
  let imagePlans: MarketingImagePlan[] = [];

  try {
    const response = await openai.responses.create({
      model,
      instructions:
        "You are a marketing assistant for a small business. " +
        "You receive a goal, a brief and optional metadata and must respond with JSON for copy and optional image prompts. " +
        "Return ONLY minified JSON without markdown, comments or explanations. " +
        'Schema: {"texts": {"primary": string, "variants"?: string[], "headline"?: string, "subheadline"?: string, "callToAction"?: string, "hashtags"?: string[]}, "images"?: [{"useCase": string, "prompt": string, "stylePreset"?: "photo" | "illustration" | "icon" | "abstract" | "3d" | "isometric", "size"?: "1024x1024" | "1024x1536" | "1536x1024"}]}. ' +
        "Adapt tone, structure and call to action to the goal and channel.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                goal: input.goal,
                brief: input.brief,
                channel: input.channel,
                locale: input.locale,
                includeImages: input.includeImages,
                imageCount: input.imageCount,
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

      if (parsed && parsed.texts && typeof parsed.texts.primary === "string") {
        texts = {
          primary: parsed.texts.primary,
          variants: Array.isArray(parsed.texts.variants) ? parsed.texts.variants.filter((v: any) => typeof v === "string") : undefined,
          headline: typeof parsed.texts.headline === "string" ? parsed.texts.headline : undefined,
          subheadline: typeof parsed.texts.subheadline === "string" ? parsed.texts.subheadline : undefined,
          callToAction: typeof parsed.texts.callToAction === "string" ? parsed.texts.callToAction : undefined,
          hashtags: Array.isArray(parsed.texts.hashtags) ? parsed.texts.hashtags.filter((v: any) => typeof v === "string") : undefined,
        };
      }

      if (parsed && Array.isArray(parsed.images)) {
        imagePlans = parsed.images
          .map((img: any) => {
            if (!img || typeof img.prompt !== "string" || !img.prompt.trim()) {
              return null;
            }
            const plan: MarketingImagePlan = {
              useCase: typeof img.useCase === "string" && img.useCase.trim().length > 0 ? img.useCase : "marketing_asset",
              prompt: img.prompt,
            };
            if (
              img.stylePreset === "photo" ||
              img.stylePreset === "illustration" ||
              img.stylePreset === "icon" ||
              img.stylePreset === "abstract" ||
              img.stylePreset === "3d" ||
              img.stylePreset === "isometric"
            ) {
              plan.stylePreset = img.stylePreset;
            }
            if (img.size === "1024x1024" || img.size === "1024x1536" || img.size === "1536x1024") {
              plan.size = img.size;
            }
            return plan;
          })
          .filter((p: MarketingImagePlan | null): p is MarketingImagePlan => p !== null);
      }
    }
  } catch {
    texts = buildFallbackTexts(input);
  }

  const results: MarketingImageResult[] = [];
  const shouldGenerateImages = input.includeImages && (input.imageCount ?? 1) > 0;
  const maxImages = input.imageCount && input.imageCount > 0 ? input.imageCount : 1;

  if (shouldGenerateImages && imagePlans.length > 0) {
    const limitedPlans = imagePlans.slice(0, maxImages);
    for (const plan of limitedPlans) {
      const imageResponse = await generateImageForTenant({
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        prompt: plan.prompt,
        useCase: plan.useCase,
        stylePreset: plan.stylePreset,
        size: plan.size,
        n: 1,
        channel: "agent_marketing_image",
        metadata: {
          goal: normalizeGoal(input.goal),
          channel: input.channel,
          source: "marketing_agent",
        },
      } as any);

      results.push({
        plan,
        images: imageResponse.images,
      });
    }
  }

  const usageType: UsageEventType = "marketing_content" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/marketing/generate",
    timestamp: now,
    metadata: {
      goal: input.goal,
      channel,
      requestedImages: input.includeImages ? maxImages : 0,
      plannedImages: imagePlans.length,
      generatedImageSets: results.length,
    },
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    goal: input.goal,
    texts,
    images: results.length > 0 ? results : undefined,
  };
}
