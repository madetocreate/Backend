import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSupportInbox } from "../domain/support/inbox";

export function registerSupportInboxRoutes(
  app: FastifyInstance,
  _opts: unknown,
  done: () => void
) {
  const QuerySchema = z.object({
    tenantId: z.string().min(1),
    kind: z
      .enum(["support_ticket", "support_handover", "support_label"])
      .default("support_ticket"),
    limit: z.coerce.number().min(1).max(200).default(50),
    minPriority: z.enum(["low", "normal", "high"]).default("low")
  });

  app.get("/support/inbox", async (request, reply) => {
    const parsed = QuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_query" };
    }

    const { tenantId, kind, limit, minPriority } = parsed.data;

    const items = await getSupportInbox({
      tenantId,
      kind,
      limit,
      minPriority
    });

    return {
      tenantId,
      kind,
      minPriority,
      items
    };
  });

  done();
}
