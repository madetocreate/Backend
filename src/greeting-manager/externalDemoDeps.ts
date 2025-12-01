import { type ExternalGreetingDeps } from "./defaultDeps";
import type { TopicSpec } from "./topicPlanner";
import type { NewsSearchResult } from "./newsFetcher";
import type { ProjectSummary } from "./projectCards";

async function searchNewsForTopicDemo(topic: TopicSpec): Promise<NewsSearchResult[]> {
  return [
    {
      title: "Demo News for " + topic.label,
      summary: "Kurzfassung der News zu " + topic.label + ".",
      url: "https://example.com/news/" + encodeURIComponent(topic.label),
      sourceName: "DemoSource",
      topicTag: topic.label
    }
  ];
}

async function loadUserProfile(userId: string): Promise<unknown> {
  return {
    userId,
    newsTopics: ["AI Regulation", "Bundesliga", "Startups"],
    industries: ["ai", "software"]
  };
}

async function loadMemorySummary(userId: string): Promise<unknown> {
  return {
    userId,
    activeProjects: ["AI Bot", "Landing Page Relaunch"]
  };
}

async function loadActiveProjects(userId: string): Promise<ProjectSummary[]> {
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

export const externalDemoDeps: ExternalGreetingDeps = {
  loadUserProfile,
  loadMemorySummary,
  searchNewsForTopic: searchNewsForTopicDemo,
  loadActiveProjects
};
