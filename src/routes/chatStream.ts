import { FastifyInstance, FastifyRequest } from "fastify";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { createStreamingResponse } from "../domain/orchestrator/service";
import { writeSse } from "../http/sse";

type ChatStreamRequest = FastifyRequest<{ Body: ChatRequestBody }>;

export async function registerChatStreamRoutes(app: FastifyInstance) {
  app.post("/chat/stream", async (request: ChatStreamRequest, reply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      reply.raw.end(JSON.stringify({ error: "invalid_body" }));
      return reply;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    if (typeof reply.raw.flushHeaders === "function") reply.raw.flushHeaders();

    writeSse(reply, "start", { started: true });

    try {
      const stream: AsyncIterable<any> = await createStreamingResponse(parsed.data);

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          const delta = typeof event.delta === "string" ? event.delta : "";
          if (delta) {
            writeSse(reply, "chunk", { content: delta });
          }
        }
      }

      writeSse(reply, "end", { done: true });
    } catch (e) {
      writeSse(reply, "error", { message: "response_error" });
    }

    reply.raw.end();
    return reply;
  });
}
