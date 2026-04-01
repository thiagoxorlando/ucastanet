"use client";

import { useState } from "react";

export type Booking = {
  id: string;
  talentName: string;
  status: string;
  totalValue: number;
  createdAt: string;
};

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

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const STATUS: Record<string, { label: string; cls: string }> = {
  completed:  { label: "Completed",  cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" },
  pending:    { label: "Pending",    cls: "bg-amber-50  text-amber-700  ring-1 ring-amber-100"    },
  disputed:   { label: "Disputed",  cls: "bg-rose-50   text-rose-600   ring-1 ring-rose-100"     },
  cancelled:  { label: "Cancelled", cls: "bg-zinc-100  text-zinc-500   ring-1 ring-zinc-200"     },
};

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600", "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500", "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",     "from-fuchsia-400 to-purple-600",
];

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: (id: string) => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const st = STATUS[booking.status] ?? { label: booking.status, cls: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200" };
  const canAct = booking.status !== "completed" && booking.status !== "cancelled";

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", notify_admin: true }),
    });
    setCancelling(false);
    setConfirming(false);
    if (res.ok) onCancel(booking.id);
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50/60 transition-colors group">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(booking.talentName)} flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white`}>
        {initials(booking.talentName)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-zinc-900 leading-snug truncate">{booking.talentName}</p>
        <p className="text-[12px] text-zinc-400 mt-0.5">{formatDate(booking.createdAt)}</p>
      </div>

      <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${st.cls}`}>
        {st.label}
      </span>

      {booking.totalValue > 0 && (
        <p className="text-[15px] font-semibold text-zinc-900 tabular-nums flex-shrink-0 min-w-[80px] text-right">
          {usd(booking.totalValue)}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          disabled={!canAct}
          className={[
            "text-[12px] font-semibold px-4 py-2 rounded-xl transition-all duration-150 active:scale-[0.97]",
            canAct ? "bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer" : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
          ].join(" ")}
        >
          {booking.status === "completed" ? "Paid" : "Pay Now"}
        </button>

        {canAct && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="text-[12px] font-semibold px-4 py-2 rounded-xl border border-zinc-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-zinc-500 transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
        )}

        {confirming && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-zinc-500">Sure?</span>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              {cancelling ? "…" : "Yes"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingList({ bookings: initial }: { bookings: Booking[] }) {
  const [bookings, setBookings] = useState(initial);

  function handleCancel(id: string) {
    setBookings((prev) =>
      prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b)
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Agency</p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">Bookings</h1>
        </div>
        <p className="text-[13px] text-zinc-400 font-medium pb-1">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {bookings.length > 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] divide-y divide-zinc-50 overflow-hidden">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} onCancel={handleCancel} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] py-20 text-center">
          <div className="w-11 h-11 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-zinc-500">No bookings yet</p>
          <p className="text-[13px] text-zinc-400 mt-1">Bookings will appear here once created.</p>
        </div>
      )}
    </div>
  );
}
