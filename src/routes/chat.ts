import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { createResponse } from "../domain/orchestrator/service";

type ChatRequest = FastifyRequest<{ Body: ChatRequestBody }>;

export async function registerChatRoutes(app: FastifyInstance) {
  app.post("/chat", async (request: ChatRequest, reply: FastifyReply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const result = await createResponse(parsed.data);
    return result;
  });
}
