import { randomUUID } from "crypto";
import { openai } from "../../integrations/openai/client";
import type { LocalMemoryRecord, MemoryItemType } from "../memory/types";
import { insertVectorRow, getVectorsForTenantAndDomain } from "./repository";
import type { VectorDomain, VectorRecord, VectorSearchResult } from "./types";
import type { VectorDbRow } from "./repository";

const EMBEDDING_MODEL = "text-embedding-3-large";

function encodeEmbedding(values: number[]): Buffer {
  const floatArray = new Float32Array(values);
  return Buffer.from(floatArray.buffer);
}

function decodeEmbedding(buffer: Buffer): number[] {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  const floatArray = new Float32Array(arrayBuffer);
  return Array.from(floatArray);
}

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("No embedding returned from OpenAI");
  }

  return response.data[0].embedding;
}

export async function indexVectorRecord(params: {
  tenantId: string;
  domain: VectorDomain;
  sourceType: "memory" | "file";
  sourceId: string;
  content: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  embeddingOverride?: number[];
}): Promise<VectorRecord> {
  const embedding =
    params.embeddingOverride ?? (await embedText(params.content));

  const id = randomUUID();
  const createdAt = params.createdAt ?? new Date();
  const chunkIndex = params.chunkIndex ?? 0;
  const metadataJson = params.metadata
    ? JSON.stringify(params.metadata)
    : null;

  insertVectorRow({
    id,
    tenantId: params.tenantId,
    domain: params.domain,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    chunkIndex,
    embedding: encodeEmbedding(embedding),
    content: params.content,
    metadataJson,
    createdAt: createdAt.toISOString()
  });

  return {
    id,
    tenantId: params.tenantId,
    domain: params.domain,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    chunkIndex,
    content: params.content,
    metadata: params.metadata,
    createdAt,
    embedding
  };
}

function mapMemoryTypeToDomain(type: MemoryItemType): VectorDomain | null {
  if (type === "business_profile") {
    return "business_profile";
  }
  if (type === "document") {
    return "documents";
  }
  if (type === "email") {
    return "emails";
  }
  if (type === "dm") {
    return "emails";
  }
  if (type === "review") {
    return "reviews";
  }
  if (type === "conversation_message" || type === "conversation_summary") {
    return "conversation";
  }
  if (type === "custom") {
    return "generic";
  }
  return null;
}

