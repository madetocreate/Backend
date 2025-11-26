import { FastifyInstance, FastifyRequest } from "fastify";
import { IngestReviewBodySchema, IngestReviewBody } from "../domain/ingest/schema";
import { recordUsageEvent } from "../domain/usage/service";
import { writeMemory } from "../domain/memory/service";
import { mapReviewToMemory } from "../domain/memory/memoryMapping";

type IngestReviewRequest = FastifyRequest<{ Body: IngestReviewBody }>;

export async function registerIngestReviewRoutes(app: FastifyInstance) {
  app.post("/ingest/review", async (request: IngestReviewRequest, reply) => {
    const parsed = IngestReviewBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, externalId, sourcePlatform, rating, authorName, body, createdAt, metadata } = parsed.data;

    await recordUsageEvent({
      tenantId,
      type: "ingest_review",
      route: "/ingest/review",
      timestamp: new Date(),
      metadata: {
        externalId,
        sourcePlatform
      }
    });

    await writeMemory(mapReviewToMemory(parsed.data));

    return {
      status: "accepted",
      type: "review",
      tenantId,
      normalized: {
        externalId,
        sourcePlatform,
        rating,
        authorName: authorName ?? null,
        body,
        createdAt: createdAt ?? null,
        metadata: metadata ?? null
      }
    };
  });
}
