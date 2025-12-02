// src/tools/WebSearchTool.ts
import axios from "axios";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchTool {
  async run(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.BING_API_KEY;
    const resp = await axios.get(
      "https://api.bing.microsoft.com/v7.0/search",
      {
        params: { q: query, mkt: "de-DE", textDecorations: false, count: 5 },
        headers: { "Ocp-Apim-Subscription-Key": apiKey }
      }
    );
    const results = resp.data.webPages?.value || [];
    // Vereinheitlichen der Ausgabe:
    return results.map((r: any) => ({
      title: r.name,
      url: r.url,
      snippet: r.snippet
    }));
  }
}
