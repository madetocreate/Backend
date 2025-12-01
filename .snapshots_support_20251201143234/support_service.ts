import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import { searchMemoryRecords } from "../memory/repository";
import { getConversationMemory } from "../memory/service";

export type SupportAssistantQueryInput = {
  tenantId: string;
  sessionId: string;
  message: string;
};

export type SupportAssistantQueryResult = {
  tenantId: string;
  sessionId: string;
  channel: "agent_support";
  content: string | null;
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
- Nutze "knowledge" als primäre Quelle. Erfinde keine Fakten.
- Wenn dir Informationen fehlen, sag das offen und frage gezielt nach.

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

async function buildSupportRuntimeContext(
  input: SupportAssistantQueryInput
): Promise<SupportRuntimeContext> {
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

  const knowledge = knowledgeRecords.map(rec => ({
    id: rec.id,
    type: rec.type,
    content: rec.content,
    createdAt:
      rec.createdAt instanceof Date ? rec.createdAt.toISOString() : String(rec.createdAt),
    metadata: rec.metadata ?? undefined
  }));

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    message: input.message,
    sessionContext,
    knowledge
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
