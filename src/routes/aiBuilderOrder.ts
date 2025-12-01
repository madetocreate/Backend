import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createWunschOrder } from "../domain/aiBuilderAgent/orderService";

const TrackEnum = z.enum(["marketing", "automation", "fun", "custom"]);
const AudienceEnum = z.enum(["business", "private", "mixed"]);

const StateSchema = z.object({
  track: TrackEnum.optional(),
  audience: AudienceEnum.optional(),
  goals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const OfferSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priceHint: z.string().optional(),
  deliveryTimeHint: z.string().optional(),
  tier: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const TriggerSchema = z.object({
  type: z.string().min(1),
  source: z.string().optional(),
  event: z.string().optional(),
  schedule: z
    .object({
      cron: z.string().optional(),
      frequency: z.string().optional(),
      timeOfDay: z.string().optional(),
    })
    .optional(),
  conditions: z.array(z.string()).optional(),
});

const ActionSchema = z.object({
  id: z.string().min(1),
  kind: z.string().optional(),
  channel: z.string().optional(),
  description: z.string().min(1),
  requiresHumanReview: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const BlueprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  audience: AudienceEnum.optional(),
  track: TrackEnum.optional(),
  goals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  trigger: TriggerSchema,
  actions: z.array(ActionSchema),
  estimatedComplexity: z.string().optional(),
  estimatedSystems: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const OrderBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  offer: OfferSchema,
  blueprintSummary: z.string().optional(),
  blueprint: BlueprintSchema.optional(),
  state: StateSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerAiBuilderOrderRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post("/agent/ai_builder_agent/order", async (request, reply) => {
    const parsed = OrderBodySchema.safeParse(request.body);

    if (!parsed.success) {
      reply.status(400);
      return {
        error: "Invalid request body",
        details: parsed.error.flatten(),
      };
    }

    const body = parsed.data;

    const order = await createWunschOrder({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      audience: body.state?.audience as any,
      track: body.state?.track as any,
      offer: body.offer as any,
      blueprintSummary: body.blueprintSummary,
      stateSnapshot: body.state
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
      blueprint: body.blueprint as any,
      metadata: body.metadata,
    });

    return order;
  });
}
