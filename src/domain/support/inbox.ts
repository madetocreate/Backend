import { searchMemoryRecords } from "../memory/repository";

export type SupportInboxItem = {
  id: string;
  createdAt: string;
  kind: "support_ticket" | "support_handover" | "support_label";
  priority: "low" | "normal" | "high";
  labels: string[];
  operatorTarget?: string;
  sessionId?: string;
  channel?: string;
  preview: string;
};

type SupportInboxParams = {
  tenantId: string;
  kind: "support_ticket" | "support_handover" | "support_label";
  limit: number;
  minPriority: "low" | "normal" | "high";
};

function priorityRank(p: string): number {
  if (p === "high") return 2;
  if (p === "normal") return 1;
  return 0;
}

export async function getSupportInbox(params: SupportInboxParams): Promise<SupportInboxItem[]> {
  const { tenantId, kind, limit, minPriority } = params;

  const records: any[] = await searchMemoryRecords({
    tenantId,
    query: "",
    limit: 1000
  });

  const minRank = priorityRank(minPriority);

  const mapped: any[] = records
    .map((rec: any) => {
      const metadata = (rec.metadata ?? {}) as any;
      const recordKind = metadata.kind as string | undefined;
      if (recordKind !== kind) return null;

      const priorityMeta = metadata.supportPriority as string | undefined;
      const priority: "low" | "normal" | "high" =
        priorityMeta === "high" || priorityMeta === "low" ? priorityMeta : "normal";
      const rank = priorityRank(priority);

      const labelsRaw = metadata.supportLabels;
      const labels: string[] = Array.isArray(labelsRaw)
        ? labelsRaw.map((v: any) => String(v))
        : [];

      const operatorTargetRaw = metadata.supportOperatorTarget;
      const operatorTarget =
        typeof operatorTargetRaw === "string" && operatorTargetRaw.trim().length > 0
          ? operatorTargetRaw
          : undefined;

      const createdAtValue = rec.createdAt;
      const createdAt =
        createdAtValue instanceof Date
          ? createdAtValue.toISOString()
          : String(createdAtValue);

      const sessionId =
        typeof metadata.sessionId === "string" ? metadata.sessionId : undefined;
      const channel =
        typeof metadata.channel === "string" ? metadata.channel : undefined;

      const content: string = typeof rec.content === "string" ? rec.content : "";
      const preview = content.length > 280 ? content.slice(0, 280) + "..." : content;

      return {
        id: String(rec.id),
        createdAt,
        kind: recordKind,
        priority,
        labels,
        operatorTarget,
        sessionId,
        channel,
        preview,
        _rank: rank
      };
    })
    .filter((x: any) => x !== null && x._rank >= minRank)
    .sort((a: any, b: any) => {
      if (b._rank !== a._rank) return b._rank - a._rank;
      if (b.createdAt < a.createdAt) return -1;
      if (b.createdAt > a.createdAt) return 1;
      return 0;
    })
    .slice(0, limit);

  return mapped.map((item: any) => {
    const { _rank, ...rest } = item;
    return rest as SupportInboxItem;
  });
}
