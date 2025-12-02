import { FastifyInstance } from "fastify";
import { z } from "zod";
import { runCriticalReview } from "../domain/orchestrator/reviewer";

export function registerReviewerAgentRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: () => void
) {
  const bodySchema = z.object({
    tenantId: z.string(),
    sessionId: z.string(),
    question: z.string().min(1),
    answer: z.string().nullable().optional(),
    metadata: z.record(z.any()).optional()
  });

  app.post("/agent/reviewer/critical", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const input = parsed.data;

    const result = await runCriticalReview({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      question: input.question,
      answer: input.answer ?? null,
      metadata: input.metadata
    });

    return result;
  });

  done();
}
