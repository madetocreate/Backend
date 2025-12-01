import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleMemoryAgentRequest } from "../domain/memoryAgent/service";

const MemoryItemTypeEnum = z.enum([
  "business_profile",
  "conversation_message",
  "conversation_summary",
  "email",
  "dm",
  "review",
  "document",
  "custom"
]);

const MemoryStatusEnum = z.enum([
  "active",
  "archived",
  "deleted",
  "suppressed"
]);

const VectorDomainEnum = z.enum([
  "business_profile",
  "documents",
  "emails",
  "reviews",
  "social_posts",
  "conversation",
  "generic"
]);

const WriteOperationSchema = z.object({
  op: z.literal("write"),
  type: MemoryItemTypeEnum,
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  sourceId: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  documentId: z.string().optional(),
  createdAt: z.string().optional()
});

const UpdateStatusOperationSchema = z.object({
  op: z.literal("update_status"),
  ids: z.array(z.string().min(1)).min(1),
  status: MemoryStatusEnum
});

const SearchLocalOperationSchema = z.object({
  op: z.literal("search_local"),
  query: z.string().min(1),
  type: MemoryItemTypeEnum.optional(),
  projectId: z.string().optional(),
  limit: z.number().int().positive().max(500).optional()
});

const SearchVectorOperationSchema = z.object({
  op: z.literal("search_vector"),
  query: z.string().min(1),
  domain: VectorDomainEnum,
  topK: z.number().int().positive().max(50).optional(),
  minScore: z.number().min(0).max(1).optional(),
  projectId: z.string().optional(),
  scope: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

const MemoryAgentBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  operations: z
    .array(
      z.union([
        WriteOperationSchema,
        UpdateStatusOperationSchema,
        SearchLocalOperationSchema,
        SearchVectorOperationSchema
      ])
    )
    .min(1),
  channel: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export function registerMemoryAgentRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  app.post("/agent/memory/manage", async (request, reply) => {
    const parsed = MemoryAgentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const result = await handleMemoryAgentRequest(parsed.data);
    return result;
  });
  done();
}
