import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy contract payment route is disabled. Use /api/contracts/[id] actions for escrow and payout.",
    },
    { status: 410 }
  );
}
