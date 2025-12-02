// src/tools/WebScrapeTool.ts
import axios from "axios";
import * as cheerio from "cheerio";

export class WebScrapeTool {
  async run(url: string): Promise<string> {
    try {
      const resp = await axios.get(url, { timeout: 5000 });
      const html = resp.data;
      const $ = cheerio.load(html);
      // Alle Skripte/Style entfernen, dann Text extrahieren
      $("script, style, nav, footer").remove();
      const text = $.text();
      // Einige einfache Bereinigungen:
      return text.replace(/\s+/g, " ").trim();
    } catch (e) {
      return "";
    }
  }
}
