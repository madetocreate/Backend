import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleInboxRequest, handleReplyRequest } from "../domain/communications/service";

export function registerCommunicationsAgentRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  const inboxSchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    limit: z.number().int().min(1).max(100),
    types: z.array(z.string().min(1))
  });
  app.post("/agent/communications/inbox", async (request, reply) => {
    const parsed = inboxSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    return await handleInboxRequest(parsed.data);
  });
  const replySchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    messageType: z.string().min(1),
    original: z.record(z.any()),
    tone: z.string().optional(),
    variants: z.number().optional()
  });
  app.post("/agent/communications/reply", async (request, reply) => {
    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    return await handleReplyRequest(parsed.data);
  });
  done();
}
