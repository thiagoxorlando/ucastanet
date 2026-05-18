import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { getExistingContractColumns } from "@/lib/contractCreationAccess.server";
import {
  getContractPaymentStatus,
  contractStatusLabel,
  contractStatusTone,
  resolveContractAmounts,
} from "@/lib/contractStatus";
import { getServerLang } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Contratos — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

// Progress stepper from the talent's perspective
function TalentContractProgress({
  status,
  signedAt,
  paidAt,
  locale,
}: {
  status: string;
  signedAt: string | null;
  paidAt: string | null;
  locale: string;
}) {
  if (["cancelled", "rejected"].includes(status)) return null;

  const youSigned       = ["signed", "confirmed", "paid"].includes(status);
  const agencyDeposited = ["confirmed", "paid"].includes(status);
  const isPaid          = status === "paid";

  function fmt(s: string | null) {
    if (!s) return null;
    return new Date(s).toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  const steps = [
    { label: "Enviado",         done: true,          date: null },
    { label: "Você assinou",    done: youSigned,     date: fmt(signedAt) },
    { label: "Depósito",        done: agencyDeposited, date: null },
    { label: "Pago na carteira", done: isPaid,        date: fmt(paidAt) },
  ];
  const connectors = [youSigned, agencyDeposited, isPaid];

  return (
    <div className="mt-4 flex items-start">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && (
              <div className={`flex-1 h-px ${connectors[i - 1] ? "bg-emerald-300" : "bg-zinc-200"}`} />
            )}
            <div className={[
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
              step.done ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200",
            ].join(" ")}>
              {step.done ? (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[9px] font-bold">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px ${connectors[i] ? "bg-emerald-300" : "bg-zinc-200"}`} />
            )}
          </div>
          <p className={`mt-1.5 text-[10px] text-center leading-tight ${step.done ? "font-medium text-zinc-600" : "text-zinc-400"}`}>
            {step.label}
          </p>
          {step.date && (
            <p className="mt-0.5 text-[9px] text-center text-zinc-400">{step.date}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Human-readable action hint based on contract status
function StatusHint({ status }: { status: string }) {
  const hints: Record<string, { text: string; cls: string }> = {
    sent:      { text: "Aguardando sua assinatura.", cls: "text-violet-600 bg-violet-50 border-violet-100" },
    signed:    { text: "Contrato assinado. Aguardando depósito da agência.", cls: "text-sky-700 bg-sky-50 border-sky-100" },
    confirmed: { text: "Fundos em custódia. A agência irá liberar o pagamento em breve.", cls: "text-amber-700 bg-amber-50 border-amber-100" },
  };
  const hint = hints[status];
  if (!hint) return null;
  return (
    <p className={`mt-3 rounded-lg border px-3 py-2 text-[12px] font-medium ${hint.cls}`}>
      {hint.text}
    </p>
  );
}

export default async function WorkspaceContractsPage({ params }: Props) {
  const { workspaceSlug } = await params;
  const lang   = await getServerLang();
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const statusLang = lang === "en" ? "en" : "pt-BR";

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, logo_url, brand_primary_color, brand_accent_color")
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
  const contractColumnSupport = await getExistingContractColumns();

  const [workspaceScopedContractsResult, jobScopedContractsResult] = await Promise.all([
    contractColumnSupport.hasWorkspaceId
      ? supabase
          .from("contracts")
          .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, signed_at, job_date, location, created_at")
          .eq("talent_id", user.id)
          .eq("workspace_id", workspace.id)
      : Promise.resolve({ data: [] }),
    workspaceJobIds.length
      ? supabase
          .from("contracts")
          .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, signed_at, job_date, location, created_at")
          .eq("talent_id", user.id)
          .in("job_id", workspaceJobIds)
      : Promise.resolve({ data: [] }),
  ]);

  const contracts = [...(workspaceScopedContractsResult.data ?? []), ...(jobScopedContractsResult.data ?? [])]
    .filter((contract, index, rows) => rows.findIndex((row) => row.id === contract.id) === index)
    .sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });

  const active = contracts.filter((c) => ["sent", "signed", "confirmed"].includes(c.status ?? ""));
  const paid   = contracts.filter((c) => c.status === "paid");
  const other  = contracts.filter((c) => ["cancelled", "rejected"].includes(c.status ?? ""));

  const primary = (workspace.brand_primary_color as string | null) ?? "#1ABC9C";
  const accent  = (workspace.brand_accent_color  as string | null) ?? "#27C1D6";

  const totalEarned = paid.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  const totalActive = active.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Branded header */}
      <div className="flex items-center gap-3.5">
        {workspace.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.logo_url as string}
            alt={workspace.name as string}
            className="h-10 w-10 flex-shrink-0 rounded-xl border border-zinc-200 object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
          >
            {(workspace.name as string).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
            {workspace.name as string}
          </p>
          <h1 className="text-[1.3rem] font-bold leading-tight text-zinc-950">Contratos</h1>
        </div>
      </div>

      {/* Summary */}
      {contracts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12px] font-medium text-zinc-600">
            {contracts.length} total
          </span>
          {active.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700">
              {active.length} em andamento · {brl(totalActive)} a receber
            </span>
          )}
          {paid.length > 0 && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
              {paid.length} pago{paid.length !== 1 ? "s" : ""} · {brl(totalEarned)}
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {contracts.length === 0 && (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-14 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }}
          >
            <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-zinc-600">Nenhum contrato com esta agência ainda.</p>
          <p className="mt-1 text-[13px] text-zinc-400">
            Os contratos enviados pela agência aparecerão aqui assim que forem criados.
          </p>
        </div>
      )}

      {/* Active contracts */}
      {active.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Em andamento</p>
          <ul className="flex flex-col gap-3">
            {active.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps, statusLang);
              const tone  = contractStatusTone(ps);
              const { net, gross } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="overflow-hidden rounded-[20px] border border-amber-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-zinc-900">
                            {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                          </p>
                          {contract.job_date && (
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                              {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString(locale, {
                                weekday: "short", day: "numeric", month: "short",
                              })}
                            </p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                      </div>

                      {/* Action hint */}
                      <StatusHint status={contract.status ?? ""} />

                      {/* Progress stepper */}
                      <TalentContractProgress
                        status={contract.status ?? ""}
                        signedAt={(contract as { signed_at?: string | null }).signed_at ?? null}
                        paidAt={contract.paid_at ?? null}
                        locale={locale}
                      />

                      <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                        <span>
                          <span className="font-medium text-zinc-700">A receber: </span>
                          <span className="font-semibold text-emerald-600">{brl(net)}</span>
                        </span>
                        <span>
                          <span className="font-medium text-zinc-700">Bruto: </span>
                          {brl(gross)}
                        </span>
                        {contract.location && (
                          <span>
                            <span className="font-medium text-zinc-700">Local: </span>
                            {contract.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Paid contracts */}
      {paid.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Pagos</p>
          <ul className="flex flex-col gap-3">
            {paid.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps, statusLang);
              const tone  = contractStatusTone(ps);
              const { net, gross, commissionPct } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="overflow-hidden rounded-[20px] border border-emerald-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div
                      className="h-[3px]"
                      style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
                    />
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-zinc-900">
                            {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                          </p>
                          {contract.job_date && (
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                              {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString(locale, {
                                weekday: "short", day: "numeric", month: "short",
                              })}
                            </p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                          {label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                        <span>
                          <span className="font-medium text-zinc-700">Recebido: </span>
                          <span className="font-bold text-emerald-600">{brl(net)}</span>
                        </span>
                        <span>
                          <span className="font-medium text-zinc-700">Bruto: </span>
                          {brl(gross)}
                        </span>
                        <span>
                          <span className="font-medium text-zinc-700">Comissão: </span>
                          {commissionPct}%
                        </span>
                        {contract.location && (
                          <span>
                            <span className="font-medium text-zinc-700">Local: </span>
                            {contract.location}
                          </span>
                        )}
                      </div>
                      {contract.paid_at && (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pago em {new Date(contract.paid_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cancelled / rejected */}
      {other.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Cancelados / Rejeitados</p>
          <ul className="flex flex-col gap-2.5">
            {other.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps, statusLang);
              const tone  = contractStatusTone(ps);
              const { gross } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-zinc-500">
                        {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                      </p>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[12px] text-zinc-400">
                      <span>{brl(gross)}</span>
                      <span>
                        {new Date(contract.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
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
