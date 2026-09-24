/* ============================================================================
   app/(shell)/loading.tsx — the route-transition skeleton.

   Same geometry as the board (page head, feature card, two cards) so the
   layout does not jump when the real page arrives. Shimmer only; no spinner.
   ==========================================================================*/

export default function ShellLoading() {
  return (
    <div className="ht-stage pt-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="mb-7 mt-7">
        <span className="ht-skeleton block h-3 w-24 rounded-full" />
        <span className="ht-skeleton mt-4 block h-9 w-[58%] rounded-[var(--r-sm)]" />
        <span className="ht-skeleton mt-4 block h-3.5 w-[80%] rounded-full" />
      </div>

      <div className="ht-card mb-4 overflow-hidden">
        <span className="ht-skeleton block aspect-[16/9] w-full" />
        <div className="p-4">
          <span className="ht-skeleton block h-4 w-[62%] rounded-full" />
          <span className="ht-skeleton mt-3 block h-3.5 w-[88%] rounded-full" />
          <span className="ht-skeleton mt-2.5 block h-3.5 w-[70%] rounded-full" />
        </div>
      </div>

      <div className="space-y-3.5">
        {[0, 1].map((i) => (
          <div key={i} className="ht-card ht-card--pad">
            <div className="flex items-center gap-3">
              <span className="ht-skeleton h-9 w-9 rounded-full" />
              <span className="ht-skeleton h-3 w-28 rounded-full" />
            </div>
            <span className="ht-skeleton mt-4 block h-3.5 w-full rounded-full" />
            <span className="ht-skeleton mt-2.5 block h-3.5 w-[76%] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
