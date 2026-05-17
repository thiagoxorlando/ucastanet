import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import WorkspacePipelineBoard, {
  type PipelineJob,
  type PipelineCandidate,
  type PipelineNote,
  type PresentationSummary,
} from "@/features/agency/WorkspacePipelineBoard";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase.from("jobs").select("title").eq("id", id).single();
  return { title: data ? `${data.title} — BrisaHub Premium` : "Vaga privada — BrisaHub" };
}

export default async function WorkspaceJobDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) redirect("/login");

  const workspaceAccess = await getUserPremiumWorkspace(user.id);
  if (!workspaceAccess || workspaceAccess.membership.status !== "active") notFound();

  const isWorkspaceOwner = workspaceAccess.membership.role === "owner";

  const { data: jobData } = await supabase
    .from("jobs")
    .select(
      "id, title, description, category, budget, deadline, job_date, job_time, location, status, created_at, number_of_talents_required, visibility, invite_only, workspace_id, agency_id, created_by_user_id"
    )
    .eq("id", id)
    .single();

  if (!jobData) notFound();

  const workspaceId = (jobData as { workspace_id?: string | null }).workspace_id ?? null;
  if (!workspaceId || workspaceAccess.workspace.id !== workspaceId) notFound();

  const createdByUserId = (jobData as { created_by_user_id?: string | null }).created_by_user_id ?? null;
  const isJobCreator = createdByUserId === user.id;
  const readOnly = !isWorkspaceOwner && !isJobCreator;

  const [{ data: submissionsData }, { data: bookingsData }] = await Promise.all([
    supabase
      .from("submissions")
      .select(
        "id, talent_user_id, talent_name, referrer_id, bio, status, pipeline_status, mode, created_at, photo_front_url, photo_left_url, photo_right_url, video_url, curriculum_url, portfolio_url"
      )
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select(`
        id, talent_user_id, job_title, price, status, created_at,
        contracts!contracts_booking_id_fkey ( id )
      `)
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const submissions = submissionsData ?? [];
  const bookings   = bookingsData   ?? [];

  const talentIds = [
    ...new Set(
      [
        ...submissions.map((s) => s.talent_user_id),
        ...bookings.map((b) => b.talent_user_id),
      ].filter((tid): tid is string => !!tid)
    ),
  ];

  const submissionIds = submissions.map((s) => s.id).filter(Boolean);

  const [profilesResult, notesResult, presResult] = await Promise.all([
    talentIds.length
      ? supabase
          .from("talent_profiles")
          .select("id, full_name, avatar_url, age, city, gender")
          .in("id", talentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null; age: number | null; city: string | null; gender: string | null }> }),
    submissionIds.length
      ? supabase
          .from("submission_pipeline_notes")
          .select("id, submission_id, author_name, body, created_at")
          .in("submission_id", submissionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; submission_id: string; author_name: string; body: string; created_at: string }> }),
    supabase
      .from("workspace_presentations")
      .select("id, title, token, expires_at, view_count, created_at, password_hash")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const presIds = (presResult.data ?? []).map((p) => p.id);

  const [presCandResult, feedbackResult] = await Promise.all([
    presIds.length
      ? supabase
          .from("workspace_presentation_candidates")
          .select("presentation_id")
          .in("presentation_id", presIds)
      : Promise.resolve({ data: [] as Array<{ presentation_id: string }> }),
    presIds.length
      ? supabase
          .from("presentation_feedback")
          .select("presentation_id, vote")
          .in("presentation_id", presIds)
      : Promise.resolve({ data: [] as Array<{ presentation_id: string; vote: string }> }),
  ]);

  const profileMap = new Map<string, { full_name: string; avatar_url: string | null; age: number | null; city: string | null; gender: string | null }>();
  for (const p of profilesResult.data ?? []) {
    profileMap.set(p.id, {
      full_name:  p.full_name  ?? "",
      avatar_url: p.avatar_url ?? null,
      age:        p.age        ?? null,
      city:       p.city       ?? null,
      gender:     p.gender     ?? null,
    });
  }

  // Group notes by submission id
  const notesMap = new Map<string, PipelineNote[]>();
  for (const n of notesResult.data ?? []) {
    const list = notesMap.get(n.submission_id) ?? [];
    list.push({ id: n.id, authorName: n.author_name, body: n.body, createdAt: n.created_at });
    notesMap.set(n.submission_id, list);
  }

  // Index bookings by talent_user_id (most recent booking wins for this job)
  const bookingByTalent = new Map<string, { bookingId: string; bookingStatus: string; contractId: string | null }>();
  for (const b of bookings) {
    if (!b.talent_user_id) continue;
    const contractArr = Array.isArray((b as { contracts?: Array<{ id?: string | null }> }).contracts)
      ? ((b as { contracts?: Array<{ id?: string | null }> }).contracts ?? [])
      : [];
    bookingByTalent.set(b.talent_user_id, {
      bookingId:     String(b.id),
      bookingStatus: b.status ?? "pending",
      contractId:    contractArr[0]?.id ?? null,
    });
  }

  const candidates: PipelineCandidate[] = submissions.map((s) => {
    const profile  = s.talent_user_id ? profileMap.get(s.talent_user_id) : null;
    const booking  = s.talent_user_id ? bookingByTalent.get(s.talent_user_id) : null;
    return {
      id:            String(s.id),
      talentId:      s.talent_user_id ?? null,
      talentName:    profile?.full_name ?? s.talent_name ?? "",
      avatarUrl:     profile?.avatar_url ?? null,
      age:           profile?.age    ?? null,
      city:          profile?.city   ?? null,
      country:       null,
      gender:        profile?.gender ?? null,
      bio:           s.bio ?? "",
      pipelineStatus: (s as { pipeline_status?: string | null }).pipeline_status ?? "novo",
      submittedAt:   s.created_at ?? "",
      isReferral:    Boolean(s.referrer_id),
      photoFrontUrl: s.photo_front_url  ?? null,
      photoLeftUrl:  s.photo_left_url   ?? null,
      photoRightUrl: s.photo_right_url  ?? null,
      videoUrl:      s.video_url        ?? null,
      curriculumUrl: s.curriculum_url   ?? null,
      portfolioUrl:  s.portfolio_url    ?? null,
      bookingId:     booking?.bookingId     ?? null,
      bookingStatus: booking?.bookingStatus ?? null,
      contractId:    booking?.contractId    ?? null,
      notes:         notesMap.get(String(s.id)) ?? [],
    };
  });

  // Build presentations list with counts + feedback
  const presRows = presResult.data ?? [];

  const presCandCount = new Map<string, number>();
  for (const c of presCandResult.data ?? []) {
    presCandCount.set(c.presentation_id, (presCandCount.get(c.presentation_id) ?? 0) + 1);
  }

  const presFbMap = new Map<string, PresentationSummary["feedbackSummary"]>();
  for (const f of feedbackResult.data ?? []) {
    const cur = presFbMap.get(f.presentation_id) ?? { approved: 0, rejected: 0, favorite: 0 };
    if (f.vote === "approved")  cur.approved++;
    if (f.vote === "rejected")  cur.rejected++;
    if (f.vote === "favorite")  cur.favorite++;
    presFbMap.set(f.presentation_id, cur);
  }

  const presentations: PresentationSummary[] = presRows.map((p) => ({
    id:              p.id,
    title:           p.title,
    token:           p.token,
    expiresAt:       (p as { expires_at?: string | null }).expires_at ?? null,
    viewCount:       (p as { view_count?: number }).view_count ?? 0,
    createdAt:       p.created_at,
    hasPassword:     !!(p as { password_hash?: string | null }).password_hash,
    candidateCount:  presCandCount.get(p.id) ?? 0,
    feedbackSummary: presFbMap.get(p.id) ?? { approved: 0, rejected: 0, favorite: 0 },
  }));

  const job: PipelineJob = {
    id:                     String(jobData.id),
    title:                  jobData.title        ?? "",
    status:                 jobData.status       ?? "open",
    visibility:             (jobData.visibility  ?? "public") as string,
    budget:                 jobData.budget       ?? 0,
    deadline:               jobData.deadline     ?? null,
    jobDate:                jobData.job_date      ?? null,
    jobTime:                (jobData as { job_time?: string | null }).job_time  ?? null,
    location:               (jobData as { location?: string | null }).location  ?? null,
    description:            jobData.description  ?? "",
    category:               jobData.category     ?? "",
    numberOfTalentsRequired: jobData.number_of_talents_required ?? 1,
    workspaceId:            workspaceId,
    agencyId:               String(jobData.agency_id ?? user.id),
  };

  return (
    <WorkspacePipelineBoard
      job={job}
      candidates={candidates}
      presentations={presentations}
      userId={user.id}
      isOwner={isWorkspaceOwner}
      readOnly={readOnly}
    />
  );
}
