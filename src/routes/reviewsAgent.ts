import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleReviewsInbox, handleReviewReply } from "../domain/reviews/service";

export function registerReviewsAgentRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  const inboxSchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
    minRating: z.number().min(1).max(5).optional(),
    maxRating: z.number().min(1).max(5).optional()
  });
  app.post("/agent/reviews/inbox", async (request, reply) => {
    const parsed = inboxSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const result = await handleReviewsInbox(parsed.data);
    return result;
  });

  const replySchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    review: z.record(z.any()),
    tone: z.string().optional(),
    variants: z.number().int().min(1).max(5).optional()
  });
  app.post("/agent/reviews/reply", async (request, reply) => {
    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const result = await handleReviewReply(parsed.data);
    return result;
  });

  done();
}
