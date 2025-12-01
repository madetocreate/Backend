import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import type { ShoppingJob } from "./types";

export type ShoppingPriceAdvisorParams = {
  job: ShoppingJob;
  language?: string;
  countryCode?: string | null;
};

const SHOPPING_PRICE_PROMPT = `
Du bist ein Einkaufs- und Sparberater für den Shopping-Agent von Aklow.

Aufgabe:
- Du bekommst eine strukturierte Einkaufsplanung als JSON (items, Provider etc.).
- Du gibst einen kurzen, klaren Text zurück, der dem Nutzer Preis- und Spar-Hinweise gibt.
- Antworte immer in der Sprache, die im Feld "language" übergeben wird (oder in der Sprache der Artikelnamen, wenn keine Sprache gesetzt ist).

Ausgabe:
- Gib einen kurzen Fließtext mit Tipps zurück (max. ca. 8 Sätze).
- Keine Listen, kein Markdown, keine JSON-Antwort, nur normalen Text.
- Wenn du keine sinnvollen Preis- oder Sparhinweise ableiten kannst, gib einen sehr kurzen Hinweis wie "Keine besonderen Sparhinweise erkennbar." zurück.
`;

export async function runShoppingPriceAdvisor(
  params: ShoppingPriceAdvisorParams
): Promise<string | undefined> {
  const model = getSummaryModel();

  const safeJob = {
    jobType: params.job.jobType,
    providerPreference: params.job.providerPreference,
    providerKey: params.job.providerKey,
    providerLabel: params.job.providerLabel,
    items: params.job.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      priority: item.priority
    }))
  };

  const payload = {
    language: params.language ?? "auto",
    countryCode: params.countryCode ?? null,
    job: safeJob
  };

  try {
    const response = await openai.responses.create({
      model,
      instructions: SHOPPING_PRICE_PROMPT,
      input: [
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    });

    const text = (response as any).output_text as string | undefined;
    if (text && text.trim().length > 0) {
      return text.trim();
    }
  } catch {
  }

  return undefined;
}
