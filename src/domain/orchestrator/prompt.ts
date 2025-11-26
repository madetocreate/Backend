import { OrchestratorInput } from "./types";
import { ChatMessage } from "../chat/service";

export function buildGlobalSystemLayer(): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are the Aklow Orchestrator. You help businesses handle communication, reviews, marketing and internal workflows through a single chat interface. Always act in the interest of the tenant's business and keep outputs clear and actionable."
    }
  ];
}

export function buildTenantLayer(_input: OrchestratorInput): ChatMessage[] {
  return [];
}

export function buildChannelLayer(input: OrchestratorInput): ChatMessage[] {
  if (input.channel === "app") {
    return [
      {
        role: "system",
        content:
          "The current channel is the internal app chat. You may explain your reasoning a bit more and you can use more technical language."
      }
    ];
  }

  if (input.channel === "website") {
    return [
      {
        role: "system",
        content:
          "The current channel is the public website chat. Be concise, friendly and avoid technical details."
      }
    ];
  }

  return [];
}

export function buildRuntimeLayer(input: OrchestratorInput): ChatMessage[] {
  return [
    {
      role: "user",
      content: input.message
    }
  ];
}

export function buildMessages(input: OrchestratorInput): ChatMessage[] {
  return [
    ...buildGlobalSystemLayer(),
    ...buildTenantLayer(input),
    ...buildChannelLayer(input),
    ...buildRuntimeLayer(input)
  ];
}
