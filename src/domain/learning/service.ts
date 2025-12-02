import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import { getConversationMemory, writeMemory } from "../memory/service";
import { searchVectors } from "../vectorLocal/service";
import type { LearningContentRequest, LearningContentResponse } from "./types";

const LEARNING_AGENT_SYSTEM_PROMPT = `
Du bist der Lern-Agent von Aklow.

Deine Aufgabe:
Du hilfst Nutzerinnen und Nutzern, Inhalte zu verstehen und zu lernen. Aus hochgeladenen Dokumenten,
Notizen, E-Mails oder bestehenden Chatverläufen erstellst du Lernzusammenfassungen, Schritt-für-Schritt-Erklärungen,
Übungsaufgaben und Quizfragen.

Zielgruppe:
- Selbstständige, Kleinunternehmer und Privatpersonen, die wenig Zeit haben.
- Menschen ohne technischen Hintergrund.

Modi:
- "summary": kurze, leicht verständliche Zusammenfassung der wichtigsten Punkte.
- "lesson": strukturierte Lerneinheit mit Überschriften und Beispielen.
- "quiz": Fragen mit Musterlösungen, um das Wissen abzuprüfen.
- "flashcards": Frage-Antwort-Karten zum Wiederholen.

Wichtige Regeln:
1. Arbeite nur mit den Inhalten, die du übergeben bekommst (Session-Kontext und Vector-Kontext).
   Wenn Informationen fehlen, formuliere klare Annahmen oder sage, was dir fehlt.
2. Antworte immer in der Sprache der Nutzereingabe (Deutsch, wenn die Frage auf Deutsch gestellt ist).
3. Erkläre Dinge einfach, konkret und ohne Fachjargon. Lieber ein Beispiel zu viel als zu wenig.
4. Struktur:
   - Nutze Überschriften, Aufzählungen und nummerierte Schritte.
   - Bei "quiz" und "flashcards": liefere klar erkennbare Fragen und Musterantworten,
     sodass ein Frontend später Quiz-UI oder Karteikarten daraus bauen kann.
`;

export async function generateLearningContent(
  input: LearningContentRequest
): Promise<LearningContentResponse> {
  const [sessionContextRecords, vectorResults] = await Promise.all([
    getConversationMemory({
      tenantId: input.tenantId,
      conversationId: input.sessionId,
      limit: 20,
      types: ["conversation_message", "document"]
    }),
    searchVectors({
      tenantId: input.tenantId,
      domain: "documents",
      query: input.message,
      topK: 8,
      minScore: 0
    })
  ]);

  const sessionContext = sessionContextRecords.map(record => ({
    type: (record as any).type,
    content: record.content,
    createdAt: (record as any).createdAt
      ? (record as any).createdAt.toISOString()
      : undefined,
    metadata: (record as any).metadata ?? undefined
  }));

  const vectorContext = vectorResults.map(result => ({
    id: result.id,
    domain: result.domain,
    sourceType: result.sourceType,
    sourceId: result.sourceId,
    content: result.content,
    score: result.score,
    metadata: result.metadata ?? undefined,
    createdAt: result.createdAt.toISOString()
  }));

  const model = getSummaryModel();

  const response = await openai.responses.create({
    model,
    instructions: LEARNING_AGENT_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              message: input.message,
              mode: input.mode,
              difficulty: input.difficulty ?? null,
              questionCount: input.questionCount ?? null,
              tags: input.tags ?? [],
              sessionContext,
              vectorContext
            })
          }
        ]
      }
    ]
  });

  const content = response.output_text;

  try {
    await writeMemory({
      tenantId: input.tenantId,
      type: "conversation_message",
      content:
        "User (learning_" +
        input.mode +
        "): " +
        input.message +
        "\nAssistant (learning_" +
        input.mode +
        "): " +
        content,
      metadata: {
        channel: "agent_learning",
        sessionId: input.sessionId,
        mode: input.mode,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        tags: input.tags ?? [],
        metadata: input.metadata ?? undefined
      },
      conversationId: input.sessionId
    });
  } catch (error) {
    console.warn("learning_agent_write_memory_failed", {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      error: (error as Error).message
    });
  }

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    mode: input.mode,
    content
  };
}
