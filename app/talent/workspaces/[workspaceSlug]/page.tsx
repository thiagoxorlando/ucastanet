import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { getContractPaymentStatus, contractStatusLabel, contractStatusTone, resolveContractAmounts } from "@/lib/contractStatus";

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function TalentWorkspaceDashboard({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, brand_primary_color, brand_accent_color, welcome_message")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  // Recent private jobs
  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title, budget, number_of_talents_required, created_at, visibility")
    .eq("workspace_id", workspace.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(10);

  const privateJobs = (jobRows ?? []).filter(
    (j) => j.visibility === "private_invite" || j.visibility === "private_portal",
  );

  // Recent contracts for this talent in this workspace
  const workspaceJobIds = (jobRows ?? []).map((j) => j.id);
  const { data: contractRows } = workspaceJobIds.length
    ? await supabase
        .from("contracts")
        .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, job_date, created_at")
        .eq("talent_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const contracts = contractRows ?? [];
  const jobTitleMap = new Map((jobRows ?? []).map((j) => [j.id, j.title ?? "Vaga"]));

  const totalEarned = contracts
    .filter((c) => c.status === "paid")
    .reduce((s, c) => {
      const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
      return s + net;
    }, 0);

  const primary = workspace.brand_primary_color ?? "#1ABC9C";
  const accent  = workspace.brand_accent_color  ?? "#27C1D6";

  return (
    <div className="space-y-6">
      {/* Welcome / stats strip */}
      {(workspace.welcome_message || totalEarned > 0) && (
        <div
          className="rounded-[20px] border border-zinc-200 px-5 py-5"
          style={{ background: `linear-gradient(135deg, ${primary}12, ${accent}08)` }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {workspace.welcome_message ? (
              <p className="text-[14px] leading-relaxed text-zinc-600">{workspace.welcome_message}</p>
            ) : <div />}
            {totalEarned > 0 && (
              <div className="flex-shrink-0 sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Recebido desta agência</p>
                <p className="mt-0.5 text-[1.3rem] font-bold text-emerald-700">{brl(totalEarned)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent private jobs */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-zinc-900">Vagas recentes</h2>
          <Link href={`/talent/workspaces/${workspaceSlug}/jobs`} className="text-[12px] font-medium text-zinc-500 hover:text-zinc-700">
            Ver todas →
          </Link>
        </div>
        {privateJobs.length === 0 ? (
          <div className="rounded-[20px] border border-zinc-200 bg-white px-5 py-8 text-center">
            <p className="text-[13px] text-zinc-400">Nenhuma vaga privada disponível no momento.</p>
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {privateJobs.slice(0, 4).map((job) => (
              <li key={job.id}>
                <Link
                  href={`/talent/jobs/${job.id}`}
                  className="block rounded-[18px] border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)]"
                >
                  <p className="text-[14px] font-semibold text-zinc-950 truncate">{job.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[12px] text-zinc-500">
                    {job.budget != null && (
                      <span><span className="font-medium text-zinc-700">Cachê:</span> {brl(job.budget)}</span>
                    )}
                    <span>{new Date(job.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent contracts */}
      {contracts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-zinc-900">Contratos recentes</h2>
            <Link href={`/talent/workspaces/${workspaceSlug}/contracts`} className="text-[12px] font-medium text-zinc-500 hover:text-zinc-700">
              Ver todos →
            </Link>
          </div>
          <ul className="flex flex-col gap-2.5">
            {contracts.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps);
              const tone  = contractStatusTone(ps);
              const { net } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="rounded-[18px] border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-zinc-900 truncate">
                        {jobTitleMap.get(contract.job_id ?? "") ?? "Vaga"}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[12px] text-zinc-500">
                      <span><span className="font-medium text-zinc-700">Valor líq.:</span> {brl(net)}</span>
                      {contract.job_date && (
                        <span>
                          <span className="font-medium text-zinc-700">Data:</span>{" "}
                          {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
