import Stripe from "stripe";
import { env } from "../../config/env";

const apiKey = process.env.STRIPE_SECRET_KEY || "";

export const stripe =
  apiKey && apiKey.length > 0
    ? new Stripe(apiKey, {
        apiVersion: "2024-09-30.acacia"
      })
    : null;
