import { openai } from "../../integrations/openai/client";

export async function summarizeText(text: string) {
  const r = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: "Summarize the following conversation into a compact business-ready memory snippet." },
      { role: "user", content: text }
    ]
  });

  return r.output_text || "";
}
