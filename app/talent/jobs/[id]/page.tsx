import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getLivePlanSetting } from "@/lib/planSettings.server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { isJobOpenForApplications, JOB_UNAVAILABLE_MESSAGE } from "@/lib/jobAvailability";
import { PLAN_DEFINITIONS, type Plan } from "@/lib/plans";
import TalentJobDetail from "@/features/talent/TalentJobDetail";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase.from("jobs").select("title").eq("id", id).single();
  return { title: data ? `${data.title} — BrisaHub` : "Vaga — BrisaHub" };
}

export default async function TalentJobDetailPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const inviteToken = typeof query.invite === "string" ? query.invite.trim() : null;
  const supabase = createServerClient({ useServiceRole: true });
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) redirect("/login");

  const [jobRes, profileRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, description, category, budget, deadline, agency_id, location, gender, age_min, age_max, visibility, status, deleted_at, number_of_talents_required, application_requirements")
      .eq("id", id)
      .single()
      .then(async (res) => {
        if (res.error?.message?.includes("application_requirements")) {
          return supabase
            .from("jobs")
            .select("id, title, description, category, budget, deadline, agency_id, location, gender, age_min, age_max, visibility, status, deleted_at, number_of_talents_required")
            .eq("id", id)
            .single();
        }
        return res;
      }),
    supabase.from("talent_profiles").select("gender, age").eq("id", user.id).single(),
  ]);
  const data = jobRes.data;
  const talentProfile = profileRes.data;

  if (!data || data.status === "inactive") return notFound();

  if (data.visibility === "private") {
    const [{ data: invite }, { data: history }, { data: referralInvite }] = await Promise.all([
      supabase
        .from("job_invites")
        .select("id")
        .eq("job_id", id)
        .eq("talent_id", user.id)
        .maybeSingle(),
      data.agency_id
        ? supabase
            .from("agency_talent_history")
            .select("talent_id")
            .eq("agency_id", data.agency_id)
            .eq("talent_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("referral_invites")
        .select("id")
        .eq("job_id", id)
        .eq("referred_user_id", user.id)
        .neq("status", "fraud_reported")
        .maybeSingle(),
    ]);

    if (!invite && !history && !referralInvite) {
      return notFound();
    }
  }

  if (data.visibility === "private_invite") {
    let hasAccess = false;

    if (inviteToken) {
      const { data: link } = await supabase
        .from("job_invite_links")
        .select("id, status, expires_at, revoked_at")
        .eq("token", inviteToken)
        .eq("job_id", id)
        .maybeSingle();

      hasAccess = !!(
        link &&
        link.status === "active" &&
        !link.revoked_at &&
        (!link.expires_at || new Date(link.expires_at) > new Date())
      );
    }

    if (!hasAccess) {
      // Also allow if talent already applied (so they can view their application)
      const { data: existingSub } = await supabase
        .from("submissions")
        .select("id")
        .eq("job_id", id)
        .eq("talent_user_id", user.id)
        .maybeSingle();
      hasAccess = !!existingSub;
    }

    if (!hasAccess) return notFound();
  }

  let agencyName = "";
  let agencyPlan = "free";
  let isAvailableForApplications = true;
  let liveCommissionRate = PLAN_DEFINITIONS.free.commissionRate;
  if (data.agency_id) {
    const [{ data: agency }, { data: agencyProfile }] = await Promise.all([
      supabase.from("agencies").select("company_name").eq("id", data.agency_id).single(),
      supabase.from("profiles").select("plan").eq("id", data.agency_id).single(),
    ]);
    agencyName = agency?.company_name ?? "";
    agencyPlan = agencyProfile?.plan ?? "free";

    const [{ count: activeHires }, liveSetting] = await Promise.all([
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id)
        .not("status", "in", '("cancelled","rejected")')
        .is("deleted_at", null),
      getLivePlanSetting((agencyProfile?.plan ?? "free") as Plan),
    ]);

    liveCommissionRate = liveSetting.commission_rate;
    isAvailableForApplications = isJobOpenForApplications({
      status: data.status ?? null,
      deletedAt: (data as { deleted_at?: string | null }).deleted_at ?? null,
      currentHires: activeHires ?? 0,
      talentsNeeded: (data as { number_of_talents_required?: number | null }).number_of_talents_required ?? 1,
      maxHiresPerJob: liveSetting.max_hires_per_job,
    });
  }

  const job = {
    id:          String(data.id),
    title:       data.title       ?? "",
    description: data.description ?? "",
    category:    data.category    ?? "",
    budget:      data.budget      ?? 0,
    deadline:    data.deadline    ?? "",
    agencyName,
    agencyPlan,
    location:    data.location    ?? "",
    gender:      data.gender      ?? "",
    ageMin:      data.age_min     ?? null,
    ageMax:      data.age_max     ?? null,
    applicationRequirements: (data as { application_requirements?: string[] }).application_requirements ?? [],
    isAvailableForApplications,
    availabilityMessage: JOB_UNAVAILABLE_MESSAGE,
  };

  return (
    <TalentJobDetail
      job={job}
      talentGender={talentProfile?.gender ?? null}
      talentAge={talentProfile?.age ?? null}
      liveCommissionRate={liveCommissionRate}
      inviteToken={inviteToken}
    />
  );
}
