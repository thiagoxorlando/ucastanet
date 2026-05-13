import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

// All top-level app route segments that must not become workspace slugs
const RESERVED_SLUGS = new Set([
  "admin", "agency", "talent", "api", "login", "signup", "jobs", "job",
  "premium", "support", "terms", "privacy", "dashboard", "app", "www",
  "brisahub", "onboarding", "setup-profile", "account-frozen",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$|^[a-z0-9]{3}$/;

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { slug?: unknown };
  const raw = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";

  if (!raw) {
    return NextResponse.json({ error: "Slug é obrigatório." }, { status: 400 });
  }
  if (!SLUG_RE.test(raw)) {
    return NextResponse.json(
      { error: "Slug inválido. Use apenas letras minúsculas, números e hífens (3–40 caracteres)." },
      { status: 400 },
    );
  }
  if (RESERVED_SLUGS.has(raw)) {
    return NextResponse.json({ error: "Este slug é reservado. Escolha outro." }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
  if (ws.membership.role !== "owner") {
    return NextResponse.json({ error: "Somente o proprietário pode editar o slug." }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Check uniqueness (excluding current workspace)
  const { data: conflict } = await supabase
    .from("premium_workspaces")
    .select("id")
    .eq("slug", raw)
    .neq("id", ws.workspace.id)
    .maybeSingle();

  if (conflict) {
    return NextResponse.json({ error: "Este slug já está em uso. Escolha outro." }, { status: 409 });
  }

  const { error } = await supabase
    .from("premium_workspaces")
    .update({ slug: raw, updated_at: new Date().toISOString() })
    .eq("id", ws.workspace.id);

  if (error) {
    console.error("[PATCH /api/agency/workspace/slug]", error);
    return NextResponse.json({ error: "Não foi possível salvar o slug." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug: raw });
}
