import { handleResearchQuery } from "../research/service";

export type ShoppingProductCandidate = {
  id: string;
  title: string;
  url?: string;
  sourceKind: "web" | "internal";
  snippet?: string;
};

export async function runShoppingProductResearch(params: {
  tenantId: string;
  sessionId: string;
  query: string;
  maxResults?: number;
  metadata?: Record<string, unknown>;
}): Promise<ShoppingProductCandidate[]> {
  const res = await handleResearchQuery({
    tenantId: params.tenantId as any,
    sessionId: params.sessionId,
    question: params.query,
    scope: "market" as any,
    maxSources: params.maxResults ?? 5,
    channel: "agent_shopping_product",
    metadata: {
      ...(params.metadata ?? {}),
      shoppingMode: "product_search"
    }
  } as any);

  const rawSources = Array.isArray((res as any).sources)
    ? (res as any).sources
    : [];

  const candidates: ShoppingProductCandidate[] = rawSources
    .map((s: any) => {
      if (!s || typeof s.title !== "string" || !s.title.trim()) {
        return null;
      }
      const title = s.title as string;
      const url =
        typeof s.url === "string" && s.url.trim().length > 0
          ? (s.url as string)
          : undefined;
      const snippet =
        typeof s.snippet === "string" && s.snippet.trim().length > 0
          ? (s.snippet as string)
          : undefined;
      const kind = s.kind === "internal" ? "internal" : "web";
      const id =
        typeof s.id === "string" && s.id.trim().length > 0
          ? (s.id as string)
          : title;

      return {
        id,
        title,
        url,
        sourceKind: kind,
        snippet
      };
    })
    .filter(
      (x: ShoppingProductCandidate | null): x is ShoppingProductCandidate =>
        x !== null
    );

  const limit = params.maxResults ?? 5;
  return candidates.slice(0, limit);
}
