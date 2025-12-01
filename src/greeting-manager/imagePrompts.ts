import { GreetingCard } from "./cardTypes";

export function attachImagePrompts(cards: GreetingCard[]): GreetingCard[] {
  return cards.map((card) => {
    if (card.imageUrl || card.imagePrompt) {
      return card;
    }

    let imagePrompt: string | null = null;

    if (card.type === "general_news") {
      imagePrompt = "minimalistic flat illustration of world news, soft gradients, 16:9, no text";
    } else if (card.type === "personal_news") {
      imagePrompt = "minimalistic flat illustration related to the user's interests, soft gradients, 16:9, no text";
    } else if (card.type === "project") {
      imagePrompt = "minimalistic flat illustration of a person working on a project, soft gradients, 16:9, no text";
    } else if (card.type === "memory_followup") {
      imagePrompt = "minimalistic flat illustration of notes and reminders, soft gradients, 16:9, no text";
    } else if (card.type === "curate") {
      imagePrompt = "minimalistic flat illustration of choosing between options, soft gradients, 16:9, no text";
    }

    if (!imagePrompt) {
      return card;
    }

    return {
      ...card,
      imagePrompt: imagePrompt
    };
  });
}
