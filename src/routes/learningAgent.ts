import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { generateLearningContent } from "../domain/learning/service";
import type { LearningMode, LearningDifficulty } from "../domain/learning/types";

const LearningBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  mode: z.enum(["summary", "lesson", "quiz", "flashcards"]).default("lesson"),
  message: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  questionCount: z.number().int().min(1).max(50).optional(),
  tags: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.unknown()).optional()
});

type LearningBody = {
  tenantId: string;
  sessionId: string;
  mode: LearningMode;
  message: string;
  difficulty?: LearningDifficulty;
  questionCount?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

type LearningRequest = FastifyRequest<{ Body: LearningBody }>;

export async function registerLearningAgentRoutes(app: FastifyInstance) {
  app.post(
    "/agent/learning/generate",
    async (request: LearningRequest, reply: FastifyReply) => {
      const parsed = LearningBodySchema.safeParse(request.body);

      if (!parsed.success) {
        reply.code(400);
        return { error: "invalid_body" };
      }

      const body = parsed.data;

      const result = await generateLearningContent({
        tenantId: body.tenantId as any,
        sessionId: body.sessionId,
        mode: body.mode,
        message: body.message,
        difficulty: body.difficulty,
        questionCount: body.questionCount,
        tags: body.tags,
        metadata: body.metadata
      });

      return result;
    }
  );
}
