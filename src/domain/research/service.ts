import { randomUUID } from "crypto";
import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import {
  ResearchRequest,
  ResearchResponse,
  ResearchSource,
} from "./types";
import { getConversationMemory } from "../memory/service";
import { searchVectors } from "../vectorLocal/service";

type CoreResult = {
  answer: string;
  sources: ResearchSource[];
};

type InternalSnippet = {
  id: string;
  domain: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  sourceId: string;
};

async function buildInternalContext(
  tenantId: string,
  question: string
): Promise<InternalSnippet[]> {
  const snippets: InternalSnippet[] = [];
  const domains: ("business_profile" | "documents" | "emails" | "reviews")[] = [
    "business_profile",
    "documents",
    "emails",
    "reviews"
  ];

  for (const domain of domains) {
    try {
      const results = await searchVectors({
        tenantId,
        domain,
        query: question,
        topK: 4,
        minScore: 0.25
      });

      for (const r of results) {
        const meta =
          r.metadata && typeof r.metadata === "object"
            ? (r.metadata as Record<string, unknown>)
            : undefined;

        snippets.push({
          id: r.id,
          domain: r.domain,
          content: r.content,
          score: r.score,
          metadata: meta,
          sourceId: r.sourceId
        });
      }
    } catch {
    }
  }

  return snippets;
}

async function callResearchCore(
  input: ResearchRequest,
  internalContext: InternalSnippet[],
  useTools: boolean,
  sessionContext: any[]
): Promise<CoreResult> {
  const model = getSummaryModel();

  const tools: any[] | undefined = useTools ? [{ type: "web_search" }] : undefined;

  const response = await openai.responses.create({
    model,
    instructions:
      "You are a research assistant. " +
      "You can optionally use web_search and the provided internalContext snippets from the tenant's business memory to gather information. " +
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
              internalContext,
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

  const internalContext = await buildInternalContext(
    input.tenantId as string,
    input.question
  );

  let answer = "";
  let sources: ResearchSource[] = [];
  let usedTools = false;

  try {
    const coreWithTools = await callResearchCore(input, internalContext, true, sessionContext);
    answer = coreWithTools.answer;
    sources = coreWithTools.sources;
    usedTools = true;

    if (!answer && sources.length === 0) {
      const coreNoTools = await callResearchCore(input, internalContext, false, sessionContext);
      if (coreNoTools.answer) {
        answer = coreNoTools.answer;
        sources = coreNoTools.sources;
        usedTools = false;
      }
    }
  } catch {
    try {
      const coreNoTools = await callResearchCore(input, internalContext, false, sessionContext);
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
      hasVectorStore: internalContext.length > 0,
      hasInternalContext: internalContext.length > 0,
      internalSnippetCount: internalContext.length,
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
