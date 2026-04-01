import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { user_id, plan } = await req.json();

  if (!user_id || !plan) {
    return NextResponse.json({ error: "Missing user_id or plan" }, { status: 400 });
  }

  if (!["basic", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { error } = await supabase
    .from("agency_plans")
    .upsert({ user_id, plan }, { onConflict: "user_id" });

  if (error) {
    console.error("[agency-plan/route] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
