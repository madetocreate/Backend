import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import { searchMemoryRecords } from "../memory/repository";
import { getConversationMemory, writeMemory } from "../memory/service";

export type SupportSpecialAction = "create_ticket" | "handover_operator" | "label_conversation";

export type SupportAssistantQueryInput = {
  tenantId: string;
  sessionId: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type SupportAssistantQueryResult = {
  tenantId: string;
  sessionId: string;
  channel: "agent_support";
  content: string | null;
};

type SupportRuntimeConfig = {
  supportAction?: SupportSpecialAction;
  supportLabels: string[];
  supportPriority: "low" | "normal" | "high";
  supportOperatorTarget?: string;
};

type SupportRuntimeContext = {
  tenantId: string;
  sessionId: string;
  message: string;
  sessionContext: {
    content: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }[];
  knowledge: {
    id: string;
    type: string;
    content: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }[];
  config: SupportRuntimeConfig;
};

const SUPPORT_AGENT_SYSTEM_PROMPT = `
Du bist der Support-Agent von Aklow (bzw. des jeweils aktiven Tenants).

Aufgabe:
- Du bist der erste Ansprechpartner für Kund:innen mit Fragen oder Problemen.
- Du beantwortest Fragen zu Produkt, Funktionen, Preisen, Onboarding und Nutzung.
- Du hilfst beim Troubleshooting typischer Probleme und kannst bei Bedarf an das Team übergeben.

Datenbasis:
- Du bekommst einen Laufzeit-Kontext als JSON:
  - "sessionContext": bisheriger Verlauf der Support-Unterhaltung.
  - "knowledge": relevante Einträge aus dem Business-Memory (business_profile, documents, emails, reviews etc.).
  - "config": Steuerungsinformationen wie "supportAction", "supportLabels", "supportPriority" und "supportOperatorTarget".
- Nutze "knowledge" als primäre Quelle. Erfinde keine Fakten.
- Nutze "config", um dein Verhalten anzupassen (z. B. Ticket-Erstellung, Handover an Operator, Labeln der Konversation), aber erkläre diese technischen Felder nicht im Detail gegenüber dem Kunden.

Sprache und Stil:
- Antworte immer in der Sprache des Nutzers (z. B. Deutsch, wenn der Nutzer auf Deutsch schreibt).
- Ton: ruhig, klar, lösungsorientiert, freundlich – kein aggressives Sales oder Marketing-Blabla.
- Erkläre Dinge so, dass auch nicht-technische Menschen es verstehen.

Arbeitsweise:
- Versuche zuerst, das Anliegen präzise zu verstehen; stelle bei Bedarf 1–2 gezielte Rückfragen.
- Nutze "sessionContext", um Zusammenhänge aus dem bisherigen Gespräch mitzudenken.
- Nutze "knowledge", um konkrete Details zu liefern (z. B. Konditionen, Funktionsbeschreibungen, Abläufe).
- Wenn etwas unklar ist, erwähne explizit, welche Infos du noch brauchst.

Eskalation:
- Wenn du das Problem nicht zufriedenstellend lösen kannst:
  - Schlage vor, wie der Mensch das Support-Team erreicht (z. B. E-Mail, Telefonnummer, Ticket – sofern im Knowledge-Kontext vorhanden).
  - Fasse das Problem kurz so zusammen, dass ein Mensch es später schnell versteht.

Antwortformat:
- Nutze kurze Absätze und bei mehreren Punkten übersichtliche Aufzählungen.
- Beantworte mehrere Fragen getrennt und strukturiert.
- Sei transparent, was du weißt, was du nicht weißt und welche nächsten Schritte sinnvoll sind.
`;

function normalizeSupportConfig(metadata?: Record<string, unknown>): SupportRuntimeConfig {
  const raw = (metadata ?? {}) as any;

  const actionRaw = raw.supportAction;
  let supportAction: SupportSpecialAction | undefined;
  if (
    actionRaw === "create_ticket" ||
    actionRaw === "handover_operator" ||
    actionRaw === "label_conversation"
  ) {
    supportAction = actionRaw;
  }

  const labelsRaw = raw.supportLabels;
  const supportLabels: string[] = Array.isArray(labelsRaw)
    ? labelsRaw.filter((v: unknown) => typeof v === "string").slice(0, 16)
    : [];

  const priorityRaw = raw.supportPriority;
  let supportPriority: "low" | "normal" | "high" = "normal";
  if (priorityRaw === "low" || priorityRaw === "high") {
    supportPriority = priorityRaw;
  }

  const operatorTargetRaw = raw.supportOperatorTarget;
  const supportOperatorTarget =
    typeof operatorTargetRaw === "string" && operatorTargetRaw.trim().length > 0
      ? operatorTargetRaw
      : undefined;

  return {
    supportAction,
    supportLabels,
    supportPriority,
    supportOperatorTarget
  };
}

async function buildSupportRuntimeContext(
  input: SupportAssistantQueryInput
): Promise<SupportRuntimeContext> {
  const sessionContextRecords = await getConversationMemory({
    tenantId: input.tenantId,
    conversationId: input.sessionId,
    limit: 20,
    types: ["conversation_message"]
  });

  const sessionContext = sessionContextRecords.map((record) => ({
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    metadata: record.metadata ?? undefined
  }));

  let knowledgeRecords: any[] = [];

  try {
    knowledgeRecords = await searchMemoryRecords({
      tenantId: input.tenantId,
      query: input.message,
      limit: 24
    });
  } catch (error) {
    knowledgeRecords = [];
  }

  const knowledge = knowledgeRecords.map((rec) => ({
    id: rec.id,
    type: rec.type,
    content: rec.content,
    createdAt:
      rec.createdAt instanceof Date ? rec.createdAt.toISOString() : String(rec.createdAt),
    metadata: rec.metadata ?? undefined
  }));

  const config = normalizeSupportConfig(input.metadata);

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    message: input.message,
    sessionContext,
    knowledge,
    config
  };
}

