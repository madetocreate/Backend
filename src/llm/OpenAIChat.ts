// src/llm/OpenAIChat.ts
import axios from "axios";

interface ChatOptions {
  systemPrompt?: string;
  functionCalling?: boolean;
}

export class OpenAIChat {
  private systemPrompt?: string;
  private model: string;
  private functionCalling: boolean;

  constructor(options: ChatOptions = {}) {
    this.systemPrompt = options.systemPrompt;
    this.functionCalling = options.functionCalling ?? false;
    this.model = process.env.OPENAI_MODEL || "gpt-4";
  }

  async ask(userMessage: string): Promise<string> {
    const messages: any[] = [];
    if (this.systemPrompt) {
      messages.push({ role: "system", content: this.systemPrompt });
    }
    messages.push({ role: "user", content: userMessage });

    const body: any = { model: this.model, messages };

    if (this.functionCalling) {
      body.functions = []; // hier könnte man Schema definieren
      body.function_call = "auto";
    }

    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const data = resp.data;
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice.message.function_call) {
        // Hier würden wir function calling Handhaben (nicht implementiert in diesem Wrapper)
        // Z.B. könnte man anhand von choice.message.function_call.name ein passendes Tool aufrufen
      }
      return choice.message.content || "";
    }
    return "";
  }
}
