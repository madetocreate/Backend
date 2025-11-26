import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateSocialSchedule } from "../domain/social/service";

const SocialPlatformEnum = z.enum([
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "other",
]);

const SocialGoalEnum = z.enum(["brand", "launch", "evergreen", "promo", "other"]);

const SocialScheduleBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  goal: SocialGoalEnum,
  brief: z.string().min(1),
  platforms: z.array(SocialPlatformEnum).nonempty(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  postsPerWeek: z.number().int().min(1).max(50).optional(),
  timezone: z.string().optional(),
  includeCaptionIdeas: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerSocialAgentRoutes(app: FastifyInstance) {
  app.post("/agent/social/schedule", async (request, reply) => {
    const parseResult = SocialScheduleBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "invalid_request_body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await generateSocialSchedule({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      goal: body.goal,
      brief: body.brief,
      platforms: body.platforms,
      startDate: body.startDate,
      endDate: body.endDate,
      postsPerWeek: body.postsPerWeek,
      timezone: body.timezone,
      includeCaptionIdeas: body.includeCaptionIdeas,
      metadata: body.metadata,
    });

    return result;
  });
}
