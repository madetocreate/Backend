import { openai } from "../../integrations/openai/client";
import { getChatModel } from "../../config/model";

export type CriticalReviewInput = {
  tenantId: string;
  sessionId: string;
  question: string;
  answer: string | null;
  metadata?: Record<string, unknown>;
};

export type CriticalReviewResult = {
  tenantId: string;
  sessionId: string;
  originalAnswer: string | null;
  improvedAnswer: string | null;
};

type CriticalReviewChatInputMessage = {
  role: "user";
  content: string;
};

const CRITICAL_REVIEW_SYSTEM_PROMPT = `
Du bist der Critical-Review-Agent für den Aklow Orchestrator.

Aufgabe:
- Prüfe Antworten anderer Agenten und des Orchestrators auf Klarheit, Vollständigkeit und Plausibilität.
- Achte besonders darauf, dass keine vertraulichen Daten unnötig offengelegt werden und keine rechtlich kritischen Zusagen gemacht werden (z. B. Garantien, Rabatte, Rechtsberatung), sofern diese nicht explizit erlaubt sind.
- Wenn die Antwort fachlich oder stilistisch verbesserungswürdig ist, formuliere eine verbesserte Version.

Arbeitsweise:
- Lies Frage und Antwort aufmerksam.
- Korrigiere sachliche Fehler, offensichtliche Widersprüche oder gefährliche Empfehlungen.
- Formuliere die finale Antwort klar, strukturiert und in der Sprache der ursprünglichen Antwort.
- Wenn die ursprüngliche Antwort bereits gut ist, gib sie inhaltlich unverändert wieder.

WICHTIG:
- Antworte ausschließlich mit der finalen, ggf. verbesserten Antwort, ohne Erläuterung deiner Prüfung.
- Füge keine internen technischen Details oder Hinweise auf den Review-Prozess in die Antwort ein.
`;

export async function runCriticalReview(
  input: CriticalReviewInput
): Promise<CriticalReviewResult> {
  const safeAnswer =
    typeof input.answer === "string" && input.answer.trim().length > 0 ? input.answer : "";

  if (!safeAnswer) {
    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      originalAnswer: input.answer,
      improvedAnswer: input.answer
    };
  }

  const messages: CriticalReviewChatInputMessage[] = [
    {
      role: "user",
      content: JSON.stringify({
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        question: input.question,
        answer: safeAnswer,
        metadata: input.metadata ?? {}
      })
    }
  ];

  const response = await openai.responses.create({
    model: getChatModel(),
    instructions: CRITICAL_REVIEW_SYSTEM_PROMPT,
    input: messages
  });

  const improved = response.output_text ?? safeAnswer;

  const finalAnswer =
    typeof improved === "string" && improved.trim().length > 0 ? improved : safeAnswer;

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    originalAnswer: safeAnswer,
    improvedAnswer: finalAnswer
  };
}
