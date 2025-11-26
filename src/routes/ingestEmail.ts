import { FastifyInstance, FastifyRequest } from "fastify";
import { IngestEmailBodySchema, IngestEmailBody } from "../domain/ingest/schema";
import { recordUsageEvent } from "../domain/usage/service";
import { writeMemory } from "../domain/memory/service";
import { mapEmailToMemory } from "../domain/memory/memoryMapping";

type IngestEmailRequest = FastifyRequest<{ Body: IngestEmailBody }>;

export async function registerIngestEmailRoutes(app: FastifyInstance) {
  app.post("/ingest/email", async (request: IngestEmailRequest, reply) => {
    const parsed = IngestEmailBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, externalId, from, to, subject, body, channel, metadata } = parsed.data;

    await recordUsageEvent({
      tenantId,
      type: "ingest_email",
      route: "/ingest/email",
      timestamp: new Date(),
      metadata: {
        externalId,
        channel: channel ?? null
      }
    });

    await writeMemory(mapEmailToMemory(parsed.data));

    return {
      status: "accepted",
      type: "email",
      tenantId,
      normalized: {
        externalId,
        from,
        to,
        subject: subject ?? null,
        body,
        channel: channel ?? null,
        metadata: metadata ?? null
      }
    };
  });
}
