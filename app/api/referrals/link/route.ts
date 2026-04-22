/**
 * POST /api/referrals/link
 *
 * Called after a new user signs up using a referral token (?ref=<token>).
 * Links the referral_invite to the authenticated user's profile.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, user_id } = body;

  if (!token || !user_id) {
    return NextResponse.json({ error: "token e user_id são obrigatórios" }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (user_id !== user.id) {
    return NextResponse.json({ error: "Não é possível vincular convite para outro usuário" }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: invite, error: fetchErr } = await supabase
    .from("referral_invites")
    .select("id, referrer_id, referred_email, submission_id, status")
    .eq("token", token)
    .single();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Este convite já foi utilizado" }, { status: 409 });
  }

  if (
    invite.referred_email &&
    user.email &&
    invite.referred_email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return NextResponse.json({ error: "Este convite pertence a outro email" }, { status: 403 });
  }

  await supabase
    .from("referral_invites")
    .update({ referred_user_id: user.id, status: "signed_up" })
    .eq("id", invite.id);

  if (invite.submission_id) {
    await supabase
      .from("submissions")
      .update({ talent_user_id: user.id })
      .eq("id", invite.submission_id);
  }

  await notify(
    invite.referrer_id,
    "booking",
    "Seu indicado se cadastrou na plataforma!",
    "/talent/referrals",
  );

  return NextResponse.json({ ok: true });
}
