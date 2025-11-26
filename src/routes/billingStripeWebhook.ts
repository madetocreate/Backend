import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { stripe } from "../integrations/stripe/client";

type StripeWebhookRequest = FastifyRequest<{ Body: any }>;

export async function registerBillingStripeRoutes(app: FastifyInstance) {
  app.post("/billing/stripe/webhook", async (request: StripeWebhookRequest, reply: FastifyReply) => {
    if (!stripe) {
      reply.code(500);
      return { error: "stripe_not_configured" };
    }

    const event = request.body;

    void event;

    reply.code(200);
    return { received: true };
  });
}
