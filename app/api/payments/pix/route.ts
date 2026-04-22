import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy PIX payment route is disabled. Use the authenticated wallet deposit and contract escrow flows.",
    },
    { status: 410 }
  );
}
