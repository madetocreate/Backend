import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleWunschkastenStep } from "../domain/wunschkasten/service";

const TrackEnum = z.enum(["marketing", "automation", "fun", "custom"]);
const AudienceEnum = z.enum(["business", "private", "mixed"]);

const WunschkastenStateSchema = z.object({
  track: TrackEnum.optional(),
  audience: AudienceEnum.optional(),
  goals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const WunschkastenBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  channel: z.string().optional(),
  action: z.enum(["message", "pill", "card"]),
  message: z.string().optional(),
  selectedPillId: z.string().optional(),
  selectedCardId: z.string().optional(),
  state: WunschkastenStateSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerWunschkastenAgentRoutes(app: FastifyInstance): Promise<void> {
  app.post("/agent/wunschkasten/step", async (request, reply) => {
    const parseResult = WunschkastenBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await handleWunschkastenStep({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      channel: body.channel ?? "app",
      action: body.action,
      message: body.message,
      selectedPillId: body.selectedPillId,
      selectedCardId: body.selectedCardId,
      state: body.state
        ? {
            tenantId: body.tenantId as any,
            sessionId: body.sessionId,
            track: body.state.track,
            audience: body.state.audience,
            goals: body.state.goals,
            platforms: body.state.platforms,
            metadata: body.state.metadata,
          }
        : undefined,
      metadata: body.metadata,
    });

    return result;
  });
}
