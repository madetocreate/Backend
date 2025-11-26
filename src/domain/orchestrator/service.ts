import { openai } from "../../integrations/openai/client";
import { getVectorStoreId } from "../vector/service";
import { summarizeText } from "./summary";
import { OrchestratorInput } from "./types-orchestrator";
import { buildInstructions } from "./instructions";
import { getChatModel } from "../../config/model";
import { writeMemory } from "../memory/service";
import { handleInboxRequest, handleReplyRequest } from "../communications/service";
import { handleResearchQuery } from "../research/service";
import { handleAnalysisQuery } from "../analysis/service";

type OrchestratorStep = {
  id: string;
  label: string;
  status: "done";
  details?: string;
};

export async function createResponse(input: OrchestratorInput) {
  const metadata = (input.metadata ?? {}) as any;
  const steps: OrchestratorStep[] = [];

  steps.push({
    id: "inspect_metadata",
    label: "Modus und Tool aus Metadaten bestimmen",
    status: "done"
  });

  if (metadata.summarize) {
    steps.push({
      id: "summarize_text",
      label: "Text zusammenfassen",
      status: "done"
    });

    const summary = await summarizeText(input.message);
    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content: summary,
      steps
    };
  }

  const tool = typeof metadata.tool === "string" ? metadata.tool : undefined;

  if (tool === "communications_inbox") {
    steps.push({
      id: "load_inbox_memory",
      label: "Memory nach Kommunikations-Nachrichten durchsuchen",
      status: "done"
    });
    steps.push({
      id: "call_communications_inbox_agent",
      label: "Communications-Agent für Inbox-Übersicht aufrufen",
      status: "done"
    });

    const limitRaw = metadata.limit;
    const limit =
      typeof limitRaw === "number" && Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= 100
        ? limitRaw
        : 20;

    const typesRaw = metadata.types;
    const types =
      Array.isArray(typesRaw) && typesRaw.length > 0
        ? typesRaw.filter((t: any) => typeof t === "string")
        : ["email", "dm", "review", "conversation_message"];

    const inboxResult = await handleInboxRequest({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      limit,
      types
    });

    const content = inboxResult.summary ?? "";

    steps.push({
      id: "store_inbox_summary_memory",
      label: "Inbox-Zusammenfassung im Memory speichern",
      status: "done",
      details: "conversation_message"
    });

    await writeMemory({
      tenantId: input.tenantId,
      type: "conversation_message",
      content:
        "User (communications_inbox): " +
        input.message +
        "\nAssistant (communications_inbox_summary): " +
        content,
      metadata: {
        channel: input.channel,
        sessionId: input.sessionId,
        mode: metadata.mode ?? "communications_inbox",
        tool: tool
      },
      conversationId: input.sessionId,
      createdAt: new Date()
    });

    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content,
      steps
    };
  }

  if (tool === "communications_reply") {
    steps.push({
      id: "prepare_reply_context",
      label: "Nachrichtentyp, Original-Nachricht und Tonalität vorbereiten",
      status: "done"
    });
    steps.push({
      id: "call_communications_reply_agent",
      label: "Communications-Agent für Antwortvorschläge aufrufen",
      status: "done"
    });

    const messageType =
      typeof metadata.messageType === "string" && metadata.messageType.trim().length > 0
        ? metadata.messageType
        : "generic";

    const originalRaw = metadata.original;
    const original =
      originalRaw && typeof originalRaw === "object" ? (originalRaw as Record<string, unknown>) : {};

    const tone = typeof metadata.tone === "string" ? metadata.tone : undefined;

    const variantsRaw = metadata.variants;
    const variants =
      typeof variantsRaw === "number" &&
      Number.isInteger(variantsRaw) &&
      variantsRaw >= 1 &&
      variantsRaw <= 5
        ? variantsRaw
        : undefined;

    const replyResult = await handleReplyRequest({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      messageType,
      original,
      tone,
      variants
    });

    const content = replyResult.replies ?? "";

    steps.push({
      id: "store_reply_suggestions_memory",
      label: "Antwortvorschläge im Memory speichern",
      status: "done",
      details: "conversation_message"
    });

    await writeMemory({
      tenantId: input.tenantId,
      type: "conversation_message",
      content:
        "User (communications_reply): " +
        input.message +
        "\nAssistant (communications_reply_suggestions): " +
        content,
      metadata: {
        channel: input.channel,
        sessionId: input.sessionId,
        mode: metadata.mode ?? "communications_reply",
        tool: tool,
        messageType,
        hasOriginal: Object.keys(original).length > 0
      },
      conversationId: input.sessionId,
      createdAt: new Date()
    });

    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content,
      steps
    };
  }

  if (tool === "analysis_query") {
    steps.push({
      id: "prepare_analysis_query",
      label: "Analyse-Frage und Kontext vorbereiten",
      status: "done"
    });
    steps.push({
      id: "call_analysis_agent",
      label: "Analyse-Agent für Dokumentauswertung aufrufen",
      status: "done"
    });

    const messageRaw = metadata.message;
    const message =
      typeof messageRaw === "string" && messageRaw.trim().length > 0
        ? messageRaw
        : input.message;

    const analysisResult = await handleAnalysisQuery({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      message
    });

    const content = analysisResult.content ?? "";

    steps.push({
      id: "store_analysis_memory",
      label: "Analyse-Ergebnis im Memory speichern",
      status: "done",
      details: "conversation_message"
    });

    await writeMemory({
      tenantId: input.tenantId,
      type: "conversation_message",
      content:
        "User (analysis_query): " +
        message +
        "\nAssistant (analysis_answer): " +
        content,
      metadata: {
        channel: input.channel,
        sessionId: input.sessionId,
        mode: metadata.mode ?? "analysis",
        tool: tool
      },
      conversationId: input.sessionId,
      createdAt: new Date()
    });

    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content,
      steps
    };
  }

  if (tool === "research_query") {
    steps.push({
      id: "prepare_research_question",
      label: "Research-Frage, Scope und Limits vorbereiten",
      status: "done"
    });
    steps.push({
      id: "call_research_agent",
      label: "Research-Agent mit Websuche und optionalem Business-Memory aufrufen",
      status: "done"
    });

    const questionRaw = metadata.question;
    const question =
      typeof questionRaw === "string" && questionRaw.trim().length > 0
        ? questionRaw
        : input.message;

    const scopeRaw = metadata.scope;
    const allowedScopes = ["general", "market", "competitors", "tech", "custom"];
    const scope =
      typeof scopeRaw === "string" && allowedScopes.indexOf(scopeRaw) !== -1 ? scopeRaw : undefined;

    const maxSourcesRaw = metadata.maxSources;
    const maxSources =
      typeof maxSourcesRaw === "number" &&
      Number.isInteger(maxSourcesRaw) &&
      maxSourcesRaw >= 1 &&
      maxSourcesRaw <= 20
        ? maxSourcesRaw
        : undefined;

    const researchResult = await handleResearchQuery({
      tenantId: input.tenantId as any,
      sessionId: input.sessionId,
      question,
      scope: scope as any,
      maxSources,
      channel: "agent_research",
      metadata
    });

    let content = researchResult.answer ?? "";
    if (researchResult.sources && researchResult.sources.length > 0) {
      const lines: string[] = [];
      lines.push("");
      lines.push("Quellen:");
      for (const src of researchResult.sources) {
        const base =
          src.url && src.url.trim().length > 0
            ? src.title + " (" + src.url + ")"
            : src.title + " [" + src.kind + "]";
        if (src.snippet && src.snippet.trim().length > 0) {
          lines.push("- " + base + " – " + src.snippet);
        } else {
          lines.push("- " + base);
        }
      }
      content = content + "\n\n" + lines.join("\n");
    }

    steps.push({
      id: "store_research_memory",
      label: "Research-Ergebnis mit Quellen im Memory speichern",
      status: "done",
      details: "conversation_message"
    });

    await writeMemory({
      tenantId: input.tenantId,
      type: "conversation_message",
      content:
        "User (research_query): " +
        question +
        "\nAssistant (research_answer): " +
        content,
      metadata: {
        channel: input.channel,
        sessionId: input.sessionId,
        mode: metadata.mode ?? "research",
        tool: tool,
        scope: scope ?? "general",
        maxSources: maxSources ?? 5,
        sourceCount: researchResult.sources ? researchResult.sources.length : 0
      },
      conversationId: input.sessionId,
      createdAt: new Date()
    });

    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content,
      steps
    };
  }

  steps.push({
    id: "prepare_vector_and_instructions",
    label: "Business-Memory laden und Orchestrator-Instruktionen bauen",
    status: "done"
  });

  const vectorStoreId = await getVectorStoreId(input.tenantId);
  const instructions = buildInstructions(input);

  steps.push({
    id: "call_orchestrator_model",
    label: "Orchestrator-Modell mit file_search-Tool aufrufen",
    status: "done"
  });

  const response = await openai.responses.create({
    model: getChatModel(),
    instructions,
    input: [
      {
        role: "user",
        content: input.message
      }
    ],
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }]
  });

  const content = response.output_text;

  steps.push({
    id: "store_general_chat_memory",
    label: "Antwort als Konversations-Memory speichern",
    status: "done",
    details: "conversation_message"
  });

  await writeMemory({
    tenantId: input.tenantId,
    type: "conversation_message",
    content: "User: " + input.message + "\nAssistant: " + content,
    metadata: {
      channel: input.channel,
      sessionId: input.sessionId,
      mode: metadata.mode ?? "general_chat"
    },
    conversationId: input.sessionId,
    createdAt: new Date()
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel: input.channel,
    content,
    steps
  };
}

export async function createStreamingResponse(input: OrchestratorInput) {
  const vectorStoreId = await getVectorStoreId(input.tenantId);
  const instructions = buildInstructions(input);

  const stream = await openai.responses.create({
    model: getChatModel(),
    instructions,
    input: [
      {
        role: "user",
        content: input.message
      }
    ],
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
    stream: true
  });

  return stream;
}
