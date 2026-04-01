"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/lib/RoleProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  status: "open" | "closed" | "draft";
  postedAt: string;
};

type Submission = {
  id: string;
  talentName: string;
  bio: string;
  status: string;
  mode: string;
  submittedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(raw: string) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function daysUntil(raw: string) {
  const diff = new Date(raw + "T00:00:00").getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Job["status"], string> = {
  open:   "bg-emerald-50 text-emerald-600 border border-emerald-100",
  closed: "bg-zinc-100  text-zinc-500   border border-zinc-200",
  draft:  "bg-amber-50  text-amber-600  border border-amber-100",
};

const SUBMISSION_STATUS: Record<string, string> = {
  pending:  "bg-amber-50  text-amber-700  ring-1 ring-amber-100",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  rejected: "bg-rose-50   text-rose-600   ring-1 ring-rose-100",
};

const CATEGORY_STRIPES: Record<string, string> = {
  "Lifestyle & Fashion": "from-rose-400 via-pink-400 to-fuchsia-400",
  "Technology":          "from-sky-500 via-blue-500 to-indigo-500",
  "Food & Cooking":      "from-amber-400 via-orange-400 to-red-400",
  "Health & Fitness":    "from-emerald-400 via-teal-400 to-cyan-400",
  "Travel":              "from-indigo-400 via-violet-400 to-purple-400",
  "Beauty":              "from-pink-400 via-rose-400 to-red-300",
  "Other":               "from-zinc-300 via-zinc-400 to-zinc-500",
};

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-fuchsia-400 to-purple-600",
];

function stripe(category: string) {
  return CATEGORY_STRIPES[category] ?? CATEGORY_STRIPES["Other"];
}

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0 text-zinc-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 leading-none mb-1">
          {label}
        </p>
        <p className={`text-[14px] font-medium leading-snug ${highlight ? "text-rose-500" : "text-zinc-800"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Submission card ──────────────────────────────────────────────────────────

function SubmissionCard({
  submission,
  jobCategory,
  isSelected,
  isLoading,
  isAgency,
  onSelect,
}: {
  submission: Submission;
  jobCategory: string;
  isSelected: boolean;
  isLoading: boolean;
  isAgency: boolean;
  onSelect: () => void;
}) {
  const statusCls = SUBMISSION_STATUS[submission.status] ?? SUBMISSION_STATUS["pending"];

  return (
    <div className={[
      "bg-white rounded-2xl border overflow-hidden flex flex-col transition-shadow duration-200",
      isSelected
        ? "border-emerald-200 shadow-[0_0_0_3px_rgba(16,185,129,0.12),0_4px_16px_rgba(0,0,0,0.04)]"
        : "border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.07),0_12px_32px_rgba(0,0,0,0.05)]",
    ].join(" ")}>
      <div className={`h-[3px] bg-gradient-to-r ${stripe(jobCategory)}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Talent identity */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(submission.talentName)} flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white`}>
            {initials(submission.talentName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-zinc-900 leading-snug truncate">
              {submission.talentName}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 capitalize">
              {submission.mode === "self" ? "Self-submitted" : "Referred"}
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${statusCls}`}>
            {submission.status}
          </span>
        </div>

        {/* Bio */}
        {submission.bio && (
          <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-3 flex-1">
            {submission.bio}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
          <p className="text-[11px] text-zinc-400">
            {formatDate(submission.submittedAt)}
          </p>
          {isAgency && <button
            onClick={onSelect}
            disabled={isLoading || isSelected}
            className={[
              "inline-flex items-center gap-1.5 text-[12px] font-medium px-4 py-2 rounded-xl transition-all duration-150 active:scale-[0.97]",
              isSelected
                ? "bg-emerald-500 text-white cursor-default"
                : isLoading
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer",
            ].join(" ")}
          >
            {isLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : isSelected ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Booked
              </>
            ) : "Select"}
          </button>}
        </div>
      </div>
    </div>
  );
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="max-w-sm mx-auto pt-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-[15px] font-medium text-zinc-700">Job not found</p>
      <p className="text-[13px] text-zinc-400 mt-1 mb-6">
        This listing may have been removed or doesn't exist.
      </p>
      <Link
        href="/agency/jobs"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Jobs
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JobDetail({
  job,
  submissions,
}: {
  job: Job | null;
  submissions?: Submission[];
}) {
  const router = useRouter();
  const { role } = useRole();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  console.log(job);

  if (!job) return <div className="p-8 text-zinc-400 text-sm">Loading...</div>;

  const safeSubmissions = submissions ?? [];

  const days = daysUntil(job.deadline);
  const urgent = days <= 7 && days > 0 && job.status === "open";

  async function toggleSelect(sid: string, talentName: string) {
    if (selected.has(sid)) return;

    setLoading((prev) => new Set(prev).add(sid));

    const { data, error } = await supabase.from("bookings").insert([
      {
        job_id:      job!.id,
        agency_id:   "22222222-2222-2222-2222-222222222222",
        talent_name: talentName,
        status:      "pending",
        price:       1000,
      },
    ]);

    if (error) {
      console.error("Booking insert failed:", error.message, error.details, error.hint);
      alert(`Booking failed: ${error.message}`);
      setLoading((prev) => { const next = new Set(prev); next.delete(sid); return next; });
      return;
    }

    console.log("booking created", data);
    router.push("/agency/bookings");
  }

  return (
    <div className="max-w-5xl space-y-8">

      {/* ── Header ── */}
      <div>
        <Link
          href="/agency/jobs"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors mb-4"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Jobs
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{job.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[job.status]}`}>
                {job.status}
              </span>
              <span className="text-[12px] font-medium bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full">
                {job.category}
              </span>
              <span className="text-[12px] text-zinc-400">
                Posted {formatDate(job.postedAt)}
              </span>
            </div>
          </div>

          {role === "agency" && job.status !== "closed" && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href={`/job/${job.id}`}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-[13px] font-medium px-5 py-2.5 rounded-xl transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Talent
              </Link>
              <button className="inline-flex items-center gap-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-[13px] font-medium px-5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Job details ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className={`h-[3px] bg-gradient-to-r ${stripe(job.category)}`} />
          <div className="p-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-5">
              Job Description
            </p>
            <p className="text-[15px] text-zinc-600 leading-relaxed">{job.description}</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
            Job Details
          </p>
          <DetailRow label="Category" value={job.category}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
          />
          <DetailRow label="Budget" value={formatBudget(job.budget)}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <DetailRow
            label="Deadline"
            value={urgent ? `${formatDate(job.deadline)} — ${days}d left` : formatDate(job.deadline)}
            highlight={urgent}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <DetailRow label="Submissions" value={`${safeSubmissions.length} received`}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" /></svg>}
          />
          <DetailRow label="Status" value={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>
      </div>

      {/* ── Submissions ── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              Submissions
            </p>
            <p className="text-lg font-semibold tracking-tight text-zinc-900">
              {safeSubmissions.length > 0 ? `${safeSubmissions.length} talent applied` : "No submissions yet"}
            </p>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[13px] font-medium text-emerald-700">{selected.size} selected</span>
            </div>
          )}
        </div>

        {safeSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {safeSubmissions.map((s) => (
              <SubmissionCard
                key={s.id}
                submission={s}
                jobCategory={job.category}
                isSelected={selected.has(s.id)}
                isLoading={loading.has(s.id)}
                isAgency={role === "agency"}
                onSelect={() => toggleSelect(s.id, s.talentName)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] py-16 text-center">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
            <p className="text-[14px] font-medium text-zinc-500">No submissions yet</p>
            <p className="text-[13px] text-zinc-400 mt-1">Talent will appear here once they apply.</p>
          </div>
        )}
      </div>

    </div>
  );
}
