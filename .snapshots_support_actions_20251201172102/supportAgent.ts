
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { writeSse } from "../http/sse";
import {
  handleSupportAssistantQuery,
  createSupportAssistantStream
} from "../domain/support/service";
import { writeMemory } from "../domain/memory/service";

export function registerSupportAgentRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: () => void
) {
  const querySchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    message: z.string().min(1)
  });

  app.post("/agent/support/query", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const input = parsed.data;
    const result = await handleSupportAssistantQuery(input);

    try {
      if (result.content && result.content.trim().length > 0) {
        await writeMemory({
          tenantId: input.tenantId,
          type: "conversation_message",
          content:
            "User (support): " + input.message + "\nAssistant (support): " + result.content,
          metadata: {
            channel: "support_agent",
            sessionId: input.sessionId,
            mode: "support"
          },
          conversationId: input.sessionId,
          createdAt: new Date()
        });
      }
    } catch (e) {
      console.error(
        JSON.stringify({
          type: "support_agent_memory_error",
          route: "/agent/support/query",
          tenantId: input.tenantId,
          sessionId: input.sessionId
        })
      );
    }

    return result;
  });

  app.post("/agent/support/query/stream", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      reply.raw.end(JSON.stringify({ error: "invalid_body" }));
      return reply;
    }

    const input = parsed.data;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    if (typeof (reply.raw as any).flushHeaders === "function") {
      (reply.raw as any).flushHeaders();
    }

    writeSse(reply, "start", { started: true });

    let fullContent = "";

    try {
      const stream: AsyncIterable<any> = await createSupportAssistantStream(input);

      for await (const event of stream) {
        if ((event as any).type === "response.output_text.delta") {
          const delta =
            typeof (event as any).delta === "string" ? ((event as any).delta as string) : "";
          if (delta) {
            fullContent += delta;
            writeSse(reply, "chunk", { content: delta });
          }
        }
      }

      writeSse(reply, "end", { done: true });

      try {
        if (fullContent) {
          await writeMemory({
            tenantId: input.tenantId,
            type: "conversation_message",
            content:
              "User (support): " + input.message + "\nAssistant (support): " + fullContent,
            metadata: {
              channel: "support_agent",
              sessionId: input.sessionId,
              mode: "support"
            },
            conversationId: input.sessionId,
            createdAt: new Date()
          });
        }
      } catch (e) {
        console.error(
          JSON.stringify({
            type: "support_agent_stream_memory_error",
            route: "/agent/support/query/stream",
            tenantId: input.tenantId,
            sessionId: input.sessionId
          })
        );
      }
    } catch (e) {
      writeSse(reply, "error", { message: "response_error" });
    }

    reply.raw.end();
    return reply;
  });

  done();
}
