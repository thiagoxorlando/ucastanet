import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const currentPassword = (body.currentPassword as string | undefined)?.trim() ?? "";
  const newPassword     = (body.newPassword     as string | undefined)?.trim() ?? "";
  const confirmPassword = (body.confirmPassword  as string | undefined)?.trim() ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 8 caracteres." },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "A confirmação da senha não corresponde." },
      { status: 400 },
    );
  }

  // Verify current password by attempting sign-in
  const supabase = createServerClient({ useServiceRole: false });
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email:    user.email ?? "",
    password: currentPassword,
  });

  if (signInErr) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
  }

  // Update password via admin API (service role, so no re-auth needed)
  const adminClient = createServerClient({ useServiceRole: true });
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateErr) {
    console.error("[change-password] updateUserById failed", updateErr.message);
    return NextResponse.json(
      { error: "Não foi possível alterar a senha. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
