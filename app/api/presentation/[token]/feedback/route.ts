import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const VALID_VOTES = ["approved", "rejected", "favorite"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({})) as {
    submissionId?: string;
    vote?: string;
    clientToken?: string;
    viewerName?: string;
    viewerCompany?: string;
    viewerEmail?: string;
  };

  const { submissionId, vote, clientToken, viewerName, viewerCompany, viewerEmail } = body;

  if (!submissionId || !clientToken) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (!vote || !VALID_VOTES.includes(vote as typeof VALID_VOTES[number])) {
    return NextResponse.json({ error: "Voto inválido." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Resolve presentation
  const { data: presentation } = await supabase
    .from("workspace_presentations")
    .select("id, expires_at")
    .eq("token", token)
    .single();

  if (!presentation) return NextResponse.json({ error: "Apresentação não encontrada." }, { status: 404 });

  if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Apresentação expirada." }, { status: 410 });
  }

  // Verify submission is part of this presentation
  const { data: pCand } = await supabase
    .from("workspace_presentation_candidates")
    .select("id")
    .eq("presentation_id", presentation.id)
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (!pCand) return NextResponse.json({ error: "Candidato não encontrado." }, { status: 404 });

  // UPSERT: one vote per (presentation, submission, client_token)
  // Persist viewer identity alongside the vote for agency attribution.
  const { error } = await supabase
    .from("presentation_feedback")
    .upsert(
      {
        presentation_id: presentation.id,
        submission_id:   submissionId,
        client_token:    clientToken,
        vote,
        viewer_name:    viewerName?.trim()    || null,
        viewer_company: viewerCompany?.trim() || null,
        viewer_email:   viewerEmail?.trim()   || null,
      },
      { onConflict: "presentation_id,submission_id,client_token" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
