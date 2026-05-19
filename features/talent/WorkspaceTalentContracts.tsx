"use client";

import { useMemo, useState } from "react";
import { brl } from "@/lib/brl";
import {
  getContractPaymentStatus,
  contractStatusLabel,
  contractStatusTone,
  resolveContractAmounts,
} from "@/lib/contractStatus";

export type WorkspaceTalentContract = {
  id: string;
  jobId: string | null;
  jobTitle: string;
  agencyName: string;
  jobDate: string | null;
  jobTime: string | null;
  location: string | null;
  jobDescription: string | null;
  paymentAmount: number;
  paymentMethod: string | null;
  additionalNotes: string | null;
  status: string;
  createdAt: string;
  signedAt: string | null;
  paidAt: string | null;
  contractFileUrl: string | null;
  signedContractUrl: string | null;
};

type Props = {
  contracts: WorkspaceTalentContract[];
  workspaceName: string;
  primary: string;
  accent: string;
};

type ModalState =
  | { kind: "details"; contractId: string }
  | { kind: "accept"; contractId: string }
  | { kind: "reject"; contractId: string }
  | null;

const ACTIONABLE_STATUSES = new Set(["sent", "awaiting_talent", "pending_signature"]);
const ACTIVE_STATUSES = new Set(["signed", "accepted", "confirmed", "escrowed"]);
const PAID_STATUSES = new Set(["paid", "completed"]);
const HISTORY_STATUSES = new Set(["rejected", "cancelled"]);

