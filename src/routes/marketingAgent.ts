import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateMarketingContent } from "../domain/marketing/service";

const MarketingBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  goal: z.enum(["social_post", "landingpage", "newsletter", "ad", "other"]),
  brief: z.string().min(1),
  channel: z.string().optional(),
  locale: z.string().optional(),
  includeImages: z.boolean().optional(),
  imageCount: z.number().int().min(1).max(4).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerMarketingAgentRoutes(app: FastifyInstance) {
  app.post("/agent/marketing/generate", async (request, reply) => {
    const parseResult = MarketingBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "invalid_request_body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await generateMarketingContent({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      goal: body.goal,
      brief: body.brief,
      channel: body.channel,
      locale: body.locale,
      includeImages: body.includeImages,
      imageCount: body.imageCount,
      metadata: body.metadata,
    });

    return result;
  });
}
