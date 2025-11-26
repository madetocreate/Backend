import { randomUUID } from "crypto";
import { openai } from "../../integrations/openai/client";
import { getChatModel } from "../../config/model";
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
  const instructions =
    "You are the analysis agent. You analyze business documents and data for the tenant. " +
    "Use the available tools to retrieve and analyze relevant information. Be precise and avoid inventing data.";
  const response = await openai.responses.create({
    model: getChatModel(),
    instructions,
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
