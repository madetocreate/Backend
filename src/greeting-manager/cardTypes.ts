export type CardType =
  | "general_news"
  | "personal_news"
  | "deep_dive"
  | "project"
  | "memory_followup"
  | "curate";

export interface CardSource {
  name: string;
  url: string;
}

export type CardActionType = "open_chat" | "open_url" | "feedback";

export interface CardAction {
  label: string;
  actionType: CardActionType;
  payload?: Record<string, unknown>;
}

export interface GreetingCard {
  id: string;
  type: CardType;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  topicTags?: string[] | null;
  priority?: number | null;
  source?: CardSource | null;
  imageUrl?: string | null;
  imagePrompt?: string | null;
  actions?: CardAction[] | null;
}
