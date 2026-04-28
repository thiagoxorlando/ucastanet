// Server-only — never import from client components or NEXT_PUBLIC_ code.
// STRIPE_SECRET_KEY must not be prefixed with NEXT_PUBLIC_.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  // Fail at module load rather than silently at the first request.
  throw new Error(
    "[stripe] STRIPE_SECRET_KEY is not configured. " +
      "Add it to your .env.local (or server environment) and restart."
  );
}

export const stripe = new Stripe(key, {
  apiVersion: "2026-04-22.dahlia",
  appInfo: {
    name:    "BrisaHub",
    url:     "https://brisahub.com.br",
    version: "1.0.0",
  },
});

console.log("[stripe] client initialized (livemode will be confirmed at first API call)");
