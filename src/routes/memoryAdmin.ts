import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { searchMemory, setMemoryStatus } from "../domain/memory/service";

const MemorySearchSchema = z.object({
  tenantId: z.string(),
  query: z.string().optional(),
  type: z
    .union([
      z.literal("business_profile"),
      z.literal("conversation_message"),
      z.literal("conversation_summary"),
      z.literal("email"),
      z.literal("dm"),
      z.literal("review"),
      z.literal("document"),
      z.literal("custom")
    ])
    .optional(),
  projectId: z.string().optional(),
  limit: z.number().int().positive().max(500).optional()
});

const MemoryStatusBulkSchema = z.object({
  tenantId: z.string(),
  ids: z.array(z.string()).min(1),
  status: z.union([
    z.literal("active"),
    z.literal("archived"),
    z.literal("deleted"),
    z.literal("suppressed")
  ])
});

type MemorySearchBody = z.infer<typeof MemorySearchSchema>;
type MemoryStatusBulkBody = z.infer<typeof MemoryStatusBulkSchema>;

type MemorySearchRequest = FastifyRequest<{ Body: MemorySearchBody }>;
type MemoryStatusBulkRequest = FastifyRequest<{ Body: MemoryStatusBulkBody }>;

export async function registerMemoryAdminRoutes(app: FastifyInstance) {
  app.post("/admin/memory/search", async (request: MemorySearchRequest, reply: FastifyReply) => {
    const parsed = MemorySearchSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, query, type, projectId, limit } = parsed.data;

    const effectiveQuery = typeof query === "string" ? query : "";
    const items = await searchMemory({
      tenantId,
      query: effectiveQuery,
      type: type ?? null,
      limit: limit ?? 100
    });

    const filtered = projectId
      ? items.filter((r) => {
          const meta = r.metadata && typeof r.metadata === "object" ? (r.metadata as any) : undefined;
          return meta && meta.projectId === projectId;
        })
      : items;

    return {
      tenantId,
      query: effectiveQuery,
      type: type ?? null,
      projectId: projectId ?? null,
      limit: limit ?? 100,
      items: filtered.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        metadata: r.metadata ?? null,
        sourceId: r.sourceId ?? null,
        conversationId: r.conversationId ?? null,
        documentId: r.documentId ?? null,
        createdAt: r.createdAt.toISOString()
      }))
    };
  });

  app.post("/admin/memory/status/bulk", async (request: MemoryStatusBulkRequest, reply: FastifyReply) => {
    const parsed = MemoryStatusBulkSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, ids, status } = parsed.data;
    const results: { id: string; ok: boolean }[] = [];

    for (const id of ids) {
      try {
        const ok = await setMemoryStatus({ tenantId, id, status });
        results.push({ id, ok });
      } catch {
        results.push({ id, ok: false });
      }
    }

    return {
      tenantId,
      status,
      results
    };
  });
}
