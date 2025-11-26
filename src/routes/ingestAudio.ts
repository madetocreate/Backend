import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { recordUsageEvent } from "../domain/usage/service";
import { handleIngestAudio } from "../domain/audio/service";

const IngestAudioBodySchema = z.object({
  tenantId: z.string(),
  sessionId: z.string(),
  externalId: z.string(),
  platform: z.string(),
  from: z.string(),
  audioBase64: z.string(),
  audioMimeType: z.string().min(1),
  channel: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

type IngestAudioBody = z.infer<typeof IngestAudioBodySchema>;
type IngestAudioRequest = FastifyRequest<{ Body: IngestAudioBody }>;

export async function registerIngestAudioRoutes(app: FastifyInstance) {
  app.post("/ingest/audio", async (request: IngestAudioRequest, reply) => {
    const parsed = IngestAudioBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }

    const { tenantId, externalId, platform, channel } = parsed.data;

    await recordUsageEvent({
      tenantId,
      type: "ingest_audio",
      route: "/ingest/audio",
      timestamp: new Date(),
      metadata: {
        externalId,
        platform,
        channel: channel ?? null
      }
    });

    const result = await handleIngestAudio(parsed.data);
    return result;
  });
}
