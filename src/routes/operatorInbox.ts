import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { searchMemory } from "../domain/memory/service";
import { MemoryItemType } from "../domain/memory/types";

const defaultTypes: MemoryItemType[] = ["email", "dm", "review", "conversation_message"];

const OperatorInboxRequestSchema = z.object({
  tenantId: z.string(),
  limit: z.number().int().positive().max(100).optional(),
  types: z
    .array(
      z.union([
        z.literal("business_profile"),
        z.literal("conversation_message"),
        z.literal("email"),
        z.literal("dm"),
        z.literal("review"),
        z.literal("document"),
        z.literal("custom")
      ])
    )
    .optional()
});

type OperatorInboxRequestBody = z.infer<typeof OperatorInboxRequestSchema>;

type OperatorInboxRequest = FastifyRequest<{ Body: OperatorInboxRequestBody }>;

export async function registerOperatorInboxRoutes(app: FastifyInstance) {
  app.post("/operator/inbox", async (request: OperatorInboxRequest, reply: FastifyReply) => {
    const parsed = OperatorInboxRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId } = parsed.data;
    const limit = parsed.data.limit ?? 50;
    const types = (parsed.data.types as MemoryItemType[] | undefined) ?? defaultTypes;

    const aggregated: {
      id: string;
      type: MemoryItemType;
      content: string;
      metadata: Record<string, unknown> | null;
      sourceId: string | null;
      createdAt: string;
    }[] = [];

    for (const t of types) {
      const results = await searchMemory({
        tenantId,
        type: t,
        query: "",
        limit
      });

      for (const r of results) {
        aggregated.push({
          id: r.id,
          type: r.type,
          content: r.content,
          metadata: (r.metadata as Record<string, unknown> | undefined) ?? null,
          sourceId: (r.sourceId as string | undefined) ?? null,
          createdAt: r.createdAt.toISOString()
        });
      }
    }

    aggregated.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    const sliced = aggregated.slice(0, limit);

    return {
      tenantId,
      limit,
      types,
      items: sliced
    };
  });
}
