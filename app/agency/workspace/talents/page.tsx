import type { Metadata } from "next";
import WorkspaceTalentsBoard, {
  type WorkspaceTalentCard,
} from "@/features/agency/WorkspaceTalentsBoard";
import { createServerClient } from "@/lib/supabase";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Talentos convidados - BrisaHub" };

type InvitedTalent = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitles: string[];
  status: "Contratado" | "Candidatou-se";
  lastActivity: string;
  applicationCount: number;
  contractCount: number;
};

type PortalMember = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  applicationCount: number;
  contractCount: number;
  status: "active" | "removed";
};

type TalentProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

async function getTalentProfileMap(
  supabase: ReturnType<typeof createServerClient>,
  userIds: string[],
) {
  if (userIds.length === 0) return new Map<string, TalentProfileRow>();

  const [byUserIdResult, byIdResult] = await Promise.all([
    supabase
      .from("talent_profiles")
      .select("id, user_id, full_name, avatar_url")
      .in("user_id", userIds),
    supabase
      .from("talent_profiles")
      .select("id, user_id, full_name, avatar_url")
      .in("id", userIds),
  ]);

  const profileMap = new Map<string, TalentProfileRow>();
  const rows = [...(byUserIdResult.data ?? []), ...(byIdResult.data ?? [])];
  for (const row of rows) {
    profileMap.set(String(row.user_id ?? row.id), {
      id: String(row.id),
      user_id: (row.user_id as string | null) ?? null,
      full_name: (row.full_name as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
    });
  }

  return profileMap;
}

export default async function WorkspaceTalentsPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });
  const workspaceId = context.workspace.id;

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title, created_by_user_id")
    .eq("workspace_id", workspaceId);

  const visibleJobs = context.isOwner
    ? (allJobs ?? [])
    : (allJobs ?? []).filter((job) => job.created_by_user_id === context.userId);

  const jobIds = visibleJobs.map((job) => job.id);
  const jobTitleMap = new Map(visibleJobs.map((job) => [job.id, job.title ?? "Vaga privada"]));

  const { data: portalMemberRows } = await supabase
    .from("premium_workspace_talents")
    .select("talent_user_id, status, joined_at, created_at")
    .eq("workspace_id", workspaceId)
    .is("removed_at", null)
    .order("created_at", { ascending: false });

  const portalMemberIds = [...new Set((portalMemberRows ?? []).map((member) => String(member.talent_user_id)))];

  const [portalSubsResult, portalContractsResult, submissionsResult, bookingsResult, authResult] = await Promise.all([
    portalMemberIds.length && jobIds.length
      ? supabase
          .from("submissions")
          .select("talent_user_id, job_id")
          .in("talent_user_id", portalMemberIds)
          .in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
    portalMemberIds.length && jobIds.length
      ? supabase
          .from("contracts")
          .select("talent_id, job_id")
          .in("talent_id", portalMemberIds)
          .in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
    jobIds.length
      ? supabase
          .from("submissions")
          .select("talent_user_id, job_id, created_at")
          .in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
    jobIds.length
      ? supabase
          .from("bookings")
          .select("talent_user_id, job_id")
          .in("job_id", jobIds)
          .not("status", "eq", "cancelled")
      : Promise.resolve({ data: [] }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const submissions = submissionsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const bookedSet = new Set(bookings.map((booking) => String(booking.talent_user_id)).filter(Boolean));

  type TalentAgg = {
    jobIds: Set<string>;
    latestActivity: string;
    applicationCount: number;
    contractCount: number;
  };

  const invitedAggMap = new Map<string, TalentAgg>();

  for (const submission of submissions) {
    if (!submission.talent_user_id) continue;
    const uid = String(submission.talent_user_id);
    const existing = invitedAggMap.get(uid);
    if (existing) {
      existing.jobIds.add(String(submission.job_id));
      existing.applicationCount += 1;
      if ((submission.created_at ?? "") > existing.latestActivity) {
        existing.latestActivity = submission.created_at ?? "";
      }
    } else {
      invitedAggMap.set(uid, {
        jobIds: new Set([String(submission.job_id)]),
        latestActivity: submission.created_at ?? "",
        applicationCount: 1,
        contractCount: 0,
      });
    }
  }

  for (const booking of bookings) {
    if (!booking.talent_user_id) continue;
    const uid = String(booking.talent_user_id);
    const existing = invitedAggMap.get(uid);
    if (existing) {
      existing.jobIds.add(String(booking.job_id));
      existing.contractCount += 1;
    } else {
      invitedAggMap.set(uid, {
        jobIds: new Set([String(booking.job_id)]),
        latestActivity: "",
        applicationCount: 0,
        contractCount: 1,
      });
    }
  }

  const invitedTalentIds = Array.from(invitedAggMap.keys());
  const allTalentIds = [...new Set([...portalMemberIds, ...invitedTalentIds])];
  const profileMap = await getTalentProfileMap(supabase, allTalentIds);

  const authEmailMap = new Map(
    ((authResult.data?.users ?? []) as Array<{ id: string; email?: string }>).map((user) => [user.id, user.email ?? ""]),
  );

  const portalSubCountMap = new Map<string, number>();
  for (const submission of portalSubsResult.data ?? []) {
    const uid = String(submission.talent_user_id);
    portalSubCountMap.set(uid, (portalSubCountMap.get(uid) ?? 0) + 1);
  }

  const portalContractCountMap = new Map<string, number>();
  for (const contract of portalContractsResult.data ?? []) {
    const uid = String(contract.talent_id);
    portalContractCountMap.set(uid, (portalContractCountMap.get(uid) ?? 0) + 1);
  }

  const portalMembers: PortalMember[] = (portalMemberRows ?? []).map((member) => {
    const uid = String(member.talent_user_id);
    const profile = profileMap.get(uid);
    const name = profile?.full_name || authEmailMap.get(uid) || "Talento";
    return {
      userId: uid,
      name,
      email: authEmailMap.get(uid) ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      joinedAt: String(member.joined_at ?? member.created_at ?? ""),
      applicationCount: portalSubCountMap.get(uid) ?? 0,
      contractCount: portalContractCountMap.get(uid) ?? 0,
      status: member.status === "active" ? "active" : "removed",
    };
  });

  const invitedTalents: InvitedTalent[] = invitedTalentIds
    .map((uid) => {
      const profile = profileMap.get(uid);
      const agg = invitedAggMap.get(uid);
      if (!agg) return null;
      return {
        userId: uid,
        name: profile?.full_name ?? authEmailMap.get(uid) ?? "Talento",
        email: authEmailMap.get(uid) ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        jobTitles: Array.from(agg.jobIds).map((jobId) => jobTitleMap.get(jobId) ?? "Vaga privada"),
        status: bookedSet.has(uid) ? "Contratado" : "Candidatou-se",
        lastActivity: agg.latestActivity,
        applicationCount: agg.applicationCount,
        contractCount: agg.contractCount,
      } satisfies InvitedTalent;
    })
    .filter((talent): talent is InvitedTalent => talent !== null)
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "Contratado" ? -1 : 1;
      return (right.lastActivity || "").localeCompare(left.lastActivity || "");
    });

  const talentCardMap = new Map<string, WorkspaceTalentCard>();

  for (const member of portalMembers) {
    talentCardMap.set(member.userId, {
      userId: member.userId,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatarUrl,
      joinedAt: member.joinedAt,
      lastActivity: "",
      applicationCount: member.applicationCount,
      contractCount: member.contractCount,
      jobTitles: [],
      isPortalMember: true,
      isCandidate: member.applicationCount > 0,
      isContracted: member.contractCount > 0,
    });
  }

  for (const invitedTalent of invitedTalents) {
    const existing = talentCardMap.get(invitedTalent.userId);
    if (existing) {
      existing.email = existing.email || invitedTalent.email;
      existing.avatarUrl = existing.avatarUrl ?? invitedTalent.avatarUrl;
      existing.lastActivity = invitedTalent.lastActivity || existing.lastActivity;
      existing.applicationCount = Math.max(existing.applicationCount, invitedTalent.applicationCount);
      existing.contractCount = Math.max(existing.contractCount, invitedTalent.contractCount);
      existing.jobTitles = [...new Set([...existing.jobTitles, ...invitedTalent.jobTitles])];
      existing.isCandidate = true;
      if (invitedTalent.status === "Contratado") existing.isContracted = true;
      continue;
    }

    talentCardMap.set(invitedTalent.userId, {
      userId: invitedTalent.userId,
      name: invitedTalent.name,
      email: invitedTalent.email,
      avatarUrl: invitedTalent.avatarUrl,
      joinedAt: "",
      lastActivity: invitedTalent.lastActivity,
      applicationCount: invitedTalent.applicationCount,
      contractCount: invitedTalent.contractCount,
      jobTitles: invitedTalent.jobTitles,
      isPortalMember: false,
      isCandidate: true,
      isContracted: invitedTalent.status === "Contratado",
    });
  }

  const talents = Array.from(talentCardMap.values()).sort((left, right) => {
    if (left.isContracted !== right.isContracted) return left.isContracted ? -1 : 1;
    if (left.isPortalMember !== right.isPortalMember) return left.isPortalMember ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  return <WorkspaceTalentsBoard talents={talents} workspaceSlug={context.workspace.slug} />;
}
