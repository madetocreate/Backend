import { GreetingCard } from "./cardTypes";
import { makeNewsFetcher, type NewsFetcherDeps, type NewsFetcherContext } from "./newsFetcher";
import { type TopicSpec, type TopicPlan } from "./topicPlanner";

export interface NewsDetailRequest {
  topicLabel: string;
}

export async function buildNewsDetailFromTopicLabel(
  req: NewsDetailRequest,
  deps: NewsFetcherDeps,
  context: NewsFetcherContext
): Promise<GreetingCard[]> {
  const label = req.topicLabel.trim();
  if (!label) {
    return [];
  }

  const topic: TopicSpec = {
    id: "detail-" + label.toLowerCase().replace(/\s+/g, "-"),
    kind: "personal",
    label: label,
    query:
      "further news articles, background and different perspectives about " +
      label +
      " from the last 72 hours",
    category: "detail",
    importance: 0.95
  };

  const plan: TopicPlan = {
    generalTopics: [],
    personalTopics: [topic]
  };

  const fetcher = makeNewsFetcher({
    searchNewsForTopic: deps.searchNewsForTopic
  });

  const cards = await fetcher(
    {
      userId: context.userId,
      locale: context.locale,
      now: context.now
    },
    plan
  );

  return cards;
}
