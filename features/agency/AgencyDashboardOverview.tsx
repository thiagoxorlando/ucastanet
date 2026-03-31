import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { mockTalent } from "@/lib/mockData";

// ─── Mock data ────────────────────────────────────────────────────────────────

const stats = [
  {
    label: "Active Jobs",
    value: "12",
    trend: "+3",
    trendLabel: "this week",
    positive: true,
    topColor: "before:bg-indigo-500",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Submissions",
    value: "48",
    trend: "+12",
    trendLabel: "today",
    positive: true,
    topColor: "before:bg-sky-500",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Bookings",
    value: "7",
    trend: "+2",
    trendLabel: "this month",
    positive: true,
    topColor: "before:bg-emerald-500",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

type ActivityType = "booking" | "submission" | "job" | "profile";

const recentActivity: {
  id: number;
  type: ActivityType;
  title: string;
  sub: string;
  time: string;
}[] = [
  {
    id: 1,
    type: "booking",
    title: "Booking confirmed",
    sub: "Lucas Ferreira × Adidas Spring Campaign",
    time: "2h ago",
  },
  {
    id: 2,
    type: "submission",
    title: "New submission",
    sub: "Sofia Mendes applied to Nike Summer Campaign",
    time: "4h ago",
  },
  {
    id: 3,
    type: "job",
    title: "Job posted",
    sub: "TikTok Travel Series — 3 spots open",
    time: "Yesterday",
  },
  {
    id: 4,
    type: "booking",
    title: "Booking completed",
    sub: "Ana Costa × Vogue Brazil Editorial",
    time: "Yesterday",
  },
  {
    id: 5,
    type: "submission",
    title: "New submission",
    sub: "Rafael Lima applied to H&M Fitness Campaign",
    time: "2d ago",
  },
  {
    id: 6,
    type: "profile",
    title: "Profile activated",
    sub: "Sofia Mendes is now visible to brands",
    time: "3d ago",
  },
];

const activityMeta: Record<
  ActivityType,
  { dot: string; label: string; badge: React.ReactNode }
> = {
  booking: {
    dot: "bg-emerald-400",
    label: "Booking",
    badge: <Badge variant="success">Booking</Badge>,
  },
  submission: {
    dot: "bg-sky-400",
    label: "Submission",
    badge: <Badge variant="info">Submission</Badge>,
  },
  job: {
    dot: "bg-indigo-400",
    label: "Job",
    badge: <Badge variant="info">Job</Badge>,
  },
  profile: {
    dot: "bg-amber-400",
    label: "Profile",
    badge: <Badge variant="warning">Profile</Badge>,
  },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  trend,
  trendLabel,
  positive,
  topColor,
  icon,
}: (typeof stats)[number]) {
  return (
    <div
      className={[
        // Card shell
        "relative bg-white rounded-2xl border border-zinc-100 p-6",
        "shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]",
        // Colored top stripe via pseudo-element
        "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-2xl",
        topColor,
      ].join(" ")}
    >
      <div className="flex items-start justify-between mb-5">
        <span className="text-zinc-400">{icon}</span>
        <span
          className={[
            "inline-flex items-center gap-1 text-xs font-medium",
            positive ? "text-emerald-600" : "text-rose-500",
          ].join(" ")}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d={positive ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
            />
          </svg>
          {trend}
        </span>
      </div>

      <p className="text-[2.25rem] font-semibold tracking-tighter text-zinc-900 leading-none">
        {value}
      </p>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <p className="text-xs text-zinc-400">{trendLabel}</p>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  meta,
  href,
  hrefLabel,
}: {
  title: string;
  meta?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {title}
        </h2>
        {meta && (
          <span className="text-xs text-zinc-300 font-medium">{meta}</span>
        )}
      </div>
      {href && hrefLabel && (
        <Link
          href={href}
          className="text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-1"
        >
          {hrefLabel}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgencyDashboardOverview() {
  const recentTalent = mockTalent.slice(0, 3);

  return (
    <div className="max-w-5xl space-y-10">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
            Agency Portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Agency Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monday, March 30, 2026
          </p>
        </div>
        <Link
          href="/agency/create"
          className="hidden sm:inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Talent
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Activity timeline */}
        <div className="xl:col-span-3">
          <SectionHeader
            title="Recent Activity"
            meta={`${recentActivity.length} events`}
          />

          <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* Timeline */}
            <ul className="relative">
              {/* Vertical connector */}
              <div className="absolute left-[2.375rem] top-6 bottom-6 w-px bg-zinc-100" />

              {recentActivity.map((item, i) => {
                const cfg = activityMeta[item.type];
                return (
                  <li
                    key={item.id}
                    className={[
                      "relative flex items-start gap-4 px-5 py-4",
                      i < recentActivity.length - 1
                        ? "border-b border-zinc-50"
                        : "",
                    ].join(" ")}
                  >
                    {/* Dot */}
                    <div className="flex-shrink-0 w-[1.875rem] flex justify-center pt-[5px]">
                      <span
                        className={[
                          "w-2 h-2 rounded-full ring-4 ring-white",
                          cfg.dot,
                        ].join(" ")}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-zinc-800 leading-snug">
                            {item.title}
                          </p>
                          {cfg.badge}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                          {item.sub}
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-400 flex-shrink-0 mt-0.5 tabular-nums">
                        {item.time}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Recent talent */}
        <div className="xl:col-span-2">
          <SectionHeader
            title="Recent Talent"
            href="/agency/talent"
            hrefLabel="View all"
          />

          <div className="flex flex-col gap-3">
            {recentTalent.map((talent) => (
              <Link
                key={talent.id}
                href={`/talent/profile/${talent.username}`}
                className="group block bg-white rounded-2xl border border-zinc-100 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] hover:border-zinc-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={talent.name} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 truncate leading-none">
                        {talent.name}
                      </p>
                      <Badge
                        variant={
                          talent.status === "active" ? "success"
                          : talent.status === "pending" ? "warning"
                          : "default"
                        }
                      >
                        {talent.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 truncate">
                      @{talent.username} · {talent.category}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                      {talent.followers}
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                      followers
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
