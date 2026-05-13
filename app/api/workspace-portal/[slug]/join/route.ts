import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  // Only talents may join a workspace portal
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "talent") {
    return NextResponse.json(
      { error: "Entre com uma conta de talento para acessar este portal." },
      { status: 403 },
    );
  }

  // Resolve workspace by slug
  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, status, deleted_at")
    .eq("slug", slug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) {
    return NextResponse.json({ error: "Portal não encontrado." }, { status: 404 });
  }

  // Upsert membership — idempotent; race-safe because of partial unique index
  const { data: existing } = await supabase
    .from("premium_workspace_talents")
    .select("id, status")
    .eq("workspace_id", workspace.id)
    .eq("talent_user_id", user.id)
    .is("removed_at", null)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("premium_workspace_talents").insert({
      workspace_id:   workspace.id,
      talent_user_id: user.id,
      status:         "active",
      source:         "portal",
    });

    // Ignore unique constraint violation (race condition)
    if (error && !error.message.includes("unique")) {
      console.error("[POST /api/workspace-portal/join]", error);
      return NextResponse.json({ error: "Não foi possível ingressar no portal." }, { status: 500 });
    }
  } else if (existing.status !== "active") {
    await supabase
      .from("premium_workspace_talents")
      .update({ status: "active", removed_at: null })
      .eq("id", existing.id);
  }

  return NextResponse.json({ ok: true });
}
