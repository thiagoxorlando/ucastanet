import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import AgencyContracts, { type AgencyContract } from "@/features/agency/AgencyContracts";
import WorkspacePremiumContracts, { type PremiumContract } from "@/features/agency/WorkspacePremiumContracts";
import { buildContractFileAccessUrl } from "@/lib/contractFiles";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Contratos Premium — BrisaHub" };

export default async function WorkspaceContractsPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspaceJobs } = await supabase
    .from("jobs")
    .select("id, title, created_by_user_id")
    .eq("workspace_id", context.workspace.id);

  const visibleJobs = context.isOwner
    ? (workspaceJobs ?? [])
    : (workspaceJobs ?? []).filter((job) => job.created_by_user_id === context.userId);

  const jobIds      = visibleJobs.map((job) => job.id);
  const jobTitleMap = new Map(visibleJobs.map((job) => [job.id, job.title ?? "Vaga do workspace"]));

  if (jobIds.length === 0) {
    return (
      <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <p className="text-[15px] font-semibold text-zinc-900">Nenhum contrato Premium ainda.</p>
        <p className="mt-2 text-[13px] leading-6 text-zinc-500">
          Os contratos ligados às vagas privadas do workspace aparecerão aqui.
        </p>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("contracts")
    .select("id, job_id, talent_id, job_date, job_time, location, job_description, payment_amount, commission_amount, net_amount, commission_percent, payment_method, additional_notes, status, payment_status, contract_file_url, signed_contract_url, created_at, signed_at, agency_signed_at, deposit_paid_at, paid_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  const contractsData = rows ?? [];
  const talentIds     = [...new Set(contractsData.map((c) => c.talent_id).filter((id): id is string => !!id))];

  const talentNameMap:   Map<string, string>      = new Map();
  const talentAvatarMap: Map<string, string|null> = new Map();
  if (talentIds.length > 0) {
    const { data: talents } = await supabase
      .from("talent_profiles")
      .select("id, full_name, avatar_url")
      .in("id", talentIds);
    for (const t of talents ?? []) {
      talentNameMap.set(t.id, t.full_name ?? "Talento");
      talentAvatarMap.set(t.id, (t as { avatar_url?: string | null }).avatar_url ?? null);
    }
  }

  // Owner → full AgencyContracts component
  if (context.isOwner) {
    const contracts: AgencyContract[] = contractsData.map((c) => ({
      id:               c.id,
      jobId:            c.job_id ?? null,
      jobTitle:         c.job_id ? (jobTitleMap.get(c.job_id) ?? "Vaga do workspace") : "Vaga do workspace",
      talentId:         c.talent_id ?? null,
      talentName:       c.talent_id ? (talentNameMap.get(c.talent_id) ?? "Talento") : "Talento",
      jobDate:          c.job_date ?? null,
      jobTime:          c.job_time ?? null,
      location:         c.location ?? null,
      jobDescription:   c.job_description ?? null,
      paymentAmount:    c.payment_amount ?? 0,
      paymentMethod:    c.payment_method ?? null,
      additionalNotes:  c.additional_notes ?? null,
      status:           c.status ?? "sent",
      paymentStatus:    c.payment_status ?? "pending",
      createdAt:        c.created_at ?? "",
      signedAt:         c.signed_at ?? null,
      agencySignedAt:   c.agency_signed_at ?? null,
      depositPaidAt:    c.deposit_paid_at ?? null,
      paidAt:           c.paid_at ?? null,
      contractFileUrl:  c.contract_file_url ? buildContractFileAccessUrl(c.id, "original") : null,
      signedContractUrl: c.signed_contract_url ? buildContractFileAccessUrl(c.id, "signed") : null,
    }));
    return <AgencyContracts contracts={contracts} bookingsHref="/agency/workspace/bookings" />;
  }

  // Agent → polished premium view
  const premiumContracts: PremiumContract[] = contractsData.map((c) => ({
    id:               c.id,
    jobId:            c.job_id ?? null,
    jobTitle:         c.job_id ? (jobTitleMap.get(c.job_id) ?? "Vaga do workspace") : "Vaga do workspace",
    talentName:       c.talent_id ? (talentNameMap.get(c.talent_id) ?? "Talento") : "Talento",
    talentAvatarUrl:  c.talent_id ? (talentAvatarMap.get(c.talent_id) ?? null) : null,
    status:           c.status ?? "sent",
    paymentAmount:    c.payment_amount ?? 0,
    commissionAmount: c.commission_amount ?? 0,
    netAmount:        c.net_amount ?? 0,
    jobDate:          c.job_date ?? null,
    location:         c.location ?? null,
    createdAt:        c.created_at ?? "",
    signedAt:         c.signed_at ?? null,
    paidAt:           c.paid_at ?? null,
    contractFileUrl:  c.contract_file_url ? buildContractFileAccessUrl(c.id, "original") : null,
    signedContractUrl: c.signed_contract_url ? buildContractFileAccessUrl(c.id, "signed") : null,
  }));

  return <WorkspacePremiumContracts contracts={premiumContracts} lang={context.lang} />;
}
