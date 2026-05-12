import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { name, brandPrimaryColor, brandAccentColor, welcomeMessage, logoUrl } = body as {
    name?: unknown;
    brandPrimaryColor?: unknown;
    brandAccentColor?: unknown;
    welcomeMessage?: unknown;
    logoUrl?: unknown;
  };

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
  if (ws.membership.role !== "owner") {
    return NextResponse.json({ error: "Somente o proprietário pode editar a personalização." }, { status: 403 });
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome do espaço é obrigatório." }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "Nome deve ter no máximo 100 caracteres." }, { status: 400 });
  }
  if (brandPrimaryColor && typeof brandPrimaryColor === "string" && !isValidHex(brandPrimaryColor)) {
    return NextResponse.json({ error: "Cor principal inválida. Use formato hex (ex: #1ABC9C)." }, { status: 400 });
  }
  if (brandAccentColor && typeof brandAccentColor === "string" && !isValidHex(brandAccentColor)) {
    return NextResponse.json({ error: "Cor de destaque inválida. Use formato hex (ex: #27C1D6)." }, { status: 400 });
  }
  if (welcomeMessage && typeof welcomeMessage === "string" && welcomeMessage.length > 500) {
    return NextResponse.json({ error: "Mensagem de boas-vindas deve ter no máximo 500 caracteres." }, { status: 400 });
  }
  if (logoUrl && typeof logoUrl === "string" && !logoUrl.includes("premium-workspaces/")) {
    return NextResponse.json({ error: "URL de logo inválida." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const update: Record<string, unknown> = {
    name: (name as string).trim(),
    brand_primary_color: (typeof brandPrimaryColor === "string" && isValidHex(brandPrimaryColor)) ? brandPrimaryColor : null,
    brand_accent_color: (typeof brandAccentColor === "string" && isValidHex(brandAccentColor)) ? brandAccentColor : null,
    welcome_message: typeof welcomeMessage === "string" && welcomeMessage.trim() ? welcomeMessage.trim() : null,
    updated_at: new Date().toISOString(),
  };

  // Only update logo_url when explicitly included in request body
  if ("logoUrl" in body) {
    update.logo_url = typeof logoUrl === "string" && logoUrl ? logoUrl : null;
  }

  const { error } = await supabase
    .from("premium_workspaces")
    .update(update)
    .eq("id", ws.workspace.id);

  if (error) {
    console.error("[PATCH /api/agency/workspace/branding]", error);
    return NextResponse.json({ error: "Não foi possível salvar a personalização." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
