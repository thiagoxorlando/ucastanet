import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

const VALID_PIPELINE_STATUSES = [
  "novo", "em_analise", "shortlist", "aguardando_cliente", "aprovado", "rejeitado",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { pipeline_status?: string };
  const nextStatus = body.pipeline_status;

  if (!nextStatus || !VALID_PIPELINE_STATUSES.includes(nextStatus as typeof VALID_PIPELINE_STATUSES[number])) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  // Fetch submission → job → workspace
  const { data: submission } = await supabase
    .from("submissions")
    .select("id, job_id")
    .eq("id", id)
    .single();
  if (!submission) return NextResponse.json({ error: "Candidatura não encontrada." }, { status: 404 });

  const { data: job } = await supabase
    .from("jobs")
    .select("workspace_id, created_by_user_id, agency_id")
    .eq("id", submission.job_id)
    .single();
  if (!job?.workspace_id) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });

  // Verify caller is an active workspace member
  const { data: member } = await supabase
    .from("premium_workspace_members")
    .select("role, status")
    .eq("workspace_id", job.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  // Only workspace owner or job creator can move candidates
  const isOwner   = member.role === "owner";
  const isCreator = (job as { created_by_user_id?: string | null }).created_by_user_id === user.id;
  if (!isOwner && !isCreator) {
    return NextResponse.json({ error: "Apenas o proprietário ou criador da vaga pode mover candidatos." }, { status: 403 });
  }

  const { error } = await supabase
    .from("submissions")
    .update({ pipeline_status: nextStatus })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, pipeline_status: nextStatus });
}
