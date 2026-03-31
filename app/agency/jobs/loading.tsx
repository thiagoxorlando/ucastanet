export default function Loading() {
  return (
    <div className="max-w-5xl space-y-8">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
          <div className="h-7 w-24 bg-zinc-100 rounded animate-pulse" />
          <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-zinc-100 rounded-xl animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-64 bg-zinc-100 rounded-xl animate-pulse" />
        <div className="h-10 w-56 bg-zinc-100 rounded-xl animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden"
          >
            <div className="h-[3px] bg-zinc-100" />
            <div className="p-6 space-y-4">
              <div className="h-4 bg-zinc-100 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-zinc-100 rounded animate-pulse w-1/3" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-100 rounded animate-pulse" />
                <div className="h-3 bg-zinc-100 rounded animate-pulse w-5/6" />
              </div>
              <div className="flex gap-4 pt-2 border-t border-zinc-50">
                <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
              </div>
              <div className="h-9 bg-zinc-100 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
