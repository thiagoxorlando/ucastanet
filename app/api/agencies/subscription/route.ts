import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { error: "Subscription status changes must go through billing checkout" },
    { status: 405 }
  );
}
