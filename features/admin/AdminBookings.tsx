"use client";

import { Fragment, useState } from "react";

export type AdminBooking = {
  id: string;
  jobTitle: string;
  talentName: string;
  agencyName: string;
  status: string;
  price: number;
  created_at: string;
  contractStatus: string | null;
  contractSentAt: string | null;
  contractAcceptedAt: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending:         "bg-violet-50  text-violet-700  ring-1 ring-violet-100",
  pending_payment: "bg-amber-50   text-amber-700   ring-1 ring-amber-100",
  paid:            "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  confirmed:       "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  cancelled:       "bg-zinc-100   text-zinc-500    ring-1 ring-zinc-200",
  disputed:        "bg-rose-50    text-rose-600    ring-1 ring-rose-100",
};

const STATUS_LABEL: Record<string, string> = {
  pending:         "Awaiting Signature",
  pending_payment: "Pending Payment",
  paid:            "Paid",
  confirmed:       "Paid",
  cancelled:       "Cancelled",
};

const CONTRACT_STYLES: Record<string, string> = {
  sent:     "bg-violet-50  text-violet-700",
  signed:   "bg-emerald-50 text-emerald-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50    text-rose-600",
};

const BOOKING_STATUSES = ["pending", "pending_payment", "paid", "cancelled"];

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <p className="text-[14px] text-zinc-700 font-medium">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-[13px] font-medium text-zinc-600 hover:border-zinc-300 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold transition-colors cursor-pointer">
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking: b, onDelete }: { booking: AdminBooking; onDelete: (id: string) => void }) {
  const [expanded, setExpanded]     = useState(false);
  const [editing, setEditing]       = useState(false);
  const [confirm, setConfirm]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [editStatus, setEditStatus] = useState(b.status);
  const [editPrice, setEditPrice]   = useState(String(b.price));
  const [local, setLocal]           = useState(b);

  const stCls = STATUS_STYLES[local.status] ?? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200";
  const ctCls = local.contractStatus ? (CONTRACT_STYLES[local.contractStatus] ?? "bg-zinc-100 text-zinc-500") : null;
  const paymentStatus = (local.status === "paid" || local.status === "confirmed") ? "paid" : "pending";
  const paymentCls    = paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/bookings/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: editStatus, price: Number(editPrice) }),
    });
    setSaving(false);
    if (res.ok) {
      setLocal((v) => ({ ...v, status: editStatus, price: Number(editPrice) }));
      setEditing(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/bookings/${b.id}`, { method: "DELETE" });
    if (res.ok) onDelete(b.id);
    setConfirm(false);
  }

  return (
    <Fragment>
      {confirm && (
        <ConfirmDialog
          message={`Move booking for "${local.jobTitle}" to trash?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
      <tr onClick={() => !editing && setExpanded((v) => !v)}
        className="hover:bg-zinc-50/60 transition-colors cursor-pointer">
        <td className="px-6 py-4">
          <p className="text-[13px] font-semibold text-zinc-900 truncate max-w-[180px]">{local.jobTitle || "—"}</p>
        </td>
        <td className="px-4 py-4 hidden sm:table-cell">
          <span className="text-[13px] text-zinc-600">{local.talentName}</span>
        </td>
        <td className="px-4 py-4 hidden md:table-cell">
          <span className="text-[13px] text-zinc-500">{local.agencyName}</span>
        </td>
        <td className="px-4 py-4">
          <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full ${stCls}`}>
            {STATUS_LABEL[local.status] ?? local.status.replace("_", " ")}
          </span>
        </td>
        <td className="px-4 py-4 hidden sm:table-cell">
          {ctCls ? (
            <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${ctCls}`}>
              {local.contractStatus}
            </span>
          ) : <span className="text-[12px] text-zinc-300">—</span>}
        </td>
        <td className="px-4 py-4 text-right hidden sm:table-cell">
          <span className="text-[13px] font-semibold text-zinc-900 tabular-nums">{local.price > 0 ? usd(local.price) : "—"}</span>
        </td>
        <td className="px-4 py-4 hidden lg:table-cell">
          <span className="text-[12px] text-zinc-400">{formatDate(local.created_at)}</span>
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setEditing((v) => !v); setExpanded(true); }}
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-zinc-100">
              Edit
            </button>
            <button onClick={() => setConfirm(true)}
              className="text-[11px] font-medium text-rose-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50">
              Delete
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-50/80">
          <td colSpan={8} className="px-6 py-5">
            {editing ? (
              <div className="space-y-4 max-w-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Edit Booking</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 block">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white">
                      {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 block">Price (USD)</label>
                    <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer">
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-white border border-zinc-200 text-zinc-600 text-[12px] font-medium rounded-xl hover:border-zinc-300 transition-colors cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-[12px]">
                <div><p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-0.5">Job</p><p className="text-zinc-700 font-medium">{local.jobTitle || "—"}</p></div>
                <div><p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-0.5">Booking ID</p><p className="font-mono text-zinc-700 truncate">{local.id}</p></div>
                <div><p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-0.5">Talent</p><p className="text-zinc-700">{local.talentName}</p></div>
                <div><p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-0.5">Agency</p><p className="text-zinc-700">{local.agencyName}</p></div>
                <div>
                  <p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Contract Sent</p>
                  <p className="text-zinc-700">{formatDate(local.contractSentAt)}</p>
                  {local.contractStatus && (
                    <span className={`inline-flex mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${CONTRACT_STYLES[local.contractStatus] ?? "bg-zinc-100 text-zinc-500"}`}>
                      {local.contractStatus}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Contract Signed</p>
                  <p className="text-zinc-700">{local.contractStatus === "accepted" ? formatDate(local.contractAcceptedAt) : "—"}</p>
                </div>
                <div>
                  <p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Payment</p>
                  <p className="text-zinc-700 font-semibold">{local.price > 0 ? usd(local.price) : "—"}</p>
                  <span className={`inline-flex mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${paymentCls}`}>{paymentStatus}</span>
                </div>
                <div><p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-0.5">Booked</p><p className="text-zinc-700">{formatDate(local.created_at)}</p></div>
              </div>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function AdminBookings({ bookings: initialBookings }: { bookings: AdminBooking[] }) {
  const [bookings, setBookings] = useState<AdminBooking[]>(initialBookings);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  function handleDelete(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return b.jobTitle.toLowerCase().includes(q) || b.talentName.toLowerCase().includes(q) || b.agencyName.toLowerCase().includes(q);
    });

  const totalValue     = filtered.reduce((s, b) => s + b.price, 0);
  const confirmedValue = filtered.filter((b) => b.status === "paid" || b.status === "confirmed").reduce((s, b) => s + b.price, 0);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Platform Admin</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">Bookings</h1>
        <p className="text-[13px] text-zinc-400 mt-1">{bookings.length} total bookings</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",           value: usd(totalValue),     stripe: "from-zinc-400 to-zinc-600"    },
          { label: "Paid",            value: usd(confirmedValue), stripe: "from-emerald-400 to-teal-500" },
          { label: "Pending Payment", value: String(filtered.filter((b) => b.status === "pending_payment").length), stripe: "from-amber-400 to-orange-500" },
          { label: "Cancelled",       value: String(filtered.filter((b) => b.status === "cancelled").length),       stripe: "from-zinc-300 to-zinc-400"    },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className={`h-[3px] bg-gradient-to-r ${s.stripe}`} />
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">{s.label}</p>
              <p className="text-[1.5rem] font-semibold tracking-tighter text-zinc-900 leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search bookings…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-zinc-200 rounded-xl placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors" />
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 self-start">
          {(["all", "pending", "pending_payment", "paid", "cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={["px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap",
                statusFilter === s ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"].join(" ")}>
              {{ all: "All", pending: "Awaiting Sig.", pending_payment: "Pending Payment", paid: "Paid", cancelled: "Cancelled" }[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Job</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Talent</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hidden md:table-cell">Agency</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Status</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Contract</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Value</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hidden lg:table-cell">Date</th>
                <th className="px-4 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((b) => <BookingRow key={b.id} booking={b} onDelete={handleDelete} />)}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <p className="text-[14px] font-medium text-zinc-500">No bookings found</p>
                </td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-zinc-100 bg-zinc-50/80">
                  <td colSpan={5} className="px-6 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{filtered.length} bookings</p>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <p className="text-[13px] font-semibold text-zinc-900 tabular-nums">{usd(totalValue)}</p>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
