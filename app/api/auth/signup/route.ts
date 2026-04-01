import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { user_id, role } = await req.json();

  if (!user_id || !role) {
    return NextResponse.json({ error: "Missing user_id or role" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user_id, role }, { onConflict: "id" });

  if (error) {
    console.error("[signup/route] profile insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
