import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import {
  getContractPaymentStatus,
  contractStatusLabel,
  contractStatusTone,
  resolveContractAmounts,
} from "@/lib/contractStatus";

export const metadata: Metadata = { title: "Contratos — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceContractsPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("workspace_id", workspace.id);

  const workspaceJobIds = (allJobs ?? []).map((j) => j.id);
  const jobMap = new Map((allJobs ?? []).map((j) => [String(j.id), String(j.title ?? "Vaga")]));

  const { data: contractRows } = workspaceJobIds.length
    ? await supabase
        .from("contracts")
        .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, job_date, location, created_at")
        .eq("talent_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const contracts = contractRows ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Contratos</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Seus contratos com esta agência.
        </p>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-zinc-600">Nenhum contrato com esta agência ainda.</p>
          <p className="mt-1 text-[13px] text-zinc-400">Os contratos enviados pela agência aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {contracts.map((contract) => {
            const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
            const label = contractStatusLabel(ps);
            const tone  = contractStatusTone(ps);
            const { net, gross } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
            return (
              <li key={contract.id}>
                <div className="rounded-[20px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-zinc-900 truncate">
                      {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                    <span><span className="font-medium text-zinc-700">Valor bruto:</span> {brl(gross)}</span>
                    <span><span className="font-medium text-zinc-700">Valor líq.:</span> {brl(net)}</span>
                    {contract.job_date && (
                      <span>
                        <span className="font-medium text-zinc-700">Data:</span>{" "}
                        {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {contract.location && (
                      <span><span className="font-medium text-zinc-700">Local:</span> {contract.location}</span>
                    )}
                  </div>
                  {contract.paid_at && (
                    <p className="mt-1.5 text-[11px] text-emerald-600">
                      Pago em {new Date(contract.paid_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
