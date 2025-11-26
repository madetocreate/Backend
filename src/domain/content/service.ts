import { randomUUID } from "crypto";
import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { ContentImageRequest, ContentImageResponse, ContentImage } from "./types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";

type ImageSpec = {
  prompt: string;
  size: "1024x1024" | "1024x1536" | "1536x1024";
  quality: "low" | "medium" | "high";
  n: number;
  altText?: string;
  useCase?: string;
  stylePreset?: string;
};

type ImageExtras = {
  useCase?: string;
  stylePreset?: string;
  locale?: string;
};

function normalizeSize(value: unknown, fallback: ImageSpec["size"]): ImageSpec["size"] {
  if (value === "1024x1024" || value === "1024x1536" || value === "1536x1024") {
    return value;
  }
  return fallback;
}

function normalizeQuality(value: unknown, fallback: ImageSpec["quality"]): ImageSpec["quality"] {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return fallback;
}

function normalizeCount(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4) {
    return value;
  }
  return fallback;
}

async function buildImageSpec(input: ContentImageRequest, extras: ImageExtras): Promise<ImageSpec> {
  const fallback: ImageSpec = {
    prompt: input.prompt,
    size: input.size ?? "1024x1024",
    quality: input.quality ?? "high",
    n: input.n ?? 1,
    useCase: extras.useCase,
    stylePreset: extras.stylePreset,
  };

  try {
    const model = getSummaryModel();
    const response = await openai.responses.create({
      model,
      instructions:
        "You are an assistant that converts high-level image requests into a strict JSON spec for the image generation API. " +
        "Return ONLY minified JSON without markdown, comments or explanations. " +
        'Schema: {"prompt": string, "size": "1024x1024" | "1024x1536" | "1536x1024", "quality": "low" | "medium" | "high", "n": number, "altText"?: string}. ' +
        "Use the provided useCase and stylePreset to adapt style and composition. " +
        "Prompt should be clear, detailed and suitable for a professional product/marketing image.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                prompt: input.prompt,
                useCase: extras.useCase,
                stylePreset: extras.stylePreset,
                locale: extras.locale,
                size: input.size,
                quality: input.quality,
                n: input.n,
                metadata: input.metadata,
              }),
            },
          ],
        },
      ],
    } as any);

    const text = (response as any).output_text as string | undefined;
    if (!text) {
      return fallback;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fallback;
    }

    const size = normalizeSize(parsed.size, fallback.size);
    const quality = normalizeQuality(parsed.quality, fallback.quality);
    const n = normalizeCount(parsed.n, fallback.n);
    const prompt = typeof parsed.prompt === "string" && parsed.prompt.trim().length > 0 ? parsed.prompt : fallback.prompt;
    const altText = typeof parsed.altText === "string" && parsed.altText.trim().length > 0 ? parsed.altText : undefined;

    return {
      prompt,
      size,
      quality,
      n,
      altText,
      useCase: fallback.useCase,
      stylePreset: fallback.stylePreset,
    };
  } catch {
    return fallback;
  }
}

export async function generateImageForTenant(input: ContentImageRequest): Promise<ContentImageResponse> {
  const channel = input.channel ?? "agent_content_image";
  const now = new Date();

  const extras: ImageExtras = {
    useCase: (input as any).useCase as string | undefined,
    stylePreset: (input as any).stylePreset as string | undefined,
    locale: (input as any).locale as string | undefined,
  };

  const spec = await buildImageSpec(input, extras);

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: spec.prompt,
    n: spec.n,
    size: spec.size,
    quality: spec.quality,
    response_format: "b64_json",
  });

  const imagesRaw: (ContentImage | null)[] = (result.data ?? []).map((item) => {
    const anyItem = item as any;
    const b64 = anyItem.b64_json as string | undefined;
    if (!b64) {
      return null;
    }
    const image: ContentImage = {
      id: anyItem.id ?? randomUUID(),
      mimeType: "image/png",
      size: spec.size,
      prompt: spec.prompt,
      altText: spec.altText ?? spec.prompt,
      useCase: spec.useCase,
      stylePreset: spec.stylePreset,
      b64,
      createdAt: now.toISOString(),
    };
    return image;
  });

  const images: ContentImage[] = imagesRaw.filter((x): x is ContentImage => x !== null);

  const usageType: UsageEventType = "image_generation" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/content/image",
    timestamp: now,
    metadata: {
      size: spec.size,
      quality: spec.quality,
      n: spec.n,
      images: images.length,
      channel,
      useCase: extras.useCase,
      stylePreset: extras.stylePreset,
      hasMetadata: Boolean(input.metadata),
    },
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    images,
  };
}
