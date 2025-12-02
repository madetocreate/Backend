// src/agents/ReviewAgent.ts
import { OpenAIChat } from "../llm/OpenAIChat";
import { OutputGuardrail } from "../guardrails/OutputGuardrail";

export class ReviewAgent {
  private judgeLLM = new OpenAIChat({
    systemPrompt:
      'Du bist ein KI-Reviewer. Deine Aufgabe ist, die Antworten eines Agenten auf Sicherheit, Richtlinien und Richtigkeit zu prüfen. Antworte nur mit "OK" oder liefere Korrekturen.'
  });

  private outputGuard = new OutputGuardrail();

  async review(userInput: string, agentAnswer: string): Promise<string> {
    // 1. Automatische Guardrails-Validierung (schnell, regelbasiert)
    if (!this.outputGuard.validate(agentAnswer)) {
      // Wenn Guardrail etwas sehr Kritisches findet:
      return "Entschuldigung, ich kann diese Anfrage nicht beantworten (Policy).";
    }

    // 2. LLM-basierte Review
    const reviewPrompt = `Frage: ${userInput}\nAgent-Antwort: ${agentAnswer}\n\nBitte prüfe:\n- Enthält die Antwort verbotene oder sensible Inhalte?\n- Ist sie konsistent mit der Frage und wahrheitsgetreu?\nAntworte mit "OK" oder verbessere.`;
    const critique = await this.judgeLLM.ask(reviewPrompt);

    if (
      critique.trim().toUpperCase() === "OK" ||
      critique.toLowerCase().includes("alles in ordnung")
    ) {
      return agentAnswer; // Antwort ist in Ordnung
    } else {
      // Falls der Reviewer Korrekturen vorschlägt, diese nutzen
      return critique;
    }
  }
}
