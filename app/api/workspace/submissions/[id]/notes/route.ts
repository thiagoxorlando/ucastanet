import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { body?: string };
  const noteBody = (body.body ?? "").trim();

  if (!noteBody) return NextResponse.json({ error: "Nota não pode ser vazia." }, { status: 400 });

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
    .select("workspace_id")
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

  // Resolve author display name from agencies table
  const { data: agency } = await supabase
    .from("agencies")
    .select("company_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const authorName = agency?.company_name ?? user.email ?? "Membro da equipe";

  const { data: note, error } = await supabase
    .from("submission_pipeline_notes")
    .insert({
      submission_id:  id,
      workspace_id:   job.workspace_id,
      author_user_id: user.id,
      author_name:    authorName,
      body:           noteBody,
    })
    .select("id, author_name, body, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, note });
}
