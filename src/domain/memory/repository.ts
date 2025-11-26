import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import { LocalMemoryRecord, MemorySearchRequest, MemorySearchResult, MemoryWriteRequest } from "./types";

const memoryDir = path.join(os.homedir(), "Documents", "Backend-Data");
const memoryFilePath = path.join(memoryDir, "memory.jsonl");

const localMemory: LocalMemoryRecord[] = [];

function ensureMemoryDir() {
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
}

function loadPersistentMemory() {
  try {
    ensureMemoryDir();
    if (!fs.existsSync(memoryFilePath)) {
      return;
    }
    const raw = fs.readFileSync(memoryFilePath, "utf-8");
    if (!raw.trim()) {
      return;
    }
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as any;
        if (
          parsed &&
          typeof parsed.id === "string" &&
          typeof parsed.tenantId === "string" &&
          typeof parsed.type === "string" &&
          typeof parsed.content === "string" &&
          typeof parsed.createdAt === "string"
        ) {
          const record: LocalMemoryRecord = {
            id: parsed.id,
            tenantId: parsed.tenantId,
            type: parsed.type,
            content: parsed.content,
            metadata: parsed.metadata ?? undefined,
            sourceId: parsed.sourceId ?? undefined,
            conversationId: parsed.conversationId ?? undefined,
            messageId: parsed.messageId ?? undefined,
            documentId: parsed.documentId ?? undefined,
            createdAt: new Date(parsed.createdAt)
          };
          localMemory.push(record);
        }
      } catch {
      }
    }
  } catch {
  }
}

function appendPersistentRecord(record: LocalMemoryRecord) {
  try {
    ensureMemoryDir();
    const line = JSON.stringify({
      id: record.id,
      tenantId: record.tenantId,
      type: record.type,
      content: record.content,
      metadata: record.metadata ?? null,
      sourceId: record.sourceId ?? null,
      conversationId: record.conversationId ?? null,
      messageId: record.messageId ?? null,
      documentId: record.documentId ?? null,
      createdAt: record.createdAt.toISOString()
    });
    fs.appendFileSync(memoryFilePath, line + "\n", "utf-8");
  } catch {
  }
}

loadPersistentMemory();

export function createMemoryRecordFromWriteRequest(
  request: MemoryWriteRequest,
  text: string,
  createdAt: Date
): LocalMemoryRecord {
  return {
    id: randomUUID(),
    tenantId: request.tenantId,
    type: request.type,
    content: text,
    metadata: request.metadata,
    sourceId: request.sourceId,
    conversationId: request.conversationId,
    messageId: request.messageId,
    documentId: request.documentId,
    createdAt
  };
}

export function saveMemoryRecord(record: LocalMemoryRecord) {
  localMemory.push(record);
  appendPersistentRecord(record);
}

export async function searchMemoryRecords(request: MemorySearchRequest): Promise<MemorySearchResult[]> {
  const { tenantId, type, query, limit = 20 } = request;
  const q = query.toLowerCase();
  const results: MemorySearchResult[] = [];

  for (const record of localMemory) {
    if (record.tenantId !== tenantId) {
      continue;
    }
    if (type && record.type !== type) {
      continue;
    }
    if (q && !record.content.toLowerCase().includes(q)) {
      if (q.length > 0) {
        continue;
      }
    }
    results.push({
      id: record.id,
      tenantId: record.tenantId,
      type: record.type,
      content: record.content,
      createdAt: record.createdAt,
      metadata: record.metadata,
      sourceId: record.sourceId,
      score: undefined
    });
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
