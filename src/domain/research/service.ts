import { randomUUID } from "crypto";
import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import { getVectorStoreId } from "../vector/service";
import {
  ResearchRequest,
  ResearchResponse,
  ResearchSource,
} from "./types";
import { getConversationMemory } from "../memory/service";

type CoreResult = {
  answer: string;
  sources: ResearchSource[];
};

async function callResearchCore(
  input: ResearchRequest,
  vectorStoreId: string | undefined,
  useTools: boolean,
  sessionContext: any[]
): Promise<CoreResult> {
  const model = getSummaryModel();

  const tools: any[] | undefined = useTools
    ? [
        { type: "web_search" },
        ...(vectorStoreId
          ? [
              {
                type: "file_search",
                file_search: {
                  vector_store_ids: [vectorStoreId],
                },
              },
            ]
          : []),
      ]
    : undefined;

  const response = await openai.responses.create({
    model,
    instructions:
      "You are a research assistant. " +
      "You can (optionally) use web_search and file_search tools to gather information. " +
      "Answer the user's question and provide a short list of sources. " +
      "Return ONLY minified JSON without markdown, comments or explanations. " +
      'Schema: {"answer": string, "sources": [{"id": string, "title": string, "url"?: string, "kind": "web" | "internal", "snippet"?: string}]}. ' +
      "Prefer high-quality, trustworthy sources. If you did not actually use tools, still follow the schema.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              question: input.question,
              scope: input.scope ?? "general",
              maxSources: input.maxSources ?? 5,
              tenantId: input.tenantId,
              vectorStoreId,
              metadata: input.metadata,
              sessionContext
            }),
          },
        ],
      },
    ],
    ...(tools ? { tools } : {}),
  } as any);

  const text = (response as any).output_text as string | undefined;

  let answer = "";
  let sources: ResearchSource[] = [];

  if (text) {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed.answer === "string") {
      answer = parsed.answer;
    }

    if (parsed && Array.isArray(parsed.sources)) {
      sources = parsed.sources
        .map((s: any) => {
          if (!s || typeof s.title !== "string" || !s.title.trim()) {
            return null;
          }
          const src: ResearchSource = {
            id:
              typeof s.id === "string" && s.id.trim().length > 0
                ? s.id
                : randomUUID(),
            title: s.title,
            kind: s.kind === "internal" ? "internal" : "web",
          };
          if (typeof s.url === "string" && s.url.trim().length > 0) {
            src.url = s.url;
          }
          if (typeof s.snippet === "string" && s.snippet.trim().length > 0) {
            src.snippet = s.snippet;
          }
          return src;
        })
        .filter((s: ResearchSource | null): s is ResearchSource => s !== null);
    }
  }

  return { answer, sources };
}

export async function handleResearchQuery(input: ResearchRequest): Promise<ResearchResponse> {
  const channel = input.channel ?? "agent_research";
  const now = new Date();

  const sessionContextRecords = await getConversationMemory({
    tenantId: input.tenantId,
    conversationId: input.sessionId,
    limit: 20,
    types: ["conversation_message"]
  });

  const sessionContext = sessionContextRecords.map(record => ({
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    metadata: record.metadata ?? undefined
  }));

  let vectorStoreId: string | undefined;
  try {
    vectorStoreId = await getVectorStoreId(input.tenantId);
  } catch {
    vectorStoreId = undefined;
  }

  let answer = "";
  let sources: ResearchSource[] = [];
  let usedTools = false;

  try {
    const coreWithTools = await callResearchCore(input, vectorStoreId, true, sessionContext);
    answer = coreWithTools.answer;
    sources = coreWithTools.sources;
    usedTools = true;

    if (!answer && sources.length === 0) {
      const coreNoTools = await callResearchCore(input, vectorStoreId, false, sessionContext);
      if (coreNoTools.answer) {
        answer = coreNoTools.answer;
        sources = coreNoTools.sources;
        usedTools = false;
      }
    }
  } catch {
    try {
      const coreNoTools = await callResearchCore(input, vectorStoreId, false, sessionContext);
      answer = coreNoTools.answer;
      sources = coreNoTools.sources;
      usedTools = false;
    } catch {
      answer =
        "Ich konnte deine Recherche gerade nicht zuverlässig durchführen. Bitte versuche es später erneut oder passe deine Frage an.";
      sources = [];
    }
  }

  if (!answer) {
    answer =
      "Hier ist eine zusammengefasste Antwort auf deine Frage basierend auf den verfügbaren Informationen.";
  }

  const usageType: UsageEventType = "research_query" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId,
    type: usageType,
    route: "/agent/research/query",
    timestamp: now,
    metadata: {
      scope: input.scope ?? "general",
      maxSources: input.maxSources ?? 5,
      hasVectorStore: Boolean(vectorStoreId),
      channel,
      usedTools,
    },
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    answer,
    sources,
  };
}
