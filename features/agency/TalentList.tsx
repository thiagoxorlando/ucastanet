import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { mockTalent, TalentProfile } from "@/lib/mockData";

function statusVariant(status: TalentProfile["status"]) {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "default";
}

export default function TalentList() {
  return (
    <div className="max-w-5xl space-y-4">
      {/* Search / filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search talent…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <select className="text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Talent
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Username
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">
                Category
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">
                Followers
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {mockTalent.map((talent) => (
              <tr key={talent.id} className="hover:bg-zinc-50 transition-colors group">
                {/* Name + Avatar */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={talent.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate leading-none">
                        {talent.name}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{talent.location}</p>
                    </div>
                  </div>
                </td>

                {/* Username */}
                <td className="px-5 py-3.5">
                  <span className="text-zinc-500 font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded">
                    @{talent.username}
                  </span>
                </td>

                {/* Category */}
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <span className="text-zinc-600 text-xs">{talent.category}</span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <Badge variant={statusVariant(talent.status)}>{talent.status}</Badge>
                </td>

                {/* Followers */}
                <td className="px-5 py-3.5 text-right hidden md:table-cell">
                  <span className="font-semibold text-zinc-900">{talent.followers}</span>
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/talent/profile/${talent.username}`}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            {mockTalent.length} talent{mockTalent.length !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-colors disabled:opacity-40" disabled>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs text-zinc-500 px-2">Page 1</span>
            <button className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-colors disabled:opacity-40" disabled>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
