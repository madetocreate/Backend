import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateImageForTenant } from "../domain/content/service";

const ContentImageBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  useCase: z.string().optional(),
  stylePreset: z.enum(["photo", "illustration", "icon", "abstract", "3d", "isometric"]).optional(),
  locale: z.string().optional(),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional(),
  quality: z.enum(["low", "medium", "high"]).optional(),
  n: z.number().int().min(1).max(4).optional(),
  channel: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerContentAgentRoutes(app: FastifyInstance) {
  app.post("/agent/content/image", async (request, reply) => {
    const parseResult = ContentImageBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "invalid_request_body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await generateImageForTenant({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      prompt: body.prompt,
      useCase: body.useCase,
      stylePreset: body.stylePreset,
      locale: body.locale,
      size: body.size,
      quality: body.quality,
      n: body.n,
      channel: body.channel,
      metadata: body.metadata,
    });

    return result;
  });
}
