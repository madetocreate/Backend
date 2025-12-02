import Stripe from "stripe"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ""
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ""

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16"
  })
}

export function verifyStripeWebhook(rawBody: Buffer, signatureHeader: string | string[] | undefined): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
  }
  const stripe = getStripeClient()
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] || "" : signatureHeader || ""
  if (!signature) {
    throw new Error("Missing Stripe-Signature header")
  }
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
}
