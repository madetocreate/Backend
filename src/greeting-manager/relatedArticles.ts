import { GreetingCard } from "./cardTypes";

export function markNewsWithRelated(cards: GreetingCard[]): GreetingCard[] {
  return cards.map((card) => {
    if (
      card.type === "general_news" ||
      card.type === "personal_news" ||
      card.type === "deep_dive"
    ) {
      const existingTags = card.topicTags ?? [];
      const tags = existingTags.includes("has_related")
        ? existingTags
        : [...existingTags, "has_related"];
      return {
        ...card,
        topicTags: tags
      };
    }
    return card;
  });
}
