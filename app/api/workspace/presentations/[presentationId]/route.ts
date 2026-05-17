import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ presentationId: string }> }
) {
  const { presentationId } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: presentation } = await supabase
    .from("workspace_presentations")
    .select("id, workspace_id, created_by_user_id")
    .eq("id", presentationId)
    .single();

  if (!presentation) return NextResponse.json({ error: "Apresentação não encontrada." }, { status: 404 });

  const { data: member } = await supabase
    .from("premium_workspace_members")
    .select("role, status")
    .eq("workspace_id", presentation.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const isOwner   = member.role === "owner";
  const isCreator = presentation.created_by_user_id === user.id;
  if (!isOwner && !isCreator) {
    return NextResponse.json({ error: "Apenas o criador ou proprietário pode excluir." }, { status: 403 });
  }

  await supabase.from("workspace_presentations").delete().eq("id", presentationId);

  return NextResponse.json({ ok: true });
}
