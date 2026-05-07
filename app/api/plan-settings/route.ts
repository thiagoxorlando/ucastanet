import { NextResponse } from "next/server";
import { getLivePlanSettings } from "@/lib/planSettings.server";

// Public endpoint — no auth required. Used by client-side plan display.
export async function GET() {
  const settings = await getLivePlanSettings();
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
