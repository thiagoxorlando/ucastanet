import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

const DISABLED_MESSAGE =
  "Alteração de plano pelo painel ainda não está disponível. Entre em contato com o suporte.";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Erro interno ao verificar perfil." }, { status: 500 });
  }

  if (profile?.role !== "agency") {
    return NextResponse.json({ error: "Apenas agencias podem alterar planos" }, { status: 403 });
  }

  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 410 });
}
