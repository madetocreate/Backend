import { FastifyInstance, FastifyRequest } from "fastify";
import { IngestDmBodySchema, IngestDmBody } from "../domain/ingest/schema";
import { recordUsageEvent } from "../domain/usage/service";
import { writeMemory } from "../domain/memory/service";
import { mapDmToMemory } from "../domain/memory/memoryMapping";

type IngestDmRequest = FastifyRequest<{ Body: IngestDmBody }>;

export async function registerIngestDmRoutes(app: FastifyInstance) {
  app.post("/ingest/dm", async (request: IngestDmRequest, reply) => {
    const parsed = IngestDmBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, externalId, platform, from, to, body, channel, metadata } = parsed.data;

    await recordUsageEvent({
      tenantId,
      type: "ingest_dm",
      route: "/ingest/dm",
      timestamp: new Date(),
      metadata: {
        externalId,
        platform,
        channel: channel ?? null
      }
    });

    await writeMemory(mapDmToMemory(parsed.data));

    return {
      status: "accepted",
      type: "dm",
      tenantId,
      normalized: {
        externalId,
        platform,
        from,
        to: to ?? null,
        body,
        channel: channel ?? null,
        metadata: metadata ?? null
      }
    };
  });
}
