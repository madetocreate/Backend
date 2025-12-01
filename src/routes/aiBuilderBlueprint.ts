import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createBlueprintForKasten } from "../domain/aiBuilderAgent/blueprintService";

const TrackEnum = z.enum(["marketing", "automation", "fun", "custom"]);
const AudienceEnum = z.enum(["business", "private", "mixed"]);

const StateSchema = z.object({
  track: TrackEnum.optional(),
  audience: AudienceEnum.optional(),
  goals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const BodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  channel: z.string().optional(),
  idea: z.string().optional(),
  state: StateSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerAiBuilderBlueprintRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post("/agent/ai_builder_agent/blueprint", async (request, reply) => {
    const parsed = BodySchema.safeParse(request.body);

    if (!parsed.success) {
      reply.status(400);
      return {
        error: "Invalid request body",
        details: parsed.error.flatten(),
      };
    }

    const body = parsed.data;

    const result = await createBlueprintForKasten({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      channel: (body.channel ?? "app") as any,
      idea: body.idea,
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
    });

    return result;
  });
}
