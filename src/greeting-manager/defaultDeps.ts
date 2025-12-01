import { type GreetingManagerDeps, type GreetingContext } from "./greetingManager";
import { defaultPlanTopics, type TopicPlannerContext, type TopicPlan } from "./topicPlanner";
import { makeNewsFetcher, type NewsFetcherDeps } from "./newsFetcher";
import { createDefaultFetchProjectCards, type ProjectCardsDeps } from "./projectCards";
import { defaultFetchCurateCards } from "./curateCards";

export interface ExternalGreetingDeps extends NewsFetcherDeps, ProjectCardsDeps {
  loadUserProfile: (userId: string) => Promise<unknown>;
  loadMemorySummary: (userId: string) => Promise<unknown>;
}

export function createDefaultGreetingManagerDeps(
  external: ExternalGreetingDeps
): GreetingManagerDeps {
  const newsFetcher = makeNewsFetcher({
    searchNewsForTopic: external.searchNewsForTopic
  });

  const projectFetcher = createDefaultFetchProjectCards({
    loadActiveProjects: external.loadActiveProjects
  });

  const planTopics = async (
    context: GreetingContext,
    profile: unknown,
    memory: unknown
  ): Promise<TopicPlan> => {
    const plannerContext: TopicPlannerContext = {
      userId: context.userId,
      locale: context.locale,
      now: context.now
    };
    return defaultPlanTopics(plannerContext, profile, memory);
  };

  return {
    loadUserProfile: external.loadUserProfile,
    loadMemorySummary: external.loadMemorySummary,
    planTopics: planTopics,
    fetchNewsCards: async (context, topicPlan) =>
      newsFetcher(
        {
          userId: context.userId,
          locale: context.locale,
          now: context.now
        },
        topicPlan
      ),
    fetchProjectCards: async (context) => projectFetcher(context),
    fetchCurateCards: async (context) => defaultFetchCurateCards(context)
  };
}
