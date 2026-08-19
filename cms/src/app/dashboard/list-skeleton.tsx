/**
 * Dashboard content-list loading skeleton. Matches the shared list page shell
 * (breadcrumb / title / New CTA / table) with shimmer rows. Server component.
 */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10" aria-busy="true">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="cms-skeleton h-4 w-20" />
        <span aria-hidden>/</span>
        <div className="cms-skeleton h-4 w-16" />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="cms-skeleton h-8 w-56" />
          <div className="cms-skeleton h-4 w-72" />
        </div>
        <div className="cms-skeleton h-11 w-32" />
      </header>

      <div className="cms-skeleton h-11 w-full max-w-md" />

      <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface">
        <div className="flex gap-6 border-b border-crs-border bg-crs-bg/80 px-4 py-3">
          {[20, 14, 12, 14].map((w, i) => (
            <div key={i} className="cms-skeleton h-3" style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-crs-border/70 px-4 py-4 last:border-b-0">
            <div className="cms-skeleton h-4 w-2/5" />
            <div className="cms-skeleton h-6 w-24 rounded-full" />
            <div className="cms-skeleton h-6 w-16 rounded-full" />
            <div className="cms-skeleton h-4 w-24" />
          </div>
        ))}
      </div>
    </main>
  );
}
