// src/agents/ResearchAgent.ts
import { WebSearchTool } from "../tools/WebSearchTool";
import { WebScrapeTool } from "../tools/WebScrapeTool";
import { TextRankerTool } from "../tools/TextRankerTool";
import { OpenAIChat } from "../llm/OpenAIChat"; // Wrapper für OpenAI API

export class ResearchAgent {
  private search = new WebSearchTool();
  private scrape = new WebScrapeTool();
  private ranker = new TextRankerTool();
  private llm = new OpenAIChat({
    systemPrompt:
      "Du bist ein Research-Agent, der präzise Antworten mit Quellen liefert."
  });

  async handle(question: string): Promise<string> {
    // 1. Query planen/aufteilen (einfach: identisch zur Frage, könnte komplexer sein)
    const queries = [question];
    let allSources: Array<{ content: string; source: string }> = [];

    for (const q of queries) {
      const results = await this.search.run(q);
      const topLinks = results.slice(0, 3); // top 3 Links
      for (const link of topLinks) {
        const pageText = await this.scrape.run(link.url);
        allSources.push({ content: pageText, source: link.url });
      }
    }

    // 2. Ranking der gesammelten Texte nach Relevanz
    allSources = await this.ranker.rank(allSources, question);

    // 3. LLM die Antwort schreiben lassen mit Verwendung der wichtigsten Quellen
    const context = allSources
      .slice(0, 5)
      .map((src) => src.content)
      .join("\n----\n");

    const answer = await this.llm.ask(
      `${context}\nFrage: ${question}\nBitte beantworte mit Belegen aus den obigen Quellen.`
    );

    // 4. Quellenangaben anhängen
    const citedAnswer = this.attachSources(answer, allSources.slice(0, 5));
    return citedAnswer;
  }

  private attachSources(
    answer: string,
    usedSources: Array<{ source: string }>
  ): string {
    // Sehr einfach: alle verwendeten Quellen verlinken oder referenzieren
    return (
      answer +
      "\n\nQuellen:\n" +
      usedSources.map((s) => `- ${s.source}`).join("\n")
    );
  }
}
