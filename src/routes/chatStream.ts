import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ChatRequestSchema, ChatRequestBody } from "../domain/chat/schema";
import { createStreamingResponse } from "../domain/orchestrator/service";
import { writeSse } from "../http/sse";
import { writeMemory } from "../domain/memory/service";

type ChatStreamRequest = FastifyRequest<{ Body: ChatRequestBody }>;

type UiStepStatus = "pending" | "active" | "done";

type UiStep = {
  id: string;
  label: string;
  status: UiStepStatus;
};

function buildUiSteps(input: ChatRequestBody): UiStep[] {
  const metadata = (input.metadata ?? {}) as any;
  const tool = typeof metadata.tool === "string" ? metadata.tool : undefined;

  if (tool === "communications_inbox") {
    return [
      { id: "inspect_metadata", label: "Modus und Inbox-Kontext prüfen", status: "pending" },
      { id: "load_inbox", label: "Inbox-Daten und Memory laden", status: "pending" },
      { id: "generate_summary", label: "Übersicht formulieren", status: "pending" }
    ];
  }

  if (tool === "communications_reply") {
    return [
      { id: "inspect_metadata", label: "Antwort-Kontext vorbereiten", status: "pending" },
      { id: "prepare_reply", label: "Antwortvorschläge generieren", status: "pending" },
      { id: "store_memory", label: "Antwort im Memory speichern", status: "pending" }
    ];
  }

  if (tool === "analysis_query") {
    return [
      { id: "prepare_analysis", label: "Analyse-Frage vorbereiten", status: "pending" },
      { id: "run_analysis", label: "Dokumente und Belege analysieren", status: "pending" },
      { id: "summarize_analysis", label: "Analyse-Ergebnis zusammenfassen", status: "pending" }
    ];
  }

  if (tool === "research_query") {
    return [
      { id: "prepare_research", label: "Research-Frage und Scope klären", status: "pending" },
      { id: "run_research", label: "Websuche und Quellen auswerten", status: "pending" },
      { id: "summarize_research", label: "Ergebnis mit Quellen aufbereiten", status: "pending" }
    ];
  }

  return [
    { id: "inspect_metadata", label: "Frage und Modus analysieren", status: "pending" },
    { id: "load_memory", label: "Business-Memory und Dokumente prüfen", status: "pending" },
    { id: "generate_answer", label: "Antwort formulieren", status: "pending" }
  ];
}

function sendStepUpdate(reply: FastifyReply, steps: UiStep[], id: string, status: UiStepStatus) {
  const step = steps.find(s => s.id === id);
  if (!step) return;
  step.status = status;
  writeSse(reply, "step_update", { id: step.id, status: step.status });
}

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
    const startedAt = Date.now();
    const body = request.body as any;
    const parsed = ChatRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      console.warn(
        JSON.stringify({
          type: "chat_stream_invalid_body",
          route: "/chat/stream",
          tenantId: body && typeof body.tenantId === "string" ? body.tenantId : null,
          sessionId: body && typeof body.sessionId === "string" ? body.sessionId : null,
          channel: body && typeof body.channel === "string" ? body.channel : null
        })
      );
      reply.code(400);
      reply.raw.end(JSON.stringify({ error: "invalid_body" }));
      return reply;
    }

    const input = parsed.data;
    const steps = buildUiSteps(input);

    console.log(
      JSON.stringify({
        type: "chat_stream_start",
        route: "/chat/stream",
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        channel: input.channel,
        startedAt
      })
    );

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
    writeSse(reply, "steps", { steps });

    if (steps.length > 0) {
      sendStepUpdate(reply, steps, steps[0].id, "active");
    }

    let fullContent = "";
    let firstDeltaSeen = false;

    try {
      const stream: AsyncIterable<any> = await createStreamingResponse(input);

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          const delta = typeof event.delta === "string" ? event.delta : "";
          if (delta) {
            if (!firstDeltaSeen) {
              firstDeltaSeen = true;
              if (steps.length > 0) {
                sendStepUpdate(reply, steps, steps[0].id, "done");
              }
              const activeIndex = steps.length > 1 ? 1 : 0;
              if (steps[activeIndex]) {
                sendStepUpdate(reply, steps, steps[activeIndex].id, "active");
              }
            }
            fullContent += delta;
            writeSse(reply, "chunk", { content: delta });
          }
        }
      }

      if (steps.length > 0) {
        const lastIndex = steps.length - 1;
        sendStepUpdate(reply, steps, steps[lastIndex].id, "done");
      }

      writeSse(reply, "end", { done: true });

      const durationMs = Date.now() - startedAt;

      console.log(
        JSON.stringify({
          type: "chat_stream_end",
          route: "/chat/stream",
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          channel: input.channel,
          durationMs,
          fullLength: fullContent.length
        })
      );
    } catch (e: any) {
      const durationMs = Date.now() - startedAt;

      console.error(
        JSON.stringify({
          type: "chat_stream_error",
          route: "/chat/stream",
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          channel: input.channel,
          durationMs,
          error: e && typeof e.message === "string" ? e.message : "unknown_error"
        })
      );

      writeSse(reply, "error", { message: "response_error" });
    }

    try {
      if (fullContent) {
        await writeMemory({
          tenantId: input.tenantId,
          type: "conversation_message",
          content: "User: " + input.message + "\nAssistant: " + fullContent,
          metadata: {
            channel: input.channel,
            sessionId: input.sessionId,
            mode: (input.metadata as any)?.mode ?? "general_chat"
          },
          conversationId: input.sessionId,
          createdAt: new Date()
        });
      }
    } catch (e: any) {
      console.error(
        JSON.stringify({
          type: "chat_stream_memory_error",
          route: "/chat/stream",
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          channel: input.channel,
          error: e && typeof e.message === "string" ? e.message : "unknown_error"
        })
      );
    }

    reply.raw.end();
    return reply;
  });
}
