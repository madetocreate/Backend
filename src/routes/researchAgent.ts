import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleResearchQuery } from "../domain/research/service";

const ResearchScopeEnum = z.enum(["general", "market", "competitors", "tech", "custom"]);

const ResearchBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  question: z.string().min(1),
  scope: ResearchScopeEnum.optional(),
  maxSources: z.number().int().min(1).max(20).optional(),
  channel: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerResearchAgentRoutes(app: FastifyInstance) {
  app.post("/agent/research/query", async (request, reply) => {
    const parseResult = ResearchBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "invalid_request_body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await handleResearchQuery({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      question: body.question,
      scope: body.scope,
      maxSources: body.maxSources,
      channel: body.channel,
      metadata: body.metadata,
    });

    return result;
  });
}
