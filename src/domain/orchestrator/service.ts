import { openai } from "../../integrations/openai/client";
import { getVectorStoreId } from "../vector/service";
import { summarizeText } from "./summary";
import { OrchestratorInput } from "./types-orchestrator";
import { buildInstructions } from "./instructions";
import { getChatModel } from "../../config/model";
import { writeMemory } from "../memory/service";

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
      { type: "file_search", vector_store_ids: [vectorStoreId] }
    ]
  });

  const content = response.output_text;

  await writeMemory({
    tenantId: input.tenantId,
    type: "conversation_message",
    content: "User: " + input.message + "\nAssistant: " + content,
    metadata: {
      channel: input.channel,
      sessionId: input.sessionId,
      mode: (input.metadata as any)?.mode ?? "general_chat"
    },
    conversationId: input.sessionId,
    createdAt: new Date()
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel: input.channel,
    content
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
      { type: "file_search", vector_store_ids: [vectorStoreId] }
    ],
    stream: true
  });

  return stream;
}
