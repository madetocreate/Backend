import { FastifyInstance, FastifyRequest } from "fastify";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { createStreamingResponse } from "../domain/orchestrator/service";
import { writeSse } from "../http/sse";
import { writeMemory } from "../domain/memory/service";

type ChatStreamRequest = FastifyRequest<{ Body: ChatRequestBody }>;

export async function registerChatStreamRoutes(app: FastifyInstance) {
  app.options("/chat/stream", async (request, reply) => {
    const origin = request.headers.origin ?? "*";
    reply
      .header("Access-Control-Allow-Origin", origin)
      .header("Vary", "Origin")
      .header("Access-Control-Allow-Headers", "Content-Type")
      .header("Access-Control-Allow-Methods", "POST, OPTIONS")
      .send();
  });

  app.post("/chat/stream", async (request: ChatStreamRequest, reply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      reply.raw.end(JSON.stringify({ error: "invalid_body" }));
      return reply;
    }

    const origin = request.headers.origin ?? "*";
    reply.raw.setHeader("Access-Control-Allow-Origin", origin);
    reply.raw.setHeader("Vary", "Origin");
    reply.raw.setHeader("Access-Control-Allow-Headers", "Content-Type");
    reply.raw.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    if (typeof reply.raw.flushHeaders === "function") reply.raw.flushHeaders();

    writeSse(reply, "start", { started: true });

    let fullContent = "";

    try {
      const stream: AsyncIterable<any> = await createStreamingResponse(parsed.data);

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          const delta = typeof event.delta === "string" ? event.delta : "";
          if (delta) {
            fullContent += delta;
            writeSse(reply, "chunk", { content: delta });
          }
        }
      }

    writeSse(reply, "end", { done: true });
    } catch (e) {
      writeSse(reply, "error", { message: "response_error" });
    }

    try {
      if (fullContent) {
        await writeMemory({
          tenantId: parsed.data.tenantId,
          type: "conversation_message",
          content: "User: " + parsed.data.message + "\nAssistant: " + fullContent,
          metadata: {
            channel: parsed.data.channel,
            sessionId: parsed.data.sessionId,
            mode: (parsed.data.metadata as any)?.mode ?? "general_chat"
          },
          conversationId: parsed.data.sessionId,
          createdAt: new Date()
        });
      }
    } catch (e) {
    }

    reply.raw.end();
    return reply;
  });
}
