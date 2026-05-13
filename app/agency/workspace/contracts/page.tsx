import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import AgencyContracts, { type AgencyContract } from "@/features/agency/AgencyContracts";
import { buildContractFileAccessUrl } from "@/lib/contractFiles";
import { brl } from "@/lib/brl";
import { contractStatusLabel, contractStatusTone, getContractPaymentStatus } from "@/lib/contractStatus";
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

  const jobIds = visibleJobs.map((job) => job.id);
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
    .select("id, job_id, talent_id, job_date, job_time, location, job_description, payment_amount, payment_method, additional_notes, status, payment_status, contract_file_url, signed_contract_url, created_at, signed_at, agency_signed_at, deposit_paid_at, paid_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  const contractsData = rows ?? [];
  const talentIds = [...new Set(contractsData.map((contract) => contract.talent_id).filter((id): id is string => !!id))];

  const talentMap = new Map<string, string>();
  if (talentIds.length > 0) {
    const { data: talents } = await supabase.from("talent_profiles").select("id, full_name").in("id", talentIds);
    for (const talent of talents ?? []) talentMap.set(talent.id, talent.full_name ?? "Talento");
  }

  const contracts: AgencyContract[] = contractsData.map((contract) => ({
    id: contract.id,
    jobId: contract.job_id ?? null,
    jobTitle: contract.job_id ? (jobTitleMap.get(contract.job_id) ?? "Vaga do workspace") : "Vaga do workspace",
    talentId: contract.talent_id ?? null,
    talentName: contract.talent_id ? (talentMap.get(contract.talent_id) ?? "Talento") : "Talento",
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
  }));

  if (context.isOwner) {
    return <AgencyContracts contracts={contracts} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Contratos Premium</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Visualização dos contratos ligados às vagas do Espaço Premium.
        </p>
      </div>

      {contracts.map((contract) => {
        const paymentStatus = getContractPaymentStatus({ status: contract.status, paid_at: contract.paidAt });
        return (
          <div key={contract.id} className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-semibold text-zinc-950">{contract.jobTitle}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contractStatusTone(paymentStatus)}`}>
                    {contractStatusLabel(paymentStatus, context.lang)}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-zinc-600">Talento: {contract.talentName}</p>
                <div className="mt-3 grid gap-3 text-[13px] text-zinc-600 sm:grid-cols-2 xl:grid-cols-4">
                  <p><span className="font-semibold text-zinc-800">Valor:</span> {brl(contract.paymentAmount)}</p>
                  <p><span className="font-semibold text-zinc-800">Data:</span> {contract.jobDate ? new Date(`${contract.jobDate}T00:00:00`).toLocaleDateString("pt-BR") : "A definir"}</p>
                  <p><span className="font-semibold text-zinc-800">Local:</span> {contract.location || "A definir"}</p>
                  <p><span className="font-semibold text-zinc-800">Criado em:</span> {new Date(contract.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/agency/jobs/${contract.jobId}`} className="rounded-xl border border-zinc-200 px-3 py-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50">
                  Ver vaga
                </Link>
                {contract.contractFileUrl ? (
                  <Link href={contract.contractFileUrl} target="_blank" className="rounded-xl border border-zinc-200 px-3 py-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50">
                    Ver contrato
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
