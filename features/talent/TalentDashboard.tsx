"use client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DashboardBooking = {
  id: string;
  talentName: string;
  status: string;
  price: number;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Status config ─────────────────────────────────────────────────────────────

const BOOKING_STATUS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  pending:   "bg-amber-50  text-amber-700  ring-1 ring-amber-100",
  disputed:  "bg-rose-50   text-rose-600   ring-1 ring-rose-100",
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, stripe, icon,
}: {
  label: string; value: string; sub: string;
  stripe: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className={`h-[3px] bg-gradient-to-r ${stripe}`} />
      <div className="p-6 flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
          <p className="text-[2rem] font-semibold tracking-tighter text-zinc-900 leading-none">{value}</p>
          {sub && <p className="text-[12px] text-zinc-400 mt-1.5 font-medium">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TalentDashboard({
  bookings,
  submissionsCount,
}: {
  bookings: DashboardBooking[];
  submissionsCount: number;
}) {
  const earnings = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="max-w-5xl space-y-8">

      {/* ── Header ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
          Welcome back
        </p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">
          Talent Dashboard
        </h1>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Applications"
          value={String(submissionsCount)}
          sub="Jobs applied to"
          stripe="from-sky-400 to-blue-500"
          icon={
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Bookings"
          value={String(bookings.length)}
          sub="All time"
          stripe="from-violet-400 to-purple-500"
          icon={
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Earnings"
          value={usd(earnings)}
          sub="Completed bookings"
          stripe="from-emerald-400 to-teal-500"
          icon={
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── My Bookings ── */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
            Activity
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            My Bookings
          </h2>
        </div>

        {bookings.length > 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] divide-y divide-zinc-50 overflow-hidden">
            {bookings.map((b) => {
              const statusCls = BOOKING_STATUS[b.status] ?? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200";
              return (
                <div key={b.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-zinc-900 truncate">{b.talentName}</p>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{formatDate(b.createdAt)}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${statusCls}`}>
                    {b.status}
                  </span>
                  <p className="text-[14px] font-semibold text-zinc-900 tabular-nums flex-shrink-0 min-w-[64px] text-right">
                    {b.price > 0 ? usd(b.price) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] py-14 text-center">
            <p className="text-[14px] font-medium text-zinc-500">No bookings yet</p>
            <p className="text-[13px] text-zinc-400 mt-1">Apply for jobs to get booked.</p>
          </div>
        )}
      </div>

    </div>
  );
}
