// src/tools/TextRankerTool.ts
export class TextRankerTool {
  async rank(
    sources: Array<{ content: string; source: string }>,
    question: string
  ): Promise<Array<{ content: string; source: string }>> {
    // Sehr rudimentär: Sortieren nach Anzahl gemeinsamer Wörter mit der Frage.
    const questionWords = question.toLowerCase().split(/\W+/);
    const scored = sources.map((src) => {
      const text = src.content.toLowerCase();
      let score = 0;
      questionWords.forEach((w) => {
        if (text.includes(w)) {
          score += 1;
        }
      });
      return { ...src, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map(({ score, ...rest }) => rest);
  }
}
