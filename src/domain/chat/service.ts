import { openai } from "../../integrations/openai/client";
import { env } from "../../config/env";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type RunChatRawParams = {
  messages: ChatMessage[];
  stream: boolean;
};

export async function runChatRaw(params: RunChatRawParams) {
  const model = env.OPENAI_MODEL || "gpt-4o-mini";

  if (params.stream) {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: params.messages
    });
    return { stream };
  }

  const completion = await openai.chat.completions.create({
    model,
    stream: false,
    messages: params.messages
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return { content };
}
