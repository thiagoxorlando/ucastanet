import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

// ─── Password helpers ────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function resolveWorkspaceMember(userId: string, workspaceId: string) {
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase
    .from("premium_workspace_members")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

// ─── POST — create presentation ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    jobId?: string;
    submissionIds?: string[];
    title?: string;
    intro?: string;
    password?: string;
    expiresAt?: string;
    workspaceId?: string;
  };

  const { jobId, submissionIds, title, intro, password, expiresAt, workspaceId } = body;

  if (!workspaceId) return NextResponse.json({ error: "workspaceId obrigatório." }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório." }, { status: 400 });
  if (!submissionIds?.length) return NextResponse.json({ error: "Selecione ao menos um candidato." }, { status: 400 });

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const member = await resolveWorkspaceMember(user.id, workspaceId);
  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Verify all submissions belong to this workspace's job
  if (jobId) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("id, job_id")
      .in("id", submissionIds);
    const allBelong = (subs ?? []).every((s) => s.job_id === jobId);
    if (!allBelong) return NextResponse.json({ error: "Candidatura inválida." }, { status: 400 });
  }

  const token        = crypto.randomBytes(16).toString("hex");
  const passwordHash = password?.trim() ? hashPassword(password.trim()) : null;

  const { data: presentation, error } = await supabase
    .from("workspace_presentations")
    .insert({
      workspace_id:       workspaceId,
      job_id:             jobId ?? null,
      title:              title.trim(),
      intro:              intro?.trim() || null,
      token,
      password_hash:      passwordHash,
      expires_at:         expiresAt || null,
      created_by_user_id: user.id,
    })
    .select("id, token")
    .single();

  if (error || !presentation) {
    return NextResponse.json({ error: error?.message ?? "Erro ao criar apresentação." }, { status: 400 });
  }

  // Insert candidates in position order
  const candidateRows = submissionIds.map((submissionId, i) => ({
    presentation_id: presentation.id,
    submission_id:   submissionId,
    position:        i,
  }));

  await supabase.from("workspace_presentation_candidates").insert(candidateRows);

  return NextResponse.json({ ok: true, token: presentation.token, presentationId: presentation.id });
}

// ─── GET — list presentations for a job ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId      = searchParams.get("jobId");
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) return NextResponse.json({ error: "workspaceId obrigatório." }, { status: 400 });

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const member = await resolveWorkspaceMember(user.id, workspaceId);
  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  let query = supabase
    .from("workspace_presentations")
    .select("id, title, token, intro, expires_at, view_count, created_at, password_hash, job_id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (jobId) query = query.eq("job_id", jobId);

  const { data: rows } = await query;

  if (!rows?.length) return NextResponse.json({ presentations: [] });

  const presentationIds = rows.map((r) => r.id);

  const [candsResult, feedbackResult] = await Promise.all([
    supabase
      .from("workspace_presentation_candidates")
      .select("presentation_id, submission_id")
      .in("presentation_id", presentationIds),
    supabase
      .from("presentation_feedback")
      .select("presentation_id, vote")
      .in("presentation_id", presentationIds),
  ]);

  // Count candidates and collect submission IDs per presentation
  const candCount  = new Map<string, number>();
  const subIdsMap  = new Map<string, string[]>();
  for (const c of candsResult.data ?? []) {
    candCount.set(c.presentation_id, (candCount.get(c.presentation_id) ?? 0) + 1);
    const list = subIdsMap.get(c.presentation_id) ?? [];
    list.push(c.submission_id);
    subIdsMap.set(c.presentation_id, list);
  }

  // Aggregate feedback per presentation
  const fbMap = new Map<string, { approved: number; rejected: number; favorite: number }>();
  for (const f of feedbackResult.data ?? []) {
    const cur = fbMap.get(f.presentation_id) ?? { approved: 0, rejected: 0, favorite: 0 };
    if (f.vote === "approved")  cur.approved++;
    if (f.vote === "rejected")  cur.rejected++;
    if (f.vote === "favorite")  cur.favorite++;
    fbMap.set(f.presentation_id, cur);
  }

  const presentations = rows.map((r) => ({
    id:              r.id,
    title:           r.title,
    token:           r.token,
    expiresAt:       r.expires_at ?? null,
    viewCount:       r.view_count ?? 0,
    createdAt:       r.created_at,
    hasPassword:     !!r.password_hash,
    candidateCount:  candCount.get(r.id) ?? 0,
    feedbackSummary: fbMap.get(r.id) ?? { approved: 0, rejected: 0, favorite: 0 },
    submissionIds:   subIdsMap.get(r.id) ?? [],
  }));

  return NextResponse.json({ presentations });
}
