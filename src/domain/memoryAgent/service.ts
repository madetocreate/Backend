import { writeMemory, setMemoryStatus, searchMemory } from "../memory/service";
import type {
  MemoryItemType,
  MemoryStatus,
  MemoryMetadata
} from "../memory/types";
import { searchVectors } from "../vectorLocal/service";
import type { VectorDomain } from "../vectorLocal/types";

export type MemoryAgentWriteOperation = {
  op: "write";
  type: MemoryItemType;
  content: string;
  metadata?: Record<string, unknown>;
  sourceId?: string;
  conversationId?: string;
  messageId?: string;
  documentId?: string;
  createdAt?: string;
};

export type MemoryAgentUpdateStatusOperation = {
  op: "update_status";
  ids: string[];
  status: MemoryStatus;
};

export type MemoryAgentSearchLocalOperation = {
  op: "search_local";
  query: string;
  type?: MemoryItemType;
  projectId?: string;
  limit?: number;
};

export type MemoryAgentSearchVectorOperation = {
  op: "search_vector";
  query: string;
  domain: VectorDomain;
  topK?: number;
  minScore?: number;
  projectId?: string;
  scope?: string;
  from?: string;
  to?: string;
};

export type MemoryAgentOperation =
  | MemoryAgentWriteOperation
  | MemoryAgentUpdateStatusOperation
  | MemoryAgentSearchLocalOperation
  | MemoryAgentSearchVectorOperation;

export type MemoryAgentInput = {
  tenantId: string;
  sessionId: string;
  operations: MemoryAgentOperation[];
  channel?: string;
  metadata?: Record<string, unknown>;
};

export type MemoryAgentWriteResult = {
  op: "write";
  type: MemoryItemType;
  content: string;
  id: string | null;
  ok: boolean;
};

export type MemoryAgentUpdateStatusResult = {
  op: "update_status";
  ids: { id: string; ok: boolean }[];
  status: MemoryStatus;
};

export type MemoryAgentSearchLocalItem = {
  id: string;
  type: MemoryItemType;
  content: string;
  metadata?: MemoryMetadata;
  sourceId?: string | null;
  conversationId?: string | null;
  documentId?: string | null;
  createdAt: string;
};

export type MemoryAgentSearchLocalResult = {
  op: "search_local";
  query: string;
  type: MemoryItemType | null;
  projectId: string | null;
  limit: number;
  items: MemoryAgentSearchLocalItem[];
};

export type MemoryAgentSearchVectorItem = {
  id: string;
  sourceId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type MemoryAgentSearchVectorResult = {
  op: "search_vector";
  query: string;
  domain: VectorDomain;
  topK: number;
  minScore: number;
  items: MemoryAgentSearchVectorItem[];
};

export type MemoryAgentOperationResult =
  | MemoryAgentWriteResult
  | MemoryAgentUpdateStatusResult
  | MemoryAgentSearchLocalResult
  | MemoryAgentSearchVectorResult;

export type MemoryAgentResponse = {
  tenantId: string;
  sessionId: string;
  channel: string;
  operations: MemoryAgentOperationResult[];
};

export async function handleMemoryAgentRequest(
  input: MemoryAgentInput
): Promise<MemoryAgentResponse> {
  const results: MemoryAgentOperationResult[] = [];

  for (const op of input.operations) {
    if (op.op === "write") {
      const createdAt = op.createdAt ? new Date(op.createdAt) : new Date();
      try {
        const record = await writeMemory({
          tenantId: input.tenantId,
          type: op.type,
          content: op.content,
          metadata: op.metadata as any,
          sourceId: op.sourceId,
          conversationId: op.conversationId ?? input.sessionId,
          messageId: op.messageId,
          documentId: op.documentId,
          createdAt
        });
        results.push({
          op: "write",
          type: op.type,
          content: op.content,
          id: record ? record.id : null,
          ok: record != null
        });
      } catch {
        results.push({
          op: "write",
          type: op.type,
          content: op.content,
          id: null,
          ok: false
        });
      }
    } else if (op.op === "update_status") {
      const items: { id: string; ok: boolean }[] = [];
      for (const id of op.ids) {
        try {
          const ok = await setMemoryStatus({
            tenantId: input.tenantId,
            id,
            status: op.status
          });
          items.push({ id, ok });
        } catch {
          items.push({ id, ok: false });
        }
      }
      results.push({
        op: "update_status",
        ids: items,
        status: op.status
      });
    } else if (op.op === "search_local") {
      const limit = op.limit && op.limit > 0 && op.limit <= 500 ? op.limit : 20;
      try {
        const items = await searchMemory({
          tenantId: input.tenantId,
          query: op.query,
          type: op.type ?? null,
          limit
        });
        const filtered = op.projectId
          ? items.filter((r) => {
              const meta = r.metadata && typeof r.metadata === "object" ? (r.metadata as any) : undefined;
              return meta && meta.projectId === op.projectId;
            })
          : items;
        results.push({
          op: "search_local",
          query: op.query,
          type: op.type ?? null,
          projectId: op.projectId ?? null,
          limit,
          items: filtered.map((r) => ({
            id: r.id,
            type: r.type,
            content: r.content,
            metadata: r.metadata as MemoryMetadata | undefined,
            sourceId: r.sourceId ?? null,
            conversationId: r.conversationId ?? null,
            documentId: r.documentId ?? null,
            createdAt: r.createdAt.toISOString()
          }))
        });
      } catch {
        results.push({
          op: "search_local",
          query: op.query,
          type: op.type ?? null,
          projectId: op.projectId ?? null,
          limit,
          items: []
        });
      }
    } else if (op.op === "search_vector") {
      const topK = op.topK && op.topK > 0 && op.topK <= 50 ? op.topK : 10;
      const minScore =
        typeof op.minScore === "number" && op.minScore >= 0 && op.minScore <= 1 ? op.minScore : 0;
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      if (op.from) {
        const d = new Date(op.from);
        if (!Number.isNaN(d.getTime())) {
          fromDate = d;
        }
      }
      if (op.to) {
        const d = new Date(op.to);
        if (!Number.isNaN(d.getTime())) {
          toDate = d;
        }
      }
      try {
        const vectorResults = await searchVectors({
          tenantId: input.tenantId,
          domain: op.domain,
          query: op.query,
          topK,
          minScore,
          projectId: op.projectId,
          scope: op.scope,
          from: fromDate,
          to: toDate
        });
        results.push({
          op: "search_vector",
          query: op.query,
          domain: op.domain,
          topK,
          minScore,
          items: vectorResults.map((r) => ({
            id: r.id,
            sourceId: r.sourceId,
            content: r.content,
            score: r.score,
            metadata: r.metadata as Record<string, unknown> | undefined,
            createdAt: r.createdAt.toISOString()
          }))
        });
      } catch {
        results.push({
          op: "search_vector",
          query: op.query,
          domain: op.domain,
          topK,
          minScore,
          items: []
        });
      }
    }
  }

  const channel = input.channel ?? "agent_memory";

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    operations: results
  };
}
