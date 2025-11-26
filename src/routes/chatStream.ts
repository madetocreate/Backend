import { FastifyInstance, FastifyRequest } from "fastify";
import { writeSse } from "../http/sse";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { runOrchestratorStream } from "../domain/orchestrator/service";
import { recordUsageEvent } from "../domain/usage/service";

type ChatStreamRequest = FastifyRequest<{ Body: ChatRequestBody }>;

export async function registerChatStreamRoutes(app: FastifyInstance) {
  app.post("/chat/stream", async (request: ChatStreamRequest, reply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      reply.raw.setHeader("Content-Type", "application/json");
      reply.raw.end(JSON.stringify({ error: "invalid_body" }));
      return reply;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    if (typeof reply.raw.flushHeaders === "function") {
      reply.raw.flushHeaders();
    }

    const { tenantId, sessionId, channel, message, metadata } = parsed.data;

    writeSse(reply, "start", { message: "stream_started" });

    try {
      await recordUsageEvent({
        tenantId,
        type: "chat_stream",
        route: "/chat/stream",
        timestamp: new Date(),
        metadata: {
          sessionId,
          channel,
          hasMetadata: metadata != null
        }
      });

      const result = await runOrchestratorStream({
        tenantId,
        sessionId,
        channel,
        message,
        metadata
      });

      const stream = result.stream;

      if (!stream) {
        writeSse(reply, "error", { message: "stream_not_available" });
        reply.raw.end();
        return reply;
      }

      for await (const chunk of stream as any) {
        const content = (chunk as any).choices[0]?.delta?.content;
        if (content) {
          writeSse(reply, "chunk", { content });
        }
      }

      writeSse(reply, "end", { done: true });
    } catch (error) {
      writeSse(reply, "error", { message: "openai_error" });
    }

    reply.raw.end();
    return reply;
  });
}
