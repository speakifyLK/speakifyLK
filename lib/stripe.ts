import Stripe from "stripe";

const stripeApiKey = process.env.STRIPE_API_SECRET_KEY;

if (!stripeApiKey) {
  throw new Error("Missing STRIPE_API_SECRET_KEY environment variable. Please set it before starting the application.");
}

export const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});
