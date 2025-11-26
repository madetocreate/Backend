import { openai } from "../../integrations/openai/client";
import { getVectorStoreId } from "../vector/service";
import { summarizeText } from "./summary";

export type OrchestratorInput = {
  tenantId: string;
  sessionId: string;
  channel: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function createResponse(input: OrchestratorInput) {
  const vectorStoreId = await getVectorStoreId(input.tenantId);

  if (input.metadata && input.metadata.summarize) {
    const summary = await summarizeText(input.message);
    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content: summary
    };
  }

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: "You are the Aklow Orchestrator. Behave like ChatGPT but focused on business clarity." },
      { role: "user", content: input.message }
    ],
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }]
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel: input.channel,
    content: response.output_text
  };
}

export async function createStreamingResponse(input: OrchestratorInput) {
  const vectorStoreId = await getVectorStoreId(input.tenantId);

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: "You are the Aklow Orchestrator. Behave like ChatGPT but focused on business clarity." },
      { role: "user", content: input.message }
    ],
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
    stream: true
  });

  return response;
}
