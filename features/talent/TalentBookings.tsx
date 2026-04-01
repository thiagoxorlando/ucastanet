"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Booking = {
  id: string;
  job_title: string;
  status: string;
  price: number;
  created_at: string;
};

const STATUS_CLS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  pending:   "bg-amber-50  text-amber-700  ring-1 ring-amber-100",
  disputed:  "bg-rose-50   text-rose-600   ring-1 ring-rose-100",
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

export default function TalentBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("bookings")
        .select("id, job_title, status, price, created_at")
        .eq("talent_user_id", user.id)
        .order("created_at", { ascending: false });

      setBookings(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
          Activity
        </p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">
          My Bookings
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] py-16 text-center">
          <p className="text-[14px] font-medium text-zinc-500">No bookings yet</p>
          <p className="text-[13px] text-zinc-400 mt-1">Apply for jobs to get booked.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] divide-y divide-zinc-50 overflow-hidden">
          {bookings.map((b) => {
            const statusCls = STATUS_CLS[b.status] ?? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200";
            return (
              <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-zinc-900 truncate">
                    {b.job_title || "Booking"}
                  </p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">{formatDate(b.created_at)}</p>
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
      )}
    </div>
  );
}
