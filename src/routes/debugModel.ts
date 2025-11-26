import { FastifyInstance } from "fastify";
import { env } from "../config/env";
import { getChatModel, getFallbackModel, getSummaryModel } from "../config/model";

export function registerDebugModelRoutes(app: FastifyInstance) {
  app.get("/debug/model", async () => {
    return {
      env: {
        OPENAI_MODEL: env.OPENAI_MODEL,
        OPENAI_FALLBACK_MODEL: env.OPENAI_FALLBACK_MODEL,
        OPENAI_SUMMARY_MODEL: env.OPENAI_SUMMARY_MODEL
      },
      resolved: {
        chatModel: getChatModel(),
        fallbackModel: getFallbackModel(),
        summaryModel: getSummaryModel()
      }
    };
  });
}
