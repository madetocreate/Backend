import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY ?? "";

export const stripe =
  apiKey && apiKey.length > 0
    ? new Stripe(apiKey)
    : null;
