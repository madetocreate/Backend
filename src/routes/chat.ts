import { FastifyInstance, FastifyRequest } from "fastify";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { runOrchestrator } from "../domain/orchestrator/service";
import { recordUsageEvent } from "../domain/usage/service";

type ChatRequest = FastifyRequest<{ Body: ChatRequestBody }>;

export async function registerChatRoutes(app: FastifyInstance) {
  app.post("/chat", async (request: ChatRequest) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return { error: "invalid_body" };
    }

    const { tenantId, sessionId, channel, message, metadata } = parsed.data;

    const orchestratorResult = await runOrchestrator({
      tenantId,
      sessionId,
      channel,
      message,
      metadata
    });

    await recordUsageEvent({
      tenantId,
      type: "chat_request",
      route: "/chat",
      timestamp: new Date(),
      metadata: {
        sessionId,
        channel,
        hasMetadata: metadata != null
      }
    });

    return {
      tenantId,
      sessionId,
      channel,
      metadata: metadata ?? null,
      content: orchestratorResult.content,
      actions: orchestratorResult.actions ?? null
    };
  });
}
