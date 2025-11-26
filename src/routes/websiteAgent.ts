import { FastifyInstance } from "fastify";
import { z } from "zod";
import { writeSse } from "../http/sse";
import { handleWebsiteAssistantQuery, createWebsiteAssistantStream } from "../domain/website/service";

export function registerWebsiteAgentRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  const querySchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    message: z.string().min(1),
    focus: z.string().optional()
  });

  app.post("/agent/website/query", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const result = await handleWebsiteAssistantQuery(parsed.data);
    return result;
  });

  app.post("/agent/website/query/stream", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
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

    let fullContent = "";

    try {
      const stream: AsyncIterable<any> = await createWebsiteAssistantStream(parsed.data);

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

    reply.raw.end();
    return reply;
  });

  done();
}
