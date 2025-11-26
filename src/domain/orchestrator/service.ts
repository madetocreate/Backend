import { openai } from "../../integrations/openai/client";
import { getVectorStoreId } from "../vector/service";
import { summarizeText } from "./summary";
import { OrchestratorInput } from "./types-orchestrator";
import { buildInstructions } from "./instructions";

/**
 * Synchronous response (non-streaming) using the OpenAI Responses API.
 */
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
    model: "gpt-4.1",
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

/**
 * Streaming response using the OpenAI Responses API.
 * The route is responsible for iterating the stream and emitting SSE chunks.
 */
export async function createStreamingResponse(input: OrchestratorInput) {
  const vectorStoreId = await getVectorStoreId(input.tenantId);
  const instructions = buildInstructions(input);

  const stream = await openai.responses.create({
    model: "gpt-4.1",
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
