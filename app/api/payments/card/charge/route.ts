import { NextResponse } from "next/server";

// Legacy arbitrary card-charge endpoint disabled before launch.
// Use scoped routes such as /api/payments/wallet-deposit-card or /api/subscription/checkout.
export async function POST() {
  return NextResponse.json(
    { error: "Legacy card charge route disabled. Use a scoped payment flow." },
    { status: 410 },
  );
}
