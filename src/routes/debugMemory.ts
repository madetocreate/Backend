import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { searchMemory } from "../domain/memory/service";
import { MemoryItemType } from "../domain/memory/types";

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

type DebugMemorySearchBody = z.infer<typeof DebugMemorySearchSchema>;

type DebugMemorySearchRequest = FastifyRequest<{ Body: DebugMemorySearchBody }>;

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
        sourceId: r.sourceId ?? null
      }))
    };
  });
}
