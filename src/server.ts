import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerChatRoutes } from "./routes/chat";
import { registerChatStreamRoutes } from "./routes/chatStream";
import { registerIngestEmailRoutes } from "./routes/ingestEmail";
import { registerIngestDmRoutes } from "./routes/ingestDm";
import { registerIngestReviewRoutes } from "./routes/ingestReview";
import { registerDebugModelRoutes } from "./routes/debugModel";
import { registerDebugMemoryRoutes } from "./routes/debugMemory";
import { registerOperatorInboxRoutes } from "./routes/operatorInbox";
import { registerBillingStripeRoutes } from "./routes/billingStripeWebhook";
import { registerAnalysisAgentRoutes } from "./routes/analysisAgent";
import { registerCommunicationsAgentRoutes } from "./routes/communicationsAgent";
import { registerIngestAudioRoutes } from "./routes/ingestAudio";
import { registerReviewsAgentRoutes } from "./routes/reviewsAgent";
import { registerWebsiteAgentRoutes } from "./routes/websiteAgent";
import { registerSupportAgentRoutes } from "./routes/supportAgent";
import { registerSupportInboxRoutes } from "./routes/supportInbox";
import { registerContentAgentRoutes } from "./routes/contentAgent";
import { registerCalendarAgentRoutes } from "./routes/calendarAgent";
import { registerMarketingAgentRoutes } from "./routes/marketingAgent";
import { registerSocialAgentRoutes } from "./routes/socialAgent";
import { registerResearchAgentRoutes } from "./routes/researchAgent";
import { registerWebshopAgentRoutes } from "./routes/webshopAgent";
import { registerSearchRoutes } from "./routes/search";
import { registerMemoryAdminRoutes } from "./routes/memoryAdmin";
import { registerMemoryAgentRoutes } from "./routes/memoryAgent";
import { registerAiBuilderAgentRoutes } from "./routes/aiBuilderAgent";
import { registerAiBuilderOrderRoutes } from "./routes/aiBuilderOrder";
import { registerAiBuilderBlueprintRoutes } from "./routes/aiBuilderBlueprint";
import { registerLearningAgentRoutes } from "./routes/learningAgent";
import { registerReviewerAgentRoutes } from "./routes/reviewerAgent";

const app = Fastify({
  bodyLimit: 10 * 1024 * 1024
});

app.removeAllContentTypeParsers();
app.removeContentTypeParser("multipart/form-data");

app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  try {
    const jsonString = typeof body === "string" ? body : body.toString("utf8");
    const parsed = JSON.parse(jsonString);
    done(null, parsed);
  } catch (e) {
    done(e as any);
  }
});

app.addContentTypeParser("*", (_req, _body, done) => {
  done(new Error("invalid_content_type"));
});

app.register(cors, {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
});

app.get("/health", async () => ({ status: "ok" }));

app.register(registerChatRoutes);
app.register(registerChatStreamRoutes);
app.register(registerIngestEmailRoutes);
app.register(registerIngestDmRoutes);
app.register(registerIngestReviewRoutes);
app.register(registerDebugModelRoutes);
app.register(registerDebugMemoryRoutes);
app.register(registerOperatorInboxRoutes);
app.register(registerBillingStripeRoutes);
app.register(registerAnalysisAgentRoutes);
app.register(registerCommunicationsAgentRoutes);
app.register(registerIngestAudioRoutes);
app.register(registerReviewsAgentRoutes);
app.register(registerWebsiteAgentRoutes);
app.register(registerSupportAgentRoutes);
app.register(registerSupportInboxRoutes);
app.register(registerAiBuilderAgentRoutes);
app.register(registerAiBuilderOrderRoutes);
app.register(registerAiBuilderBlueprintRoutes);
app.register(registerContentAgentRoutes);
app.register(registerCalendarAgentRoutes);
app.register(registerMarketingAgentRoutes);
app.register(registerSocialAgentRoutes);
app.register(registerResearchAgentRoutes);
app.register(registerWebshopAgentRoutes);
app.register(registerSearchRoutes);
app.register(registerMemoryAdminRoutes);
app.register(registerMemoryAgentRoutes);
app.register(registerLearningAgentRoutes);
app.register(registerReviewerAgentRoutes);

const PORT = Number(process.env.PORT ?? "4000");

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`Server listening on port ${PORT}`);
});
