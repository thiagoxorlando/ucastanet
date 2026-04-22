/**
 * POST /api/referrals/report
 *
 * Called when a referrer suspects fraud. Marks the invite as fraud_reported
 * for review; it does not ban the referred user automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { invite_id } = body;

  if (!invite_id) {
    return NextResponse.json({ error: "invite_id é obrigatório" }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "talent") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { data: invite, error: fetchErr } = await supabase
    .from("referral_invites")
    .select("id, referrer_id, status")
    .eq("id", invite_id)
    .single();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  if (invite.referrer_id !== user.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  if (invite.status === "fraud_reported") {
    return NextResponse.json({ error: "Fraude já reportada" }, { status: 409 });
  }

  await supabase
    .from("referral_invites")
    .update({ status: "fraud_reported" })
    .eq("id", invite_id);

  await notify(
    invite.referrer_id,
    "contract",
    "Denúncia de fraude registrada. A comissão desta indicação não será aplicada.",
    "/talent/referrals",
  );

  return NextResponse.json({ ok: true });
}
