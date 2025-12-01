import { type GreetingContext, buildGreetingFeed, type GreetingManagerDeps } from "./greetingManager";
import { type GreetingCard } from "./cardTypes";
import { attachImagePrompts } from "./imagePrompts";
import { markNewsWithRelated } from "./relatedArticles";

export async function buildFinalGreetingFeed(
  context: GreetingContext,
  deps: GreetingManagerDeps
): Promise<GreetingCard[]> {
  const cards = await buildGreetingFeed(context, deps);
  const withImages = attachImagePrompts(cards);
  const withRelated = markNewsWithRelated(withImages);
  const sorted = [...withRelated].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    return pb - pa;
  });
  return sorted;
}
