import { recordUsageEvent } from "../usage/service";
import type { UsageEventType } from "../usage/types";
import { openai } from "../../integrations/openai/client";
import { getSummaryModel } from "../../config/model";
import {
  WebshopAssistRequest,
  WebshopAssistResponse,
  WebshopRecommendation,
  WebshopCartSuggestion,
  WebshopFilterSuggestion,
} from "./types";
import { getConversationMemory } from "../memory/service";

export async function generateWebshopAssistance(
  input: WebshopAssistRequest
): Promise<WebshopAssistResponse> {
  const channel = "agent_webshop";
  const now = new Date();
  const model = getSummaryModel();

  const sessionContextRecords = await getConversationMemory({
    tenantId: input.tenantId,
    conversationId: input.sessionId,
    limit: 20,
    types: ["conversation_message"]
  });

  const sessionContext = sessionContextRecords.map(record => ({
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    metadata: record.metadata ?? undefined
  }));

  let answer =
    "Ich konnte keine sinnvolle Empfehlung erzeugen. Bitte formuliere deine Anfrage konkreter oder versuche es später erneut.";
  let recommendations: WebshopRecommendation[] = [];
  let cartSuggestions: WebshopCartSuggestion[] = [];
  let filters: WebshopFilterSuggestion[] = [];
  let followUps: string[] = [];

  try {
    const response = await openai.responses.create({
      model,
      instructions:
        "You are a webshop assistant for a small business. " +
        "You receive the ecommerce platform, a goal, a natural language query, an optional list of products, an optional cart and optional constraints. " +
        "You must help the user with product recommendations, cart optimization or shop related questions. " +
        "Always respect the provided products and cart as the source of truth. " +
        "If constraints are provided (minPrice, maxPrice, categories, tags, maxRecommendations), respect them when building recommendations and suggestions. " +
        "If helpful, propose filter suggestions that a frontend can use to pre-filter products, and useful follow-up questions to clarify the need. " +
        "Return ONLY minified JSON without markdown, comments or explanations. " +
        'Schema: {"answer": string, "recommendations"?: [{"productId": string, "reason": string, "score"?: number, "tags"?: string[], "actions"?: string[]}], "cartSuggestions"?: [{"type": "add" | "remove" | "replace" | "adjust_quantity", "productId": string, "targetProductId"?: string, "quantity"?: number, "reason": string}], "filters"?: [{"label": string, "field": string, "operator": "eq" | "lt" | "gt" | "in", "value": string | number | string[]}], "followUps"?: string[], "notes"?: string}. ' +
        "For goal = product_recommendation focus on recommendations (and optional filters). For goal = cart_help focus on cartSuggestions. For goal = faq focus on a clear answer and optional notes.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                platform: input.platform,
                goal: input.goal,
                query: input.query,
                products: input.products,
                cart: input.cart,
                constraints: input.constraints,
                locale: input.locale,
                metadata: input.metadata,
                sessionContext
              }),
            },
          ],
        },
      ],
    } as any);

    const text = (response as any).output_text as string | undefined;

    if (text) {
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (parsed && typeof parsed.answer === "string" && parsed.answer.trim().length > 0) {
        answer = parsed.answer;
      }

      if (parsed && Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations
          .map((r: any) => {
            if (!r || typeof r.productId !== "string" || typeof r.reason !== "string") {
              return null;
            }
            const rec: WebshopRecommendation = {
              productId: r.productId,
              reason: r.reason,
            };
            if (typeof r.score === "number" && Number.isFinite(r.score)) {
              rec.score = r.score;
            }
            if (Array.isArray(r.tags)) {
              rec.tags = r.tags.filter((t: any) => typeof t === "string");
            }
            if (Array.isArray(r.actions)) {
              rec.actions = r.actions.filter((a: any) => typeof a === "string");
            }
            return rec;
          })
          .filter((x: WebshopRecommendation | null): x is WebshopRecommendation => x !== null);
      }

      if (parsed && Array.isArray(parsed.cartSuggestions)) {
        const allowedTypes = ["add", "remove", "replace", "adjust_quantity"];
        cartSuggestions = parsed.cartSuggestions
          .map((s: any) => {
            if (!s || typeof s.type !== "string" || allowedTypes.indexOf(s.type) === -1) {
              return null;
            }
            if (typeof s.productId !== "string" || typeof s.reason !== "string") {
              return null;
            }
            const suggestion: WebshopCartSuggestion = {
              type: s.type,
              productId: s.productId,
              reason: s.reason,
            };
            if (typeof s.targetProductId === "string") {
              suggestion.targetProductId = s.targetProductId;
            }
            if (typeof s.quantity === "number" && Number.isFinite(s.quantity)) {
              suggestion.quantity = s.quantity;
            }
            return suggestion;
          })
          .filter((x: WebshopCartSuggestion | null): x is WebshopCartSuggestion => x !== null);
      }

      if (parsed && Array.isArray(parsed.filters)) {
        const allowedOps = ["eq", "lt", "gt", "in"];
        filters = parsed.filters
          .map((f: any) => {
            if (!f || typeof f.label !== "string" || typeof f.field !== "string") {
              return null;
            }
            if (typeof f.operator !== "string" || allowedOps.indexOf(f.operator) === -1) {
              return null;
            }
            const value = f.value;
            if (
              typeof value !== "string" &&
              typeof value !== "number" &&
              !Array.isArray(value)
            ) {
              return null;
            }
            if (Array.isArray(value)) {
              const arr = value.filter((v: any) => typeof v === "string");
              return {
                label: f.label,
                field: f.field,
                operator: f.operator,
                value: arr,
              } as WebshopFilterSuggestion;
            }
            return {
              label: f.label,
              field: f.field,
              operator: f.operator,
              value,
            } as WebshopFilterSuggestion;
          })
          .filter((x: WebshopFilterSuggestion | null): x is WebshopFilterSuggestion => x !== null);
      }

      if (parsed && Array.isArray(parsed.followUps)) {
        followUps = parsed.followUps
          .filter((q: any) => typeof q === "string" && q.trim().length > 0);
      }
    }
  } catch {
    answer =
      "Die Webshop-Unterstützung ist aktuell nicht verfügbar. Bitte versuche es später erneut oder wende dich direkt an den Support.";
    recommendations = [];
    cartSuggestions = [];
    filters = [];
    followUps = [];
  }

  const usageType: UsageEventType = "webshop_assist" as UsageEventType;

  await recordUsageEvent({
    tenantId: input.tenantId as any,
    type: usageType,
    route: "/agent/webshop/query",
    timestamp: now,
    metadata: {
      platform: input.platform,
      goal: input.goal,
      hasProducts: Array.isArray(input.products) && input.products.length > 0,
      hasCart: Boolean(input.cart),
      hasConstraints: Boolean(input.constraints),
      minPrice: input.constraints?.minPrice,
      maxPrice: input.constraints?.maxPrice,
      locale: input.locale,
    },
  });

  return {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    channel,
    goal: input.goal,
    platform: input.platform,
    answer,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    cartSuggestions: cartSuggestions.length > 0 ? cartSuggestions : undefined,
    filters: filters.length > 0 ? filters : undefined,
    followUps: followUps.length > 0 ? followUps : undefined,
  };
}
