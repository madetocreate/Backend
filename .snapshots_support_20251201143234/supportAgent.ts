import { FastifyInstance } from "fastify";
import { z } from "zod";
import { writeSse } from "../http/sse";
import {
  handleSupportAssistantQuery,
  createSupportAssistantStream
} from "../domain/support/service";

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
    const result = await handleSupportAssistantQuery(parsed.data);
    return result;
  });

  app.post("/agent/support/query/stream", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      reply.raw.end(JSON.stringify({ error: "invalid_body" }));
      return reply;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    if (typeof (reply.raw as any).flushHeaders === "function") {
      (reply.raw as any).flushHeaders();
    }

    writeSse(reply, "start", { started: true });

    let fullContent = "";

    try {
      const stream: AsyncIterable<any> = await createSupportAssistantStream(parsed.data);

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

      writeSse(reply, "end", { done: true, content: fullContent });
    } catch (error) {
      writeSse(reply, "error", { message: "response_error" });
    }

    reply.raw.end();
    return reply;
  });

  done();
}
