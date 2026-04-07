"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type TalentContract = {
  id: string;
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
};

const STATUS: Record<string, { label: string; cls: string }> = {
  sent:     { label: "Awaiting Signature", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" },
  signed:   { label: "Signed",             cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" },
  accepted: { label: "Signed",             cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" },
  rejected: { label: "Rejected",           cls: "bg-rose-50 text-rose-600 ring-1 ring-rose-100" },
};
const STATUS_FALLBACK = { label: "Unknown", cls: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200" };

function downloadContract(c: TalentContract) {
  const lines = [
    "CONTRACT DETAILS",
    "================",
    `Agency:           ${c.agencyName}`,
    `Status:           ${c.status}`,
    `Payment Amount:   ${usd(c.paymentAmount)}`,
    `Payment Method:   ${c.paymentMethod ?? "—"}`,
    `Job Date:         ${c.jobDate ? fmtJobDate(c.jobDate) : "TBD"}`,
    `Job Time:         ${c.jobTime ?? "—"}`,
    `Location:         ${c.location ?? "—"}`,
    `Received:         ${fmtDate(c.createdAt)}`,
    "",
    "JOB DESCRIPTION",
    "---------------",
    c.jobDescription ?? "No description provided.",
    "",
    "ADDITIONAL NOTES",
    "----------------",
    c.additionalNotes ?? "None.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `contract-${c.agencyName.replace(/\s+/g, "-").toLowerCase()}-${c.id.slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtJobDate(s: string | null) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function ContractRow({
  contract: c,
  onAction,
  acting,
}: {
  contract: TalentContract;
  onAction: (id: string, action: "accept" | "reject") => void;
  acting: string | null;
}) {
  const [open, setOpen] = useState(c.status === "sent");
  const [showReject, setShowReject] = useState(false);
  const st = STATUS[c.status] ?? STATUS_FALLBACK;
  const isPending = c.status === "sent";

  return (
    <div className={[
      "bg-white rounded-2xl border overflow-hidden transition-all",
      isPending
        ? "border-amber-200 shadow-[0_0_0_3px_rgba(251,191,36,0.08),0_4px_16px_rgba(0,0,0,0.04)]"
        : "border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)]",
    ].join(" ")}>

      {/* Collapsed row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/60 transition-colors text-left cursor-pointer"
      >
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Agency name + date */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-zinc-900 truncate">{c.agencyName}</p>
          <p className="text-[12px] text-zinc-400 mt-0.5">Received {fmtDate(c.createdAt)}</p>
        </div>

        {/* Amount */}
        <p className="text-[14px] font-semibold text-zinc-900 tabular-nums flex-shrink-0 hidden sm:block">
          {usd(c.paymentAmount)}
        </p>

        {/* Status badge */}
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${st.cls}`}>
          {st.label}
        </span>

        {/* Download */}
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); downloadContract(c); }}
          className="flex-shrink-0 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          aria-label="Download contract"
          title="Download contract"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </span>
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-zinc-50 px-6 py-5 space-y-5">

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Job Date</p>
              <p className="text-[13px] font-medium text-zinc-800">{fmtJobDate(c.jobDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Time</p>
              <p className="text-[13px] font-medium text-zinc-800">{c.jobTime ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Location</p>
              <p className="text-[13px] font-medium text-zinc-800">{c.location ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Payment</p>
              <p className="text-[13px] font-medium text-zinc-800">
                {usd(c.paymentAmount)}{c.paymentMethod ? ` · ${c.paymentMethod}` : ""}
              </p>
            </div>
          </div>

          {c.jobDescription && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Job Description</p>
              <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-line">{c.jobDescription}</p>
            </div>
          )}

          {c.additionalNotes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Additional Notes</p>
              <p className="text-[13px] text-zinc-500 leading-relaxed whitespace-pre-line">{c.additionalNotes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {isPending && !showReject && (
              <>
                <button
                  onClick={() => setShowReject(true)}
                  className="px-4 py-2 text-[13px] font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => onAction(c.id, "accept")}
                  disabled={acting === c.id}
                  className="px-5 py-2 text-[13px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {acting === c.id ? "Signing…" : "Sign Contract"}
                </button>
              </>
            )}

            {isPending && showReject && (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 w-full">
                <p className="text-[13px] font-medium text-rose-800 flex-1">Confirm rejection?</p>
                <button
                  onClick={() => setShowReject(false)}
                  className="px-3 py-1.5 text-[12px] font-medium border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onAction(c.id, "reject")}
                  disabled={acting === c.id}
                  className="px-3 py-1.5 text-[12px] font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {acting === c.id ? "Rejecting…" : "Confirm Reject"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TalentContracts({ contracts: initial }: { contracts: TalentContract[] }) {
  const router = useRouter();
  const [contracts, setContracts] = useState<TalentContract[]>(initial);
  const [acting, setActing]       = useState<string | null>(null);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const pending = contracts.filter((c) => c.status === "sent");
  const past    = contracts.filter((c) => c.status !== "sent");

  async function handleAction(id: string, action: "accept" | "reject") {
    setActing(id);
    const res = await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      const newStatus = action === "accept" ? "signed" : "rejected";
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
      setToast({
        msg:  action === "accept" ? "Contract signed — a booking is now pending payment." : "Contract rejected.",
        type: action === "accept" ? "success" : "error",
      });
      setTimeout(() => setToast(null), 4000);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setToast({ msg: d.error ?? "Something went wrong.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
    setActing(null);
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Toast */}
      {toast && (
        <div className={[
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-[13px] font-medium text-white",
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600",
        ].join(" ")}>
          {toast.msg}
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Talent</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">Contracts</h1>
        <p className="text-[13px] text-zinc-400 mt-1">{contracts.length} contract{contracts.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Awaiting signature */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-zinc-700">Awaiting Your Signature</h2>
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {pending.length}
          </span>
        </div>

        {pending.length > 0 ? (
          <div className="space-y-2">
            {pending.map((c) => (
              <ContractRow key={c.id} contract={c} onAction={handleAction} acting={acting} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 py-8 text-center">
            <p className="text-[13px] text-zinc-400">No contracts pending your review</p>
          </div>
        )}
      </section>

      {/* History */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-zinc-700">History</h2>
          <div className="space-y-2">
            {past.map((c) => (
              <ContractRow key={c.id} contract={c} onAction={handleAction} acting={acting} />
            ))}
          </div>
        </section>
      )}

      {contracts.length === 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 py-16 text-center">
          <p className="text-[14px] font-medium text-zinc-500">No contracts yet</p>
          <p className="text-[13px] text-zinc-400 mt-1">Contracts sent by agencies will appear here.</p>
        </div>
      )}
    </div>
  );
}