function fmtDate(value: string | null, locale = "pt-BR") {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function fmtJobDate(value: string | null, locale = "pt-BR") {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function actionReason(status: string) {
  if (ACTIVE_STATUSES.has(status)) return "Aguardando depósito da agência.";
  if (PAID_STATUSES.has(status)) return "Contrato já concluído.";
  if (HISTORY_STATUSES.has(status)) return "Este contrato está no histórico.";
  return "Ação indisponível para este contrato.";
}

function mapActionableStatus(status: string) {
  if (status === "sent" || status === "awaiting_talent" || status === "pending_signature") return "sent";
  if (status === "accepted") return "signed";
  if (status === "escrowed") return "confirmed";
  if (status === "completed") return "paid";
  return status;
}

export default function WorkspaceTalentContracts({
  contracts: initialContracts,
  workspaceName,
  primary,
  accent,
}: Props) {
  const [contracts, setContracts] = useState(initialContracts);
  const [modal, setModal] = useState<ModalState>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contractMap = useMemo(
    () => new Map(contracts.map((contract) => [contract.id, contract])),
    [contracts],
  );

  const pending = contracts.filter((contract) => ACTIONABLE_STATUSES.has(mapActionableStatus(contract.status)));
  const active = contracts.filter((contract) => ACTIVE_STATUSES.has(mapActionableStatus(contract.status)));
  const paid = contracts.filter((contract) => PAID_STATUSES.has(mapActionableStatus(contract.status)));
  const history = contracts.filter((contract) => HISTORY_STATUSES.has(mapActionableStatus(contract.status)));

  const modalContract = modal ? contractMap.get(modal.contractId) ?? null : null;

  async function runAction(contract: WorkspaceTalentContract, action: "accept" | "reject") {
    setActingId(contract.id);
    setError(null);

    const response = action === "accept"
      ? await fetch(`/api/contracts/${contract.id}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      : await fetch(`/api/contracts/${contract.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        });

    const payload = await response.json().catch(() => ({})) as { error?: string; status?: string };

    if (!response.ok) {
      setError(payload.error ?? "Não foi possível atualizar o contrato.");
      setActingId(null);
      return;
    }

    setContracts((current) => current.map((item) => {
      if (item.id !== contract.id) return item;
      return {
        ...item,
        status: action === "accept" ? "signed" : "rejected",
        signedAt: action === "accept" ? new Date().toISOString() : item.signedAt,
      };
    }));
    setModal(null);
    setActingId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Portal do talento</p>
        <h1 className="mt-1 text-[1.8rem] font-bold tracking-tight text-zinc-950">Contratos</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Contratos enviados por {workspaceName}.
        </p>
      </div>

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

      <ContractSection
        title="Aguardando Talento"
        contracts={pending}
        primary={primary}
        accent={accent}
        onDetails={(contractId) => { setError(null); setModal({ kind: "details", contractId }); }}
        onAccept={(contractId) => { setError(null); setModal({ kind: "accept", contractId }); }}
        onReject={(contractId) => { setError(null); setModal({ kind: "reject", contractId }); }}
      />

      <ContractSection
        title="Em andamento"
        contracts={active}
        primary={primary}
        accent={accent}
        onDetails={(contractId) => { setError(null); setModal({ kind: "details", contractId }); }}
        onAccept={(contractId) => { setError(null); setModal({ kind: "accept", contractId }); }}
        onReject={(contractId) => { setError(null); setModal({ kind: "reject", contractId }); }}
      />

      <ContractSection
        title="Pagos"
        contracts={paid}
        primary={primary}
        accent={accent}
        onDetails={(contractId) => { setError(null); setModal({ kind: "details", contractId }); }}
        onAccept={(contractId) => { setError(null); setModal({ kind: "accept", contractId }); }}
        onReject={(contractId) => { setError(null); setModal({ kind: "reject", contractId }); }}
      />

      <ContractSection
        title="Histórico"
        contracts={history}
        primary={primary}
        accent={accent}
        onDetails={(contractId) => { setError(null); setModal({ kind: "details", contractId }); }}
        onAccept={(contractId) => { setError(null); setModal({ kind: "accept", contractId }); }}
        onReject={(contractId) => { setError(null); setModal({ kind: "reject", contractId }); }}
      />

      {modalContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[24px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{modalContract.agencyName}</p>
                <h2 className="mt-1 text-[18px] font-semibold text-zinc-950">{modalContract.jobTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => { setModal(null); setError(null); }}
                className="rounded-full border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {modal?.kind === "details" && (
                <>
                  <ContractDetails contract={modalContract} />
                  <div className="flex flex-wrap gap-2">
                    {modalContract.contractFileUrl ? (
                      <a
                        href={modalContract.contractFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                      >
                        Ver contrato
                      </a>
                    ) : (
                      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-500">
                        Este contrato não possui PDF anexado. Você ainda pode aceitar digitalmente.
                      </p>
                    )}
                  </div>
                </>
              )}

              {modal?.kind === "accept" && (
                <>
                  <p className="text-[15px] font-medium text-zinc-900">
                    {modalContract.contractFileUrl ? "Você deseja assinar este contrato?" : "Você aceita este contrato?"}
                  </p>
                  <ContractDetails contract={modalContract} compact />
                  {error && (
                    <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setModal(null); setError(null); }}
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(modalContract, "accept")}
                      disabled={actingId === modalContract.id}
                      className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300"
                      style={{ background: actingId === modalContract.id ? undefined : primary }}
                    >
                      {actingId === modalContract.id
                        ? (modalContract.contractFileUrl ? "Assinando..." : "Aceitando...")
                        : (modalContract.contractFileUrl ? "Assinar contrato" : "Aceitar contrato")}
                    </button>
                  </div>
                </>
              )}

              {modal?.kind === "reject" && (
                <>
                  <p className="text-[15px] font-medium text-zinc-900">Você tem certeza de que deseja recusar este contrato?</p>
                  <p className="text-[13px] leading-6 text-zinc-500">
                    A agência verá o status como recusado. Se precisar, você poderá conversar com a agência antes de aceitar outro contrato.
                  </p>
                  <ContractDetails contract={modalContract} compact />
                  {error && (
                    <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setModal(null); setError(null); }}
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(modalContract, "reject")}
                      disabled={actingId === modalContract.id}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    >
                      {actingId === modalContract.id ? "Recusando..." : "Recusar contrato"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractSection({
  title,
  contracts,
  primary,
  accent,
  onDetails,
  onAccept,
  onReject,
}: {
  title: string;
  contracts: WorkspaceTalentContract[];
  primary: string;
  accent: string;
  onDetails: (contractId: string) => void;
  onAccept: (contractId: string) => void;
  onReject: (contractId: string) => void;
}) {
  if (contracts.length === 0) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{title}</p>
      <ul className="flex flex-col gap-3">
        {contracts.map((contract) => (
          <li key={contract.id}>
            <ContractCard
              contract={contract}
              primary={primary}
              accent={accent}
              onDetails={onDetails}
              onAccept={onAccept}
              onReject={onReject}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContractCard({
  contract,
  primary,
  accent,
  onDetails,
  onAccept,
  onReject,
}: {
  contract: WorkspaceTalentContract;
  primary: string;
  accent: string;
  onDetails: (contractId: string) => void;
  onAccept: (contractId: string) => void;
  onReject: (contractId: string) => void;
}) {
  const status = mapActionableStatus(contract.status);
  const isActionable = ACTIONABLE_STATUSES.has(status);
  const paymentStatus = getContractPaymentStatus({
    status,
    paid_at: contract.paidAt,
  });
  const label = contractStatusLabel(paymentStatus, "pt-BR");
  const tone = contractStatusTone(paymentStatus);
  const { gross, net } = resolveContractAmounts({
    payment_amount: contract.paymentAmount,
  });
  const actionDisabledReason = actionReason(status);

  return (
    <div className="overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }} />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-zinc-900">{contract.jobTitle}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">{contract.agencyName}</p>
            <p className="mt-1 text-[12px] text-zinc-500">
              {fmtJobDate(contract.jobDate)}
              {contract.jobTime ? ` · ${String(contract.jobTime).slice(0, 5)}` : ""}
            </p>
          </div>
          <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
        </div>

        <div className="flex flex-wrap gap-4 text-[12px] text-zinc-500">
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDetails(contract.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Ver detalhes
          </button>

          {contract.contractFileUrl && (
            <a
              href={contract.contractFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Ver contrato
            </a>
          )}

          <button
            type="button"
            onClick={() => onAccept(contract.id)}
            disabled={!isActionable}
            title={!isActionable ? actionDisabledReason : undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
              isActionable
                ? "text-white"
                : "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400",
            ].join(" ")}
            style={isActionable ? { background: primary } : undefined}
          >
            {contract.contractFileUrl ? "Assinar contrato" : "Aceitar contrato"}
          </button>

          <button
            type="button"
            onClick={() => onReject(contract.id)}
            disabled={!isActionable}
            title={!isActionable ? actionDisabledReason : undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
              isActionable
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400",
            ].join(" ")}
          >
            Recusar contrato
          </button>
        </div>

        {!isActionable && (
          <p className="text-[12px] text-zinc-500">{actionDisabledReason}</p>
        )}
      </div>
    </div>
  );
}

function ContractDetails({
  contract,
  compact = false,
}: {
  contract: WorkspaceTalentContract;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
      <DetailField label="Data" value={fmtJobDate(contract.jobDate)} />
      <DetailField label="Horário" value={contract.jobTime ?? "—"} />
      <DetailField label="Local" value={contract.location ?? "—"} />
      <DetailField label="Pagamento" value={`${brl(contract.paymentAmount)}${contract.paymentMethod ? ` · ${contract.paymentMethod}` : ""}`} />
      {!compact && contract.jobDescription && (
        <div className="sm:col-span-2 lg:col-span-4">
          <DetailField label="Descrição" value={contract.jobDescription} multiline />
        </div>
      )}
      {!compact && contract.additionalNotes && (
        <div className="sm:col-span-2 lg:col-span-4">
          <DetailField label="Observações" value={contract.additionalNotes} multiline />
        </div>
      )}
      <DetailField label="Criado em" value={fmtDate(contract.createdAt)} />
      <DetailField label="Status" value={contractStatusLabel(getContractPaymentStatus({ status: mapActionableStatus(contract.status), paid_at: contract.paidAt }), "pt-BR")} />
    </div>
  );
}

function DetailField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className={`text-[13px] text-zinc-700 ${multiline ? "whitespace-pre-line leading-6" : "font-medium"}`}>{value}</p>
    </div>
  );
}
