import { runChatRaw } from "../chat/service";
import { buildMessages } from "./prompt";
import { OrchestratorInput, OrchestratorOutput, OrchestratorOutputAction } from "./types";

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const messages = buildMessages(input);

  const result = (await runChatRaw({
    messages,
    stream: false
  })) as { content: string };

  return {
    content: result.content,
    actions: []
  };
}

export type OrchestratorStreamResult = {
  stream: AsyncIterable<any>;
  actions?: OrchestratorOutputAction[];
};

export async function runOrchestratorStream(input: OrchestratorInput): Promise<OrchestratorStreamResult> {
  const messages = buildMessages(input);

  const result = (await runChatRaw({
    messages,
    stream: true
  })) as { stream: AsyncIterable<any> };

  return {
    stream: result.stream,
    actions: []
  };
}
