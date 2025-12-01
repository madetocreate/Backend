import type { GreetingContext } from "./greetingManager";
import { GreetingCard, CardAction } from "./cardTypes";

export async function defaultFetchCurateCards(
  context: GreetingContext
): Promise<GreetingCard[]> {
  const actions: CardAction[] = [
    {
      label: "Mehr allgemeine News",
      actionType: "feedback",
      payload: { kind: "more_general_news" }
    },
    {
      label: "Mehr persönliche News",
      actionType: "feedback",
      payload: { kind: "more_personal_news" }
    },
    {
      label: "Weniger News",
      actionType: "feedback",
      payload: { kind: "less_news" }
    }
  ];

  const card: GreetingCard = {
    id: "curate:" + context.userId,
    type: "curate",
    title: "Wovon möchtest du mehr sehen?",
    subtitle: null,
    body: null,
    topicTags: ["curate"],
    priority: 1,
    source: null,
    imageUrl: null,
    imagePrompt: null,
    actions: actions
  };

  return [card];
}
