export type CardType =
  | "news"
  | "deep_dive"
  | "project"
  | "memory"
  | "curate"
  | "system";

export interface BaseCard {
  id: string;
  type: CardType;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  priority?: number | null;
  topicTags?: string[] | null;
  imageUrl?: string | null;
}

export interface NewsSource {
  name: string;
  url: string;
}

export interface CardAction {
  label: string;
  actionType: string;
  payload?: Record<string, unknown>;
}

export interface NewsCard extends BaseCard {
  type: "news" | "deep_dive";
  source: NewsSource;
  relatedTopicId?: string | null;
  actions?: CardAction[] | null;
}

export interface ProjectCard extends BaseCard {
  type: "project" | "memory";
  projectId?: string;
  actions?: CardAction[] | null;
}

export type GreetingCard =
  | NewsCard
  | ProjectCard
  | BaseCard;
