import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

const VALID_ROLES = ["agency", "talent"] as const;

export async function POST(req: NextRequest) {
  const { user_id, role } = await req.json();

  if (!user_id || !role) {
    return NextResponse.json({ error: "Missing user_id or role" }, { status: 400 });
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user_id !== user.id) {
    return NextResponse.json({ error: "Cannot create profile for another user" }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.role && existingProfile.role !== role) {
    return NextResponse.json({ error: "Profile role already set" }, { status: 409 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, role }, { onConflict: "id" });

  if (error) {
    console.error("[signup/route] profile insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Create role-specific profile row so FK constraints are satisfied
  if (role === "agency") {
    const { error: agencyErr } = await supabase
      .from("agencies")
      .upsert({ id: user.id, user_id: user.id, subscription_status: "inactive" }, { onConflict: "id" });

    if (agencyErr) {
      console.error("[signup/route] agency insert failed:", agencyErr.message);
      // Non-fatal: profile was created, agency row can be created later
    }
  }

  if (role === "talent") {
    const { error: talentErr } = await supabase
      .from("talent_profiles")
      .upsert({ id: user.id }, { onConflict: "id" });

    if (talentErr) {
      console.error("[signup/route] talent_profile insert failed:", talentErr.message);
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
