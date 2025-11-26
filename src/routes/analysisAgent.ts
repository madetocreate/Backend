import { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleAnalysisUpload, handleAnalysisQuery } from "../domain/analysis/service";

export function registerAnalysisAgentRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  const uploadSchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    contentBase64: z.string().min(1),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional()
  });
  app.post("/agent/analysis/upload", async (request, reply) => {
    const parsed = uploadSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const result = await handleAnalysisUpload(parsed.data);
    return result;
  });
  const querySchema = z.object({
    tenantId: z.string().min(1),
    sessionId: z.string().min(1),
    message: z.string().min(1)
  });
  app.post("/agent/analysis/query", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body" };
    }
    const result = await handleAnalysisQuery(parsed.data);
    return {
      tenantId: result.tenantId,
      sessionId: result.sessionId,
      channel: "agent_analysis",
      content: result.content
    };
  });
  done();
}
