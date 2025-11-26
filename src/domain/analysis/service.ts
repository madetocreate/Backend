import { randomUUID } from "crypto";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import { uploadDocumentFileToVectorStores, getVectorStoreId } from "../vector/service";
import { writeMemory } from "../memory/service";

export type AnalysisUploadInput = {
  tenantId: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  contentBase64: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type AnalysisUploadResult = {
  tenantId: string;
  sessionId: string;
  documentId: string;
  fileName: string;
  fileType: string;
  globalStoreId: string;
  documentStoreId: string;
  globalFileId: string;
  documentFileId: string;
  summary: string;
  status: "stored";
};

export type AnalysisQueryInput = {
  tenantId: string;
  sessionId: string;
  message: string;
};

export type AnalysisQueryResult = {
  tenantId: string;
  sessionId: string;
  content: string;
};

const ANALYSIS_AGENT_SYSTEM_PROMPT = `
Du bist der Analyse-Agent von Aklow.

Deine Aufgabe:
Du analysierst Dateien und Daten eines bestimmten Unternehmens (Tenant). Dazu gehören zum Beispiel:
- PDFs (Rechnungen, Berichte, Verträge, Präsentationen)
- Textdokumente
- Tabellen oder Export-Dateien (zum Beispiel CSV, Reports)

Du arbeitest nicht als allgemeiner Chatbot, sondern als fokussierter Analyse-Assistent für Business-Dokumente.

Werkzeuge:
- Du kannst auf die Dokumente des Tenants in Vector Stores zugreifen, um relevante Inhalte zu finden.
- Du kannst Analyse-Werkzeuge nutzen, um mit Zahlen und Tabellen zu arbeiten.

Wichtige Regeln:
1. Arbeite nur auf Basis der vorhandenen Daten.
   Erfinde keine Zahlen, Fakten oder Inhalte.
   Wenn Informationen fehlen oder unklar sind, sage das explizit.

2. Sprache und Stil:
   Antworte immer in der Sprache der Nutzereingabe (wenn der Nutzer auf Deutsch schreibt, antworte auf Deutsch).
   Schreibe klar, verständlich und sachlich, ohne Marketing-Sprache.

3. Zahlen und Struktur:
   Wenn du mit Beträgen, Mengen, Zeiträumen oder Kategorien arbeitest, strukturiere deine Antwort:
   - Nutze Listen oder einfache Tabellen, wenn es um Zahlen geht.
   - Nenne wichtige Annahmen (zum Beispiel: "Alle Beträge in EUR", "Zeitraum laut Daten: Januar bis März 2025").

4. Transparenz:
   Wenn eine Frage mit den vorhandenen Dokumenten nicht beantwortet werden kann, erkläre:
   - welche Informationen fehlen,
   - was du stattdessen sinnvoll analysieren kannst.
   Vermeide vage oder spekulative Aussagen.

5. Kontext der Anfrage:
   Die Nutzereingabe kann eine Analyse-Frage enthalten (zum Beispiel "Analysiere alle Kassenzettel im März").
   Wenn im Text zusätzliche Filter beschrieben sind (wie Tags, Zeitraum, Dokumenttypen), halte dich strikt daran.

Typische Aufgaben:
- Kassenbelege nach Kategorien und Zeiträumen auswerten (zum Beispiel: welche Kostenblöcke sind am größten).
- Monatsberichte vergleichen (Umsatz, Kosten, Marge, Trends).
- Verträge, AGB oder Angebote zusammenfassen und wichtige Risiken oder Fristen hervorheben.
- Lange PDFs in kurze, strukturierte Zusammenfassungen zerlegen.

Dein Ziel:
Gib dem Nutzer eine präzise, strukturierte und ehrliche Auswertung seiner Dokumente, ohne Dinge zu erfinden. Wenn du dir bei etwas unsicher bist, benenne diese Unsicherheit klar.
`;

export async function handleAnalysisUpload(input: AnalysisUploadInput): Promise<AnalysisUploadResult> {
  const buffer = Buffer.from(input.contentBase64, "base64");
  const uploadResult = await uploadDocumentFileToVectorStores(
    input.tenantId,
    buffer,
    input.fileName,
    input.fileType
  );
  const documentId = randomUUID();
  const summary = "Uploaded document: " + input.fileName;
  await writeMemory({
    tenantId: input.tenantId,
    type: "document",
    content: summary,
    metadata: {
      fileName: input.fileName,
      fileType: input.fileType,
      tags: input.tags ?? [],
      source: input.metadata && (input.metadata as any).source ? (input.metadata as any).source : "upload",
      globalStoreId: uploadResult.globalStoreId,
      documentStoreId: uploadResult.documentStoreId,
      globalFileId: uploadResult.globalFileId,
      documentFileId: uploadResult.documentFileId
    },
    documentId,
    conversationId: input.sessionId,
    createdAt: new Date()
  });
  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    documentId,
    fileName: input.fileName,
    fileType: input.fileType,
    globalStoreId: uploadResult.globalStoreId,
    documentStoreId: uploadResult.documentStoreId,
    globalFileId: uploadResult.globalFileId,
    documentFileId: uploadResult.documentFileId,
    summary,
    status: "stored"
  };
}

export async function handleAnalysisQuery(input: AnalysisQueryInput): Promise<AnalysisQueryResult> {
  const vectorStoreId = await getVectorStoreId(input.tenantId);
  const response = await openai.responses.create({
    model: getSummaryModel(),
    instructions: ANALYSIS_AGENT_SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: input.message
      }
    ],
    tools: [
      { type: "file_search", vector_store_ids: [vectorStoreId] },
      { type: "code_interpreter", container: { type: "auto" } }
    ]
  });
  const content = response.output_text;
  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    content
  };
}
