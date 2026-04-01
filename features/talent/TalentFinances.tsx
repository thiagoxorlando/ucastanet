"use client";

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

// Mock data
const summary = {
  totalEarnings:      8500,
  pendingPayments:    4200,
  completedPayments:  4300,
};

const payments = [
  { id: "PAY-001", job: "Fashion Creator — Spring Campaign",    amount: 8500, status: "completed", date: "2026-03-18" },
  { id: "PAY-002", job: "Meal Prep Series — Health Food Brand", amount: 4200, status: "pending",   date: "2026-03-22" },
];

const STATUS_CLS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  pending:   "bg-amber-50  text-amber-700  ring-1 ring-amber-100",
};

function StatCard({ label, value, sub, stripe }: { label: string; value: string; sub?: string; stripe: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className={`h-[3px] bg-gradient-to-r ${stripe}`} />
      <div className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">{label}</p>
        <p className="text-[2rem] font-semibold tracking-tighter text-zinc-900 leading-none">{value}</p>
        {sub && <p className="text-[12px] text-zinc-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function TalentFinances() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Overview</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">Finances</h1>
        <p className="text-[13px] text-zinc-400 mt-1">Your earnings summary — mock data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Earnings"     value={usd(summary.totalEarnings)}     sub="All time"         stripe="from-indigo-500 to-violet-500" />
        <StatCard label="Pending Payments"   value={usd(summary.pendingPayments)}   sub="Awaiting payment" stripe="from-amber-400 to-orange-500"  />
        <StatCard label="Completed Payments" value={usd(summary.completedPayments)} sub="Received"         stripe="from-emerald-400 to-teal-500"  />
      </div>

      {/* Payments list */}
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Payment History</p>

        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 py-16 text-center">
            <p className="text-[14px] font-medium text-zinc-500">No payments yet</p>
            <p className="text-[13px] text-zinc-400 mt-1">Apply for jobs and get booked to earn.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] divide-y divide-zinc-50 overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50/60 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-zinc-900 truncate">{p.job}</p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_CLS[p.status] ?? ""}`}>
                  {p.status}
                </span>
                <p className="text-[15px] font-semibold text-zinc-900 tabular-nums flex-shrink-0">
                  {usd(p.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
