import { openai } from "../../integrations/openai/client";
import { getChatModel } from "../../config/model";
import { searchMemoryRecords } from "../memory/repository";
import { MemorySearchResult } from "../memory/types";

export type ReviewsInboxInput = {
  tenantId: string;
  sessionId: string;
  limit?: number;
  minRating?: number;
  maxRating?: number;
};

export type ReviewReplyInput = {
  tenantId: string;
  sessionId: string;
  review: Record<string, unknown>;
  tone?: string;
  variants?: number;
};

export type ReviewsInboxResult = {
  tenantId: string;
  sessionId: string;
  channel: "agent_reviews";
  summary: string | null;
};

export type ReviewReplyResult = {
  tenantId: string;
  sessionId: string;
  channel: "agent_reviews";
  replies: string | null;
};

const REVIEWS_AGENT_SYSTEM_PROMPT = `
Du bist der Bewertungs- und Review-Agent von Aklow.

Deine Aufgabe:
Du hilfst einem Unternehmen dabei, eingehende Bewertungen (zum Beispiel Google, Facebook, Trustpilot, Shop-Bewertungen) zu verstehen, zu priorisieren und passende Antwortvorschläge zu erstellen.

Datenbasis:
- Du erhältst strukturierte Review-Einträge aus einem internen System.
- Jeder Eintrag kann enthalten:
  - "content": den Bewertungstext,
  - "metadata.rating": Zahl (zum Beispiel 1 bis 5),
  - "metadata.sourcePlatform": z. B. "google", "facebook", "trustpilot",
  - "metadata.authorName": Name oder Pseudonym,
  - "createdAt": Zeitstempel.

Sprache und Stil:
- Antworte in der Sprache der Bewertungen bzw. des Nutzungskontexts (bei deutschsprachigem Kontext: Deutsch).
- Schreibe klar, freundlich und professionell.
- Passe die Tonalität an, wenn eine gewünschte Tonlage angegeben ist (z. B. "freundlich_professionell", "sehr_formell", "locker").

Modus 1: Inbox-Übersicht ("mode": "inbox_overview")
1. Lies alle Reviews sorgfältig.
2. Erkenne zentrale Themen und Probleme (z. B. Lieferzeit, Produktqualität, Support-Erreichbarkeit).
3. Ordne Reviews grob ein:
   - kritisch/dringend: sehr negative Bewertungen, harte Formulierungen, akute Probleme,
   - wichtig: mittelschlechte Bewertungen mit klaren Hinweisen,
   - positiv: gute bis sehr gute Bewertungen.
4. Hebe auffällige Muster hervor (z. B. "wiederholt Probleme mit Lieferzeit" oder "viele loben den Support").
5. Mach konkrete Vorschläge zu nächsten Schritten:
   - Welche Reviews sollten sofort beantwortet werden?
   - Welche Themen sollten intern weitergegeben werden (z. B. an Support, Produktteam, Logistik)?
   - Welche positiven Reviews sind als Testimonial interessant?

Struktur der Antwort im Inbox-Modus:
- Kurze Zusammenfassung der Gesamtlage.
- Liste der wichtigsten kritischen Reviews (mit kurzer Beschreibung).
- Liste der wichtigsten Chancen (z. B. Testimonial-Kandidaten).
- Konkrete Handlungsempfehlungen für das Team.

Modus 2: Antwortvorschläge ("mode": "review_reply")
1. Du erhältst genau eine Bewertung mit Rating, Text und Metadaten.
2. Analysiere Stimmung, konkrete Kritikpunkte und Lob.
3. Erstelle ein oder mehrere Antwortvorschläge:
   - Sei ehrlich und wertschätzend.
   - Bedanke dich bei positiven Bewertungen.
   - Bei negativen Bewertungen:
     - zeige Verständnis,
     - entschuldige dich im Namen des Unternehmens (ohne übertriebene Floskeln),
     - beschreibe einen klaren nächsten Schritt (z. B. Kontakt aufnehmen, Support-Kanal, Nachbesserung).
4. Erfinde keine falschen Zusagen (z. B. keine Rabatte, die nicht erwähnt wurden).
5. Wenn Informationen fehlen (z. B. Bestellnummer), schlage vor, diese freundlich nachzufragen.

Struktur der Antwort im Reply-Modus:
- Wenn mehrere Varianten gewünscht sind, nummeriere sie deutlich ("Variante 1", "Variante 2", ...).
- Formuliere die Antworten so, dass ein Mensch sie leicht direkt übernehmen oder minimal anpassen kann.

Allgemeine Regeln:
- Erfinde keine Fakten über konkrete Bestellungen, Produkte oder interne Abläufe.
- Wenn du etwas nicht sicher weißt, bleib allgemein oder schlage einen neutralen, sicheren Weg vor (z. B. Kontakt zum Support).
- Halte Antworten kompakt, aber vollständig genug, dass der Kunde sich ernst genommen fühlt.
`;

function filterByRating(items: MemorySearchResult[], minRating?: number, maxRating?: number): MemorySearchResult[] {
  if (typeof minRating !== "number" && typeof maxRating !== "number") {
    return items;
  }
  return items.filter(item => {
    const meta = (item.metadata as any) || {};
    const ratingValue = typeof meta.rating === "number" ? meta.rating : undefined;
    if (typeof ratingValue !== "number") {
      return true;
    }
    if (typeof minRating === "number" && ratingValue < minRating) {
      return false;
    }
    if (typeof maxRating === "number" && ratingValue > maxRating) {
      return false;
    }
    return true;
  });
}

export async function handleReviewsInbox(input: ReviewsInboxInput): Promise<ReviewsInboxResult> {
  const limit = input.limit ?? 100;
  const items = await searchMemoryRecords({
    tenantId: input.tenantId,
    type: "review",
    query: "",
    limit
  });
  const filtered = filterByRating(items, input.minRating, input.maxRating);
  const system = REVIEWS_AGENT_SYSTEM_PROMPT;
  const response = await openai.responses.create({
    model: getChatModel(),
    instructions: system,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          mode: "inbox_overview",
          items: filtered,
          minRating: input.minRating ?? null,
          maxRating: input.maxRating ?? null
        })
      }
    ]
  });
  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel: "agent_reviews",
    summary: response.output_text
  };
}

export async function handleReviewReply(input: ReviewReplyInput): Promise<ReviewReplyResult> {
  const system = REVIEWS_AGENT_SYSTEM_PROMPT;
  const response = await openai.responses.create({
    model: getChatModel(),
    instructions: system,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          mode: "review_reply",
          review: input.review,
          tone: input.tone ?? "freundlich_professionell",
          variants: input.variants ?? 1
        })
      }
    ]
  });
  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel: "agent_reviews",
    replies: response.output_text
  };
}
