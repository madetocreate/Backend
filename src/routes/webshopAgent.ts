import { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateWebshopAssistance } from "../domain/webshop/service";

const WebshopPlatformEnum = z.enum(["shopify", "woocommerce", "other"]);

const WebshopGoalEnum = z.enum([
  "product_recommendation",
  "cart_help",
  "faq",
  "collection_story",
  "other",
]);

const WebshopProductSchema = z.object({
  id: z.string().min(1),
  externalId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const WebshopCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  variantId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const WebshopCartSchema = z.object({
  items: z.array(WebshopCartItemSchema).nonempty(),
  currency: z.string().optional(),
  total: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const WebshopConstraintsSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  maxRecommendations: z.number().int().min(1).max(50).optional(),
});

const WebshopBodySchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  platform: WebshopPlatformEnum,
  goal: WebshopGoalEnum,
  query: z.string().min(1),
  products: z.array(WebshopProductSchema).optional(),
  cart: WebshopCartSchema.optional(),
  constraints: WebshopConstraintsSchema.optional(),
  locale: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerWebshopAgentRoutes(app: FastifyInstance) {
  app.post("/agent/webshop/query", async (request, reply) => {
    const parseResult = WebshopBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: "invalid_request_body",
        details: parseResult.error.flatten(),
      };
    }

    const body = parseResult.data;

    const result = await generateWebshopAssistance({
      tenantId: body.tenantId as any,
      sessionId: body.sessionId,
      platform: body.platform,
      goal: body.goal,
      query: body.query,
      products: body.products,
      cart: body.cart,
      constraints: body.constraints,
      locale: body.locale,
      metadata: body.metadata,
    });

    return result;
  });
}
