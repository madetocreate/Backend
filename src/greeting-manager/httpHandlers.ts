import { buildFinalGreetingFeed } from "./pipeline";
import { createDefaultGreetingManagerDeps } from "./defaultDeps";
import { externalDemoDeps } from "./externalDemoDeps";
import { buildNewsDetailFromTopicLabel } from "./newsDetail";
import type { GreetingContext } from "./greetingManager";
import type { NewsFetcherContext } from "./newsFetcher";

export async function handleGreetingFeedHttp(req: any, res: any): Promise<void> {
  try {
    const userIdRaw =
      (req && req.user && req.user.id) ||
      (req && req.query && req.query.userId) ||
      "anonymous";
    const userId = String(userIdRaw);
    const localeHeader =
      (req && req.headers && req.headers["accept-language"]) || "de-DE";
    const locale =
      typeof localeHeader === "string" ? localeHeader : "de-DE";
    const context: GreetingContext = {
      userId,
      locale,
      now: new Date().toISOString()
    };

    const deps = createDefaultGreetingManagerDeps(externalDemoDeps);
    const cards = await buildFinalGreetingFeed(context, deps);

    if (res && typeof res.setHeader === "function") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    if (res) {
      res.statusCode = 200;
      res.end(JSON.stringify(cards));
    }
  } catch (err) {
    if (typeof console !== "undefined") {
      console.error("handleGreetingFeedHttp error", err);
    }
    if (res) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "internal_error" }));
    }
  }
}

export async function handleNewsDetailHttp(req: any, res: any): Promise<void> {
  try {
    const labelParam =
      (req && req.query && (req.query.topic || req.query.label)) || "";
    const topicLabel =
      typeof labelParam === "string" ? labelParam : String(labelParam || "");

    if (!topicLabel.trim()) {
      if (res) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "missing_topic_label" }));
      }
      return;
    }

    const userIdRaw =
      (req && req.user && req.user.id) ||
      (req && req.query && req.query.userId) ||
      "anonymous";
    const userId = String(userIdRaw);
    const localeHeader =
      (req && req.headers && req.headers["accept-language"]) || "de-DE";
    const locale =
      typeof localeHeader === "string" ? localeHeader : "de-DE";

    const newsContext: NewsFetcherContext = {
      userId,
      locale,
      now: new Date().toISOString()
    };

    const cards = await buildNewsDetailFromTopicLabel(
      { topicLabel },
      externalDemoDeps,
      newsContext
    );

    if (res && typeof res.setHeader === "function") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    if (res) {
      res.statusCode = 200;
      res.end(JSON.stringify(cards));
    }
  } catch (err) {
    if (typeof console !== "undefined") {
      console.error("handleNewsDetailHttp error", err);
    }
    if (res) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "internal_error" }));
    }
  }
}
