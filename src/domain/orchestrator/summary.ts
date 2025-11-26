import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";

export async function summarizeText(text: string) {
  const r = await openai.responses.create({
    model: getSummaryModel(),
    input: [
      {
        role: "system",
        content: "Summarize the following conversation into a compact business-ready memory snippet."
      },
      {
        role: "user",
        content: text
      }
    ]
  });

  return r.output_text || "";
}
