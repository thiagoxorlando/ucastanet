import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function GET(req: NextRequest) {
  const queryAgencyId = new URL(req.url).searchParams.get("agency_id");
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (queryAgencyId && queryAgencyId !== user.id) {
    return NextResponse.json({ error: "Cannot view another agency's history" }, { status: 403 });
  }

  const { data: history, error } = await supabase
    .from("agency_talent_history")
    .select("*")
    .eq("agency_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("last_worked_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!history?.length) return NextResponse.json({ history: [] });

  const talentIds = history.map((h) => h.talent_id);
  const { data: profiles } = await supabase
    .from("talent_profiles")
    .select("id, full_name, avatar_url, city, country, main_role, categories")
    .in("id", talentIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    history: history.map((h) => ({ ...h, talent: profileMap.get(h.talent_id) ?? null })),
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, is_favorite } = body;
  if (!id || typeof is_favorite !== "boolean") {
    return NextResponse.json({ error: "id and is_favorite required" }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("agency_talent_history")
    .update({ is_favorite })
    .eq("id", id)
    .eq("agency_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ history: data });
}
