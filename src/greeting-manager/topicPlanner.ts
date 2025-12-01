export type TopicKind = "general" | "personal";

export interface TopicSpec {
  id: string;
  kind: TopicKind;
  label: string;
  query: string;
  category?: string;
  importance: number;
}

export interface TopicPlan {
  generalTopics: TopicSpec[];
  personalTopics: TopicSpec[];
}

export interface TopicPlannerContext {
  userId: string;
  locale: string;
  now: string;
}

export interface UserProfileLike {
  industries?: string[] | null;
  newsTopics?: string[] | null;
  avoidTopics?: string[] | null;
  baseNewsMix?: Record<string, number> | null;
  languages?: string[] | null;
}

export type MemorySummaryLike = unknown;

export async function defaultPlanTopics(
  context: TopicPlannerContext,
  profile: UserProfileLike | unknown,
  memory: MemorySummaryLike
): Promise<TopicPlan> {
  const now = new Date(context.now);
  const dateStr = now.toISOString().slice(0, 10);

  const generalTopics: TopicSpec[] = [
    {
      id: "general-world-" + dateStr,
      kind: "general",
      label: "Weltgeschehen",
      query: "important world news last 24 hours",
      importance: 0.8
    },
    {
      id: "general-local-" + dateStr,
      kind: "general",
      label: "News in deinem Land",
      query: "important news in your country last 24 hours",
      importance: 0.8
    }
  ];

  const personalTopics: TopicSpec[] = [];
  const p = profile as UserProfileLike;
  const topics = p && p.newsTopics ? p.newsTopics : [];

  topics.forEach(function (t, index) {
    personalTopics.push({
      id: "personal-" + index + "-" + dateStr,
      kind: "personal",
      label: t,
      query: "latest news about " + t + " last 24 hours",
      category: "personal",
      importance: 0.9
    });
  });

  return { generalTopics: generalTopics, personalTopics: personalTopics };
}