function chunkText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  if (!remaining) {
    return chunks;
  }
  const minSplit = Math.floor(maxLen * 0.5);

  while (remaining.length > maxLen) {
    let breakIndex = remaining.lastIndexOf("\n\n", maxLen);
    if (breakIndex < minSplit) {
      breakIndex = remaining.lastIndexOf("\n", maxLen);
    }
    if (breakIndex < minSplit) {
      breakIndex = maxLen;
    }
    const chunk = remaining.slice(0, breakIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(breakIndex).trim();
    if (!remaining) {
      break;
    }
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export async function indexMemoryForTenant(
  record: LocalMemoryRecord
): Promise<void> {
  const domain = mapMemoryTypeToDomain(record.type);
  if (!domain) {
    return;
  }

  const baseMetadata: Record<string, unknown> = {
    type: record.type,
    sourceId: record.sourceId ?? null,
    conversationId: record.conversationId ?? null,
    messageId: record.messageId ?? null,
    documentId: record.documentId ?? null,
    ...(record.metadata ?? {})
  };

  const content = record.content ?? "";
  const MAX_CHUNK_LEN = 1500;

  if (content.length <= MAX_CHUNK_LEN) {
    await indexVectorRecord({
      tenantId: record.tenantId,
      domain,
      sourceType: "memory",
      sourceId: record.id,
      content,
      chunkIndex: 0,
      metadata: baseMetadata,
      createdAt: record.createdAt
    });
    return;
  }

  const chunks = chunkText(content, MAX_CHUNK_LEN);
  let idx = 0;
  for (const chunk of chunks) {
    const metadata = {
      ...baseMetadata,
      chunkIndex: idx
    };
    await indexVectorRecord({
      tenantId: record.tenantId,
      domain,
      sourceType: "memory",
      sourceId: record.id,
      content: chunk,
      chunkIndex: idx,
      metadata,
      createdAt: record.createdAt
    });
    idx++;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding length mismatch");
  }

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }

  if (na === 0 || nb === 0) {
    return 0;
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function isVectorExpired(
  metadata: Record<string, unknown> | undefined,
  createdAt: Date
): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const meta = metadata as any;
  const now = new Date();

  if (typeof meta.expiresAt === "string") {
    const d = new Date(meta.expiresAt);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now.getTime()) {
      return true;
    }
  }

  if (typeof meta.ttlSeconds === "number" && Number.isFinite(meta.ttlSeconds) && meta.ttlSeconds > 0) {
    const expiresAtMs = createdAt.getTime() + meta.ttlSeconds * 1000;
    if (expiresAtMs <= now.getTime()) {
      return true;
    }
  }

  return false;
}

export async function searchVectors(params: {
  tenantId: string;
  domain: VectorDomain;
  query: string;
  topK?: number;
  minScore?: number;
  projectId?: string;
  scope?: string;
  from?: Date;
  to?: Date;
}): Promise<VectorSearchResult[]> {
  const topK = params.topK ?? 8;
  const minScore = params.minScore ?? 0;
  const projectIdFilter = params.projectId;
  const scopeFilter = params.scope;
  const from = params.from;
  const to = params.to;

  const queryEmbedding = await embedText(params.query);
  const rows = getVectorsForTenantAndDomain(
    params.tenantId,
    params.domain
  );

  const rawResults: VectorSearchResult[] = rows.map((row: VectorDbRow) => {
    const embedding = decodeEmbedding(row.embedding);
    const metadata = row.metadata
      ? (JSON.parse(row.metadata) as Record<string, unknown>)
      : undefined;
    const score = cosineSimilarity(queryEmbedding, embedding);

    return {
      id: row.id,
      tenantId: row.tenant_id,
      domain: row.domain as VectorDomain,
      sourceType: row.source_type as "memory" | "file",
      sourceId: row.source_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      metadata,
      createdAt: new Date(row.created_at),
      embedding,
      score
    };
  });

  const filtered = rawResults.filter((r) => {
    const status =
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as any).status
        : undefined;
    if (status === "deleted" || status === "suppressed") {
      return false;
    }
    if (isVectorExpired(r.metadata as Record<string, unknown> | undefined, r.createdAt)) {
      return false;
    }
    if (projectIdFilter) {
      const meta = r.metadata as any;
      if (!meta || meta.projectId !== projectIdFilter) {
        return false;
      }
    }
    if (scopeFilter) {
      const meta = r.metadata as any;
      if (!meta || meta.scope !== scopeFilter) {
        return false;
      }
    }
    if (from && r.createdAt.getTime() < from.getTime()) {
      return false;
    }
    if (to && r.createdAt.getTime() > to.getTime()) {
      return false;
    }
    return r.score >= minScore;
  });

  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, topK);
}

export async function searchVectorsMultiDomain(params: {
  tenantId: string;
  domains: VectorDomain[];
  query: string;
  topKPerDomain?: number;
  minScore?: number;
  projectId?: string;
  scope?: string;
  from?: Date;
  to?: Date;
}): Promise<VectorSearchResult[]> {
  const all: VectorSearchResult[] = [];
  const topKPerDomain = params.topKPerDomain ?? 8;

  for (const domain of params.domains) {
    const domainResults = await searchVectors({
      tenantId: params.tenantId,
      domain,
      query: params.query,
      topK: topKPerDomain,
      minScore: params.minScore,
      projectId: params.projectId,
      scope: params.scope,
      from: params.from,
      to: params.to
    });
    all.push(...domainResults);
  }

  all.sort((a, b) => b.score - a.score);
  return all;
}
