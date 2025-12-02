// src/agents/SupervisorAgent.ts
import { AgentRequest, AgentResponse } from "../types";
import { ResearchAgent } from "./ResearchAgent";
import { AnalysisAgent } from "./AnalysisAgent";
import { ReviewAgent } from "./ReviewAgent";

export class SupervisorAgent {
  constructor(
    private researchAgent = new ResearchAgent(),
    private analysisAgent = new AnalysisAgent(),
    private reviewAgent = new ReviewAgent() // optional Reviewer
  ) {}

  async handleRequest(userInput: string): Promise<string> {
    // 1. Analyse der Anfrage und Entscheiden, welcher Agent zuständig ist
    const taskType = this.classifyTask(userInput);
    let draftAnswer: string;

    if (taskType === "research") {
      draftAnswer = await this.researchAgent.handle(userInput);
    } else if (taskType === "analysis") {
      draftAnswer = await this.analysisAgent.handle(userInput);
    } else {
      // Fallback: z.B. Standard QnA
      draftAnswer = await this.researchAgent.handle(userInput);
    }

    // 2. Optional: Reviewer-Agent prüft den Entwurf
    const finalAnswer = await this.reviewAgent.review(userInput, draftAnswer);
    return finalAnswer;
  }

  private classifyTask(userInput: string): "research" | "analysis" {
    // Einfache Regel- oder KI-basierte Triagierung:
    if (userInput.match(/(analy(s|z)e|chart|plot|data|berechne)/i)) {
      return "analysis";
    }
    return "research";
  }
}
