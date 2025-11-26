import { openai } from "../../integrations/openai/client";
import { getVectorStoreId } from "../vector/service";
import { summarizeText } from "./summary";
import { OrchestratorInput } from "./types-orchestrator";
import { buildInstructions } from "./instructions";
import { getChatModel } from "../../config/model";

export async function createResponse(input: OrchestratorInput) {
  const vectorStoreId = await getVectorStoreId(input.tenantId);

  if (input.metadata && (input.metadata as any).summarize) {
    const summary = await summarizeText(input.message);
    return {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      channel: input.channel,
      content: summary
    };
  }

  const instructions = buildInstructions(input);

  const response = await openai.responses.create({
    model: getChatModel(),
    instructions,
    input: [
      {
        role: "user",
        content: input.message
      }
    ],
    tools: [
      { type: "web_search" },
      { type: "file_search", vector_store_ids: [vectorStoreId] },
      { type: "code_interpreter", container: { type: "auto" } }
    ]
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
  const instructions = buildInstructions(input);

  const stream = await openai.responses.create({
    model: getChatModel(),
    instructions,
    input: [
      {
        role: "user",
        content: input.message
      }
    ],
    tools: [
      { type: "web_search" },
      { type: "file_search", vector_store_ids: [vectorStoreId] },
      { type: "code_interpreter", container: { type: "auto" } }
    ],
    stream: true
  });

  return stream;
}
