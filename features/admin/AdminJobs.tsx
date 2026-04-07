"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AdminJob = {
  id: string;
  title: string;
  category: string | null;
  budget: number | null;
  deadline: string | null;
  created_at: string;
  status: string;
  agencyName: string;
  submissionCount: number;
  description: string | null;
  location: string | null;
  gender: string | null;
  ageMin: number | null;
  ageMax: number | null;
  jobDate: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  open:     "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  closed:   "bg-zinc-100   text-zinc-500   ring-1 ring-zinc-200",
  draft:    "bg-amber-50   text-amber-600  ring-1 ring-amber-100",
  inactive: "bg-zinc-100   text-zinc-400   ring-1 ring-zinc-200",
};

const JOB_STATUSES = ["open", "draft", "closed", "inactive"];

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatJobDate(s: string | null) {
  if (!s) return null;
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
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

function JobRow({ job, onDelete }: { job: AdminJob; onDelete: (id: string) => void }) {
  const [expanded, setExpanded]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [confirm, setConfirm]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editTitle, setEditTitle] = useState(job.title);
  const [editStatus, setEditStatus] = useState(job.status);
  const [editBudget, setEditBudget] = useState(String(job.budget ?? ""));
  const [editDeadline, setEditDeadline] = useState(job.deadline ?? "");
  const [localJob, setLocalJob]   = useState(job);
  const stCls = STATUS_STYLES[localJob.status] ?? STATUS_STYLES["closed"];

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:    editTitle.trim(),
        status:   editStatus,
        budget:   editBudget ? Number(editBudget) : null,
        deadline: editDeadline || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setLocalJob((j) => ({ ...j, title: editTitle.trim(), status: editStatus, budget: editBudget ? Number(editBudget) : null, deadline: editDeadline || null }));
      setEditing(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "DELETE" });
    if (res.ok) onDelete(job.id);
    setConfirm(false);
  }

  const detailItems = [
    { label: "Agency",      value: localJob.agencyName },
    { label: "Status",      value: localJob.status },
    { label: "Budget",      value: localJob.budget ? usd(localJob.budget) : "—" },
    { label: "Applications",value: String(localJob.submissionCount) },
    { label: "Category",    value: localJob.category ?? "—" },
    { label: "Location",    value: localJob.location ?? "—" },
    { label: "Gender",      value: localJob.gender ?? "—" },
    { label: "Age Range",   value: localJob.ageMin || localJob.ageMax ? `${localJob.ageMin ?? "Any"} – ${localJob.ageMax ?? "Any"}` : "—" },
    { label: "Job Date",    value: formatJobDate(localJob.jobDate) ?? "—" },
    { label: "Deadline",    value: formatDate(localJob.deadline) },
    { label: "Posted",      value: formatDate(localJob.created_at) },
  ];

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={`Move "${localJob.title}" to trash?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
      <tr onClick={() => !editing && setExpanded((v) => !v)}
        className="hover:bg-zinc-50/60 transition-colors cursor-pointer">
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className={`w-3.5 h-3.5 text-zinc-300 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <p className="text-[13px] font-semibold text-zinc-900 truncate max-w-[180px]">{localJob.title}</p>
          </div>
        </td>
        <td className="px-4 py-4">
          <span className="text-[13px] text-zinc-500 truncate max-w-[160px] block">{localJob.agencyName}</span>
        </td>
        <td className="px-4 py-4 hidden sm:table-cell">
          <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${stCls}`}>
            {localJob.status}
          </span>
        </td>
        <td className="px-4 py-4 hidden sm:table-cell">
          {localJob.category
            ? <span className="text-[11px] font-medium bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full">{localJob.category}</span>
            : <span className="text-[13px] text-zinc-300">—</span>}
        </td>
        <td className="px-4 py-4 text-right hidden md:table-cell">
          <span className="text-[13px] font-semibold text-zinc-900 tabular-nums">
            {localJob.budget ? usd(localJob.budget) : "—"}
          </span>
        </td>
        <td className="px-4 py-4 text-right hidden md:table-cell">
          <span className="text-[13px] text-zinc-500 tabular-nums">{localJob.submissionCount}</span>
        </td>
        <td className="px-4 py-4 hidden lg:table-cell">
          <span className="text-[13px] text-zinc-500">{localJob.deadline ? formatDate(localJob.deadline) : "—"}</span>
        </td>
        <td className="px-4 py-4 hidden lg:table-cell">
          <span className="text-[12px] text-zinc-400">{formatDate(localJob.created_at)}</span>
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
        <tr>
          <td colSpan={9} className="px-0 py-0">
            <div className="border-t border-zinc-50 bg-zinc-50/60 px-6 py-5 space-y-4">
              {editing ? (
                <div className="space-y-4 max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Edit Job</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 block">Title</label>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 block">Status</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white">
                        {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 block">Budget (USD)</label>
                      <input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none bg-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 block">Deadline</label>
                      <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)}
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
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-[12px]">
                    {detailItems.map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-0.5">{label}</p>
                        <p className="text-zinc-700 font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                  {localJob.description && (
                    <div>
                      <p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Description</p>
                      <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-line max-w-2xl">{localJob.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminJobs({ jobs: initialJobs }: { jobs: AdminJob[] }) {
  const [jobs, setJobs]             = useState<AdminJob[]>(initialJobs);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function handleDelete(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  const filtered = jobs.filter((j) => {
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    if (!matchStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      (j.category ?? "").toLowerCase().includes(q) ||
      j.agencyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Platform Admin</p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">Jobs</h1>
          <p className="text-[13px] text-zinc-400 mt-1">{jobs.length} total jobs</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search jobs…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-zinc-200 rounded-xl placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors" />
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 self-start flex-shrink-0">
          {(["all", "open", "draft", "closed", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={["px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all capitalize cursor-pointer whitespace-nowrap",
                statusFilter === s ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"].join(" ")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Title</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Agency</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden md:table-cell">Budget</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden md:table-cell">Apps</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden lg:table-cell">Deadline</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap hidden lg:table-cell">Posted</th>
                <th className="px-4 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((job) => (
                <JobRow key={job.id} job={job} onDelete={handleDelete} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <p className="text-[14px] font-medium text-zinc-500">No jobs found</p>
                    <p className="text-[13px] text-zinc-400 mt-1">Try adjusting your search or filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/50">
          <p className="text-[12px] text-zinc-400 font-medium">{filtered.length} of {jobs.length} jobs</p>
        </div>
      </div>
    </div>
  );
}
