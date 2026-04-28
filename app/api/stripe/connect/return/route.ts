import { NextRequest, NextResponse } from "next/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// GET /api/stripe/connect/return
// Stripe redirects here after the talent completes (or leaves) onboarding.
// Note: this does NOT mean onboarding is complete — always re-fetch status.
// We just bounce back to the finances page; TalentFinances re-fetches status on mount.
export async function GET(_req: NextRequest) {
  console.log("[stripe] talent returned from Connect onboarding");
  return NextResponse.redirect(
    new URL("/talent/finances?stripe=return", APP_URL)
  );
}
