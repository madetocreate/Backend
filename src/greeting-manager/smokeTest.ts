import { buildFinalGreetingFeed } from "./pipeline";
import { createDefaultGreetingManagerDeps, type ExternalGreetingDeps } from "./defaultDeps";
import type { GreetingContext } from "./greetingManager";
import type { TopicSpec } from "./topicPlanner";
import type { NewsSearchResult } from "./newsFetcher";
import type { ProjectSummary } from "./projectCards";

const externalDeps: ExternalGreetingDeps = {
  async loadUserProfile(userId: string): Promise<unknown> {
    return {
      userId,
      newsTopics: ["AI Regulation", "Bundesliga", "Startups"],
      industries: ["ai", "software"]
    };
  },
  async loadMemorySummary(userId: string): Promise<unknown> {
    return {
      userId,
      activeProjects: ["AI Bot", "Landing Page Relaunch"]
    };
  },
  async searchNewsForTopic(topic: TopicSpec): Promise<NewsSearchResult[]> {
    return [
      {
        title: "Demo News for " + topic.label,
        summary: "Kurzfassung der News zu " + topic.label + ".",
        url: "https://example.com/news/" + encodeURIComponent(topic.label),
        sourceName: "DemoSource",
        topicTag: topic.label
      }
    ];
  },
  async loadActiveProjects(userId: string): Promise<ProjectSummary[]> {
    return [
      {
        id: "proj-1",
        name: "AI Begrüßungsmanager",
        nextStep: "Datenquellen verbinden und UI bauen",
        priority: 1
      },
      {
        id: "proj-2",
        name: "Marketing Landing Page",
        nextStep: "Hero-Section mit neuem Value-Proposition-Text testen",
        priority: 0.8
      }
    ];
  }
};

async function runSmokeTest(): Promise<void> {
  const deps = createDefaultGreetingManagerDeps(externalDeps);
  const context: GreetingContext = {
    userId: "demo-user",
    locale: "de-DE",
    now: new Date().toISOString()
  };

  const cards = await buildFinalGreetingFeed(context, deps);
  console.log(JSON.stringify(cards, null, 2));
}

runSmokeTest().catch((err) => {
  console.error("Smoke test failed", err);
  process.exit(1);
});
