import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { createResponse } from "../domain/orchestrator/service";

type ChatRequest = FastifyRequest<{ Body: ChatRequestBody }>;

export async function registerChatRoutes(app: FastifyInstance) {
  app.post("/chat", async (request: ChatRequest, reply: FastifyReply) => {
    const startedAt = Date.now();
    const body = request.body as any;
    const parsed = ChatRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      console.warn(
        JSON.stringify({
          type: "chat_request_invalid",
          route: "/chat",
          tenantId: body && typeof body.tenantId === "string" ? body.tenantId : null,
          sessionId: body && typeof body.sessionId === "string" ? body.sessionId : null,
          channel: body && typeof body.channel === "string" ? body.channel : null
        })
      );
      reply.code(400);
      return { error: "invalid_body" };
    }

    const input = parsed.data;

    console.log(
      JSON.stringify({
        type: "chat_request",
        route: "/chat",
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        channel: input.channel,
        startedAt
      })
    );

    try {
      const result = await createResponse(input);
      const durationMs = Date.now() - startedAt;

      console.log(
        JSON.stringify({
          type: "chat_response",
          route: "/chat",
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          channel: input.channel,
          durationMs
        })
      );

      return result;
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;

      console.error(
        JSON.stringify({
          type: "chat_error",
          route: "/chat",
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          channel: input.channel,
          durationMs,
          error: e && typeof e.message === "string" ? e.message : "unknown_error"
        })
      );

      reply.code(500);
      return { error: "chat_unexpected_error" };
    }
  });
}
