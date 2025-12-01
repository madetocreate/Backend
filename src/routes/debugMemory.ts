import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { searchMemory, setMemoryStatus } from "../domain/memory/service";

const DebugMemorySearchSchema = z.object({
  tenantId: z.string(),
  query: z.string().min(1),
  type: z
    .union([
      z.literal("business_profile"),
      z.literal("conversation_message"),
      z.literal("email"),
      z.literal("dm"),
      z.literal("review"),
      z.literal("document"),
      z.literal("custom")
    ])
    .optional(),
  limit: z.number().int().positive().max(100).optional()
});

const DebugMemoryUpdateStatusSchema = z.object({
  tenantId: z.string(),
  id: z.string(),
  status: z.union([
    z.literal("active"),
    z.literal("archived"),
    z.literal("deleted"),
    z.literal("suppressed")
  ])
});

type DebugMemorySearchBody = z.infer<typeof DebugMemorySearchSchema>;
type DebugMemoryUpdateStatusBody = z.infer<typeof DebugMemoryUpdateStatusSchema>;

type DebugMemorySearchRequest = FastifyRequest<{ Body: DebugMemorySearchBody }>;
type DebugMemoryUpdateStatusRequest = FastifyRequest<{ Body: DebugMemoryUpdateStatusBody }>;

export async function registerDebugMemoryRoutes(app: FastifyInstance) {
  app.post("/debug/memory/search", async (request: DebugMemorySearchRequest, reply: FastifyReply) => {
    const parsed = DebugMemorySearchSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, query, type, limit } = parsed.data;

    const results = await searchMemory({
      tenantId,
      query,
      type,
      limit
    });

    return {
      tenantId,
      query,
      type: type ?? null,
      limit: limit ?? 20,
      items: results.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        metadata: r.metadata ?? null,
        sourceId: r.sourceId ?? null,
        createdAt: r.createdAt.toISOString()
      }))
    };
  });

  app.post("/debug/memory/status", async (request: DebugMemoryUpdateStatusRequest, reply: FastifyReply) => {
    const parsed = DebugMemoryUpdateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, id, status } = parsed.data;
    const ok = await setMemoryStatus({ tenantId, id, status });

    if (!ok) {
      reply.code(404);
      return { error: "not_found" };
    }

    return {
      tenantId,
      id,
      status
    };
  });
}
