import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { stripe } from "../integrations/stripe/client";
import { applyStripeCheckoutSession } from "../domain/billing/service";
import { PlanId } from "../domain/billing/types";

type StripeWebhookRequest = FastifyRequest<{ Body: any }>;

export async function registerBillingStripeRoutes(app: FastifyInstance) {
  app.post("/billing/stripe/webhook", async (request: StripeWebhookRequest, reply: FastifyReply) => {
    if (!stripe) {
      reply.code(500);
      return { error: "stripe_not_configured" };
    }

    const event = request.body as any;

    if (!event || typeof event !== "object") {
      reply.code(400);
      return { error: "invalid_stripe_event" };
    }

    const eventType = typeof event.type === "string" ? event.type : null;

    if (!eventType) {
      reply.code(400);
      return { error: "missing_event_type" };
    }

    if (eventType === "checkout.session.completed") {
      const session = event.data && event.data.object;
      const metadata = (session && session.metadata) || {};
      const tenantId =
        metadata && typeof metadata.tenantId === "string" ? (metadata.tenantId as string) : null;
      const planIdRaw =
        metadata && typeof metadata.planId === "string" ? (metadata.planId as string) : null;

      const stripeCustomerId =
        session && typeof session.customer === "string" ? (session.customer as string) : null;
      const stripeSubscriptionId =
        session && typeof session.subscription === "string"
          ? (session.subscription as string)
          : null;

      if (!tenantId || !planIdRaw) {
        reply.code(400);
        return { error: "missing_tenant_or_plan_metadata" };
      }

      try {
        applyStripeCheckoutSession({
          tenantId,
          planId: planIdRaw as PlanId,
          stripeCustomerId,
          stripeSubscriptionId,
          status: "active"
        });
      } catch (err) {
        reply.code(500);
        return { error: "failed_to_apply_checkout_session" };
      }
    }

    reply.code(200);
    return { received: true };
  });
}
