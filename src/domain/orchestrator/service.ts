import { openai } from "../../integrations/openai/client";
import { getVectorStoreId } from "../vector/service";
import { summarizeText } from "./summary";
import { OrchestratorInput } from "./types-orchestrator";
import { buildInstructions } from "./instructions";
import { getChatModel } from "../../config/model";
import { writeMemory, getConversationMemory } from "../memory/service";
import { handleInboxRequest, handleReplyRequest } from "../communications/service";
import { handleResearchQuery } from "../research/service";
import { handleAnalysisQuery } from "../analysis/service";

export async function createResponse(input: OrchestratorInput) {
  const metadata = (input.metadata ?? {}) as any;

  if (metadata.summarize) {
    const summary = await summarizeText(input.message);
    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content: summary
    };
  }

  const tool = typeof metadata.tool === "string" ? metadata.tool : undefined;

  if (tool === "communications_inbox") {
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
      content
    };
  }

  if (tool === "communications_reply") {
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
      content
    };
  }

  if (tool === "analysis_query") {
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
      content
    };
  }

  if (tool === "research_query") {
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
      content
    };
  }

  const vectorStoreId = await getVectorStoreId(input.tenantId);
  const instructions = buildInstructions(input);

  const history = await getConversationMemory({
    tenantId: input.tenantId,
    conversationId: input.sessionId,
    limit: 20,
    types: ["conversation_message"]
  });

  const inputMessages: { role: "user"; content: string }[] = [];

  for (const record of history) {
    inputMessages.push({
      role: "user",
      content: record.content
    });
  }

  inputMessages.push({
    role: "user",
    content: input.message
  });

  const response = await openai.responses.create({
    model: getChatModel(),
    instructions,
    input: inputMessages,
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }]
  });

  const content = response.output_text;

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
    content
  };
}

export async function createStreamingResponse(input: OrchestratorInput) {
  const vectorStoreId = await getVectorStoreId(input.tenantId);
  const instructions = buildInstructions(input);

  const history = await getConversationMemory({
    tenantId: input.tenantId,
    conversationId: input.sessionId,
    limit: 20,
    types: ["conversation_message"]
  });

  const inputMessages: { role: "user"; content: string }[] = [];

  for (const record of history) {
    inputMessages.push({
      role: "user",
      content: record.content
    });
  }

  inputMessages.push({
    role: "user",
    content: input.message
  });

  const stream = await openai.responses.create({
    model: getChatModel(),
    instructions,
    input: inputMessages,
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
    stream: true
  });

  return stream;
}
