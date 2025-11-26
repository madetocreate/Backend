import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerChatRoutes } from "./routes/chat";
import { registerChatStreamRoutes } from "./routes/chatStream";
import { registerIngestEmailRoutes } from "./routes/ingestEmail";
import { registerIngestDmRoutes } from "./routes/ingestDm";
import { registerIngestReviewRoutes } from "./routes/ingestReview";
import { registerDebugModelRoutes } from "./routes/debugModel";
import { registerDebugMemoryRoutes } from "./routes/debugMemory";

const app = Fastify({});

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

app.register(cors);

app.get("/health", async () => ({ status: "ok" }));

app.register(registerChatRoutes);
app.register(registerChatStreamRoutes);
app.register(registerIngestEmailRoutes);
app.register(registerIngestDmRoutes);
app.register(registerIngestReviewRoutes);
app.register(registerDebugModelRoutes);
app.register(registerDebugMemoryRoutes);

app.listen({ port: 3000, host: "0.0.0.0" }).then(() => {
  console.log("Server listening");
});
