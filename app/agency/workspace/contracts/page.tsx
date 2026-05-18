import type { Metadata } from "next";
import AgencyContracts, { type AgencyContract } from "@/features/agency/AgencyContracts";
import WorkspacePremiumContracts, { type PremiumContract } from "@/features/agency/WorkspacePremiumContracts";
import { buildContractFileAccessUrl } from "@/lib/contractFiles";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Contratos Premium - BrisaHub" };

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

  const jobIds = visibleJobs.map((job) => job.id);
  const jobTitleMap = new Map(visibleJobs.map((job) => [job.id, job.title ?? "Vaga do workspace"]));

  if (jobIds.length === 0) {
    return (
      <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <p className="text-[15px] font-semibold text-zinc-900">Nenhum contrato Premium ainda.</p>
        <p className="mt-2 text-[13px] leading-6 text-zinc-500">
          Os contratos ligados as vagas privadas do workspace aparecerao aqui.
        </p>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("contracts")
    .select("id, job_id, talent_id, talent_user_id, job_date, job_time, location, job_description, payment_amount, commission_amount, net_amount, commission_percent, payment_method, additional_notes, status, payment_status, contract_file_url, signed_contract_url, created_at, signed_at, agency_signed_at, deposit_paid_at, paid_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  const contractsData = rows ?? [];
  const talentIds = [...new Set(
    contractsData
      .map((contract) => contract.talent_user_id ?? contract.talent_id)
      .filter((id): id is string => !!id),
  )];

  const talentNameMap: Map<string, string> = new Map();
  const talentAvatarMap: Map<string, string | null> = new Map();
  if (talentIds.length > 0) {
    const { data: talents } = await supabase
      .from("talent_profiles")
      .select("id, full_name, avatar_url")
      .in("id", talentIds);
    for (const talent of talents ?? []) {
      talentNameMap.set(talent.id, talent.full_name ?? "Talento");
      talentAvatarMap.set(talent.id, (talent as { avatar_url?: string | null }).avatar_url ?? null);
    }
  }

  if (context.isOwner) {
    const contracts: AgencyContract[] = contractsData.map((contract) => {
      const talentId = contract.talent_user_id ?? contract.talent_id ?? null;
      return {
        id: contract.id,
        jobId: contract.job_id ?? null,
        jobTitle: contract.job_id ? (jobTitleMap.get(contract.job_id) ?? "Vaga do workspace") : "Vaga do workspace",
        talentId,
        talentName: talentId ? (talentNameMap.get(talentId) ?? "Talento") : "Talento",
        jobDate: contract.job_date ?? null,
        jobTime: contract.job_time ?? null,
        location: contract.location ?? null,
        jobDescription: contract.job_description ?? null,
        paymentAmount: contract.payment_amount ?? 0,
        paymentMethod: contract.payment_method ?? null,
        additionalNotes: contract.additional_notes ?? null,
        status: contract.status ?? "sent",
        paymentStatus: contract.payment_status ?? "pending",
        createdAt: contract.created_at ?? "",
        signedAt: contract.signed_at ?? null,
        agencySignedAt: contract.agency_signed_at ?? null,
        depositPaidAt: contract.deposit_paid_at ?? null,
        paidAt: contract.paid_at ?? null,
        contractFileUrl: contract.contract_file_url ? buildContractFileAccessUrl(contract.id, "original") : null,
        signedContractUrl: contract.signed_contract_url ? buildContractFileAccessUrl(contract.id, "signed") : null,
      };
    });

    return <AgencyContracts contracts={contracts} bookingsHref="/agency/workspace/bookings" />;
  }

  const premiumContracts: PremiumContract[] = contractsData.map((contract) => {
    const talentId = contract.talent_user_id ?? contract.talent_id ?? null;
    return {
      id: contract.id,
      jobId: contract.job_id ?? null,
      jobTitle: contract.job_id ? (jobTitleMap.get(contract.job_id) ?? "Vaga do workspace") : "Vaga do workspace",
      talentName: talentId ? (talentNameMap.get(talentId) ?? "Talento") : "Talento",
      talentAvatarUrl: talentId ? (talentAvatarMap.get(talentId) ?? null) : null,
      status: contract.status ?? "sent",
      paymentAmount: contract.payment_amount ?? 0,
      commissionAmount: contract.commission_amount ?? 0,
      netAmount: contract.net_amount ?? 0,
      jobDate: contract.job_date ?? null,
      location: contract.location ?? null,
      createdAt: contract.created_at ?? "",
      signedAt: contract.signed_at ?? null,
      paidAt: contract.paid_at ?? null,
      contractFileUrl: contract.contract_file_url ? buildContractFileAccessUrl(contract.id, "original") : null,
      signedContractUrl: contract.signed_contract_url ? buildContractFileAccessUrl(contract.id, "signed") : null,
    };
  });

  return <WorkspacePremiumContracts contracts={premiumContracts} lang={context.lang} />;
}
