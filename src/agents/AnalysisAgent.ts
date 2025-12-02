// src/agents/AnalysisAgent.ts
import { CodeExecTool } from "../tools/CodeExecTool";
import { OpenAIChat } from "../llm/OpenAIChat";

export class AnalysisAgent {
  private coder = new CodeExecTool();
  private llm = new OpenAIChat({
    systemPrompt:
      "Du bist ein Analyse-Agent. Du kannst Python-Code schreiben, um Berechnungen oder Datenanalysen durchzuführen. Gib deinen Code in Markdown-Fenced-Blocks zurück.",
    functionCalling: false // wir nutzen Code via markdown
  });

  async handle(taskDescription: string): Promise<string> {
    // LLM bitten, Python-Code für die Aufgabe zu generieren:
    const planPrompt = `Aufgabe: ${taskDescription}\nLöse dies schrittweise mit Python-Code (Datenauswertung, Plotting etc.). Gib nur Code aus.`;
    const code = await this.llm.ask(planPrompt);

    // Code aus dem LLM extrahieren (z.B. falls Markdowns enthalten sind)
    const codeBlock = this.extractCodeBlock(code);
    if (!codeBlock) {
      throw new Error("AnalysisAgent: kein Code erhalten");
    }

    // Code in sicherer Sandbox ausführen:
    const execResult = await this.coder.run(codeBlock);

    // Falls der Code eine Datei (z.B. Plot.png) erzeugt hat, könnte CodeExecTool z.B. einen Link oder Pfad zurückgeben
    // Zusammenbauen der Ergebnisnachricht:
    let resultMessage = "";
    if (execResult.stdout) {
      resultMessage += "Output:\n" + execResult.stdout;
    }
    if (execResult.imagePath) {
      resultMessage += `\nEin Diagramm wurde erstellt: ${execResult.imagePath}`;
    }
    if (execResult.error) {
      resultMessage += "\nFehler:\n" + execResult.error;
    }
    return resultMessage;
  }

  private extractCodeBlock(llmAnswer: string): string {
    const regex = /```(?:python)?\n([\s\S]*?)```/;
    const match = llmAnswer.match(regex);
    return match ? match[1] : llmAnswer; // falls kein Markdown, ganzen Text nehmen
  }
}
