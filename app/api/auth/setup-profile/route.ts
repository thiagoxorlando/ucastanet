import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const role = body.role as string | undefined;

  if (role !== profile.role) {
    return NextResponse.json({ error: "Função não corresponde ao perfil." }, { status: 403 });
  }

  if (role === "talent") {
    const t = (body.talent ?? {}) as Record<string, unknown>;

    const upsertPayload: Record<string, unknown> = {
      id: user.id,
      deleted_at: null,
    };
    if (t.full_name) upsertPayload.full_name = t.full_name;
    if (t.phone) upsertPayload.phone = t.phone;
    if (t.country) upsertPayload.country = t.country;
    if (t.city) upsertPayload.city = t.city;
    if (t.state) upsertPayload.state = t.state;
    if (t.gender) upsertPayload.gender = t.gender;
    if (t.age !== undefined && t.age !== null && t.age !== "") upsertPayload.age = t.age;
    if (t.bio !== undefined && t.bio !== null && t.bio !== "") upsertPayload.bio = t.bio;
    if (Array.isArray(t.categories) && t.categories.length > 0) upsertPayload.categories = t.categories;
    if (t.instagram) upsertPayload.instagram = t.instagram;
    if (t.tiktok) upsertPayload.tiktok = t.tiktok;
    if (t.youtube) upsertPayload.youtube = t.youtube;
    if (t.linkedin) upsertPayload.linkedin = t.linkedin;
    if (t.website) upsertPayload.website = t.website;
    if (t.main_role) upsertPayload.main_role = t.main_role;
    if (t.avatar_url) upsertPayload.avatar_url = t.avatar_url;

    const { error: talentErr } = await supabase
      .from("talent_profiles")
      .upsert(upsertPayload, { onConflict: "id" });

    if (talentErr) {
      console.error("[setup-profile/talent] upsert failed:", talentErr.message);
      return NextResponse.json({ error: talentErr.message }, { status: 400 });
    }

    const profileUpdate: Record<string, unknown> = { onboarding_completed: true };
    if (t.full_name) profileUpdate.full_name = t.full_name;
    if (t.cpf) profileUpdate.cpf_cnpj = t.cpf;

    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    return NextResponse.json({ ok: true });
  }

  if (role === "agency") {
    const a = (body.agency ?? {}) as Record<string, unknown>;

    const { data: existing } = await supabase
      .from("agencies")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    const upsertPayload: Record<string, unknown> = {
      id:                  user.id,
      user_id:             user.id,
      deleted_at:          null,
      subscription_status: existing?.subscription_status ?? "inactive",
    };
    if (a.company_name) upsertPayload.company_name = a.company_name;
    if (a.contact_name) upsertPayload.contact_name = a.contact_name;
    if (a.phone) upsertPayload.phone = a.phone;
    if (a.country) upsertPayload.country = a.country;
    if (a.city) upsertPayload.city = a.city;
    if (a.state) upsertPayload.state = a.state;
    if (a.description !== undefined && a.description !== null && a.description !== "") upsertPayload.description = a.description;
    if (a.website) upsertPayload.website = a.website;
    if (a.avatar_url) upsertPayload.avatar_url = a.avatar_url;

    const { error: agencyErr } = await supabase
      .from("agencies")
      .upsert(upsertPayload, { onConflict: "id" });

    if (agencyErr) {
      console.error("[setup-profile/agency] upsert failed:", agencyErr.message);
      return NextResponse.json({ error: agencyErr.message }, { status: 400 });
    }

    const profileUpdate: Record<string, unknown> = { onboarding_completed: true };
    const name = a.company_name ?? a.contact_name;
    if (name) profileUpdate.full_name = name;
    if (a.cpf_cnpj) profileUpdate.cpf_cnpj = a.cpf_cnpj;

    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Função inválida." }, { status: 400 });
}
