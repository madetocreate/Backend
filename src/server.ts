import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env";
import { registerChatRoutes } from "./routes/chat";
import { registerChatStreamRoutes } from "./routes/chatStream";
import { registerIngestEmailRoutes } from "./routes/ingestEmail";
import { registerIngestDmRoutes } from "./routes/ingestDm";
import { registerIngestReviewRoutes } from "./routes/ingestReview";

function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  void registerChatRoutes(app);
  void registerChatStreamRoutes(app);
  void registerIngestEmailRoutes(app);
  void registerIngestDmRoutes(app);
  void registerIngestReviewRoutes(app);

  return app;
}

async function start() {
  const app = buildServer();
  const port = env.PORT;
  const host = "0.0.0.0";

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