export async function handleSupportAssistantQuery(
  input: SupportAssistantQueryInput
): Promise<SupportAssistantQueryResult> {
  const context = await buildSupportRuntimeContext(input);

  const response = await openai.responses.create({
    model: getSummaryModel(),
    instructions: SUPPORT_AGENT_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: JSON.stringify(context)
      }
    ]
  });

  const anyResponse: any = response as any;
  const content =
    typeof anyResponse.output_text === "string" ? (anyResponse.output_text as string) : null;

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel: "agent_support",
    content
  };
}

export async function createSupportAssistantStream(
  input: SupportAssistantQueryInput
): Promise<AsyncIterable<any>> {
  const context = await buildSupportRuntimeContext(input);

  const stream = await openai.responses.create({
    model: getSummaryModel(),
    instructions: SUPPORT_AGENT_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: JSON.stringify(context)
      }
    ],
    stream: true
  });

  return stream as AsyncIterable<any>;
}

export async function runSupportSideEffects(params: {
  tenantId: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const config = normalizeSupportConfig(params.metadata);
  if (!config.supportAction) {
    return;
  }

  const baseMetadata: Record<string, unknown> = {
    ...(params.metadata ?? {}),
    supportAction: config.supportAction,
    supportLabels: config.supportLabels,
    supportPriority: config.supportPriority,
    supportOperatorTarget: config.supportOperatorTarget
  };

  const contentParts: string[] = [];
  contentParts.push(`Session: ${params.sessionId}`);
  contentParts.push(`Action: ${config.supportAction}`);
  if (config.supportLabels.length > 0) {
    contentParts.push(`Labels: ${config.supportLabels.join(", ")}`);
  }
  contentParts.push(`Priority: ${config.supportPriority}`);
  if (config.supportOperatorTarget) {
    contentParts.push(`Operator target: ${config.supportOperatorTarget}`);
  }
  contentParts.push("");
  contentParts.push("User message:");
  contentParts.push(params.userMessage);
  if (params.assistantMessage && params.assistantMessage.trim().length > 0) {
    contentParts.push("");
    contentParts.push("Assistant message:");
    contentParts.push(params.assistantMessage);
  }

  let kind = "support_meta";
  if (config.supportAction === "create_ticket") {
    kind = "support_ticket";
  } else if (config.supportAction === "handover_operator") {
    kind = "support_handover";
  } else if (config.supportAction === "label_conversation") {
    kind = "support_label";
  }

  try {
    await writeMemory({
      tenantId: params.tenantId,
      type: "conversation_message",
      content: contentParts.join("\n"),
      metadata: {
        ...baseMetadata,
        kind
      },
      conversationId: params.sessionId,
      createdAt: new Date()
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "support_side_effect_error",
        tenantId: params.tenantId,
        sessionId: params.sessionId,
        action: config.supportAction
      })
    );
  }
}
