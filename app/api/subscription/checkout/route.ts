import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy subscription checkout disabled. Use /api/agencies/plan-change." },
    { status: 410 },
  );
}
