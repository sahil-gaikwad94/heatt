import { cn } from '../../lib/cn'

/* A publisher's mark — the owner of a flare. Tailwind-only so it never
   fights the legacy `.source-mark` styles for cascade priority. */

const gradients: Record<string, string> = {
  coral: 'linear-gradient(145deg, #de896f, #b35640)',
  sage: 'linear-gradient(145deg, #98b49b, #5e7964)',
  lilac: 'linear-gradient(145deg, #b6a4c8, #78648f)',
  amber: 'linear-gradient(145deg, #e1b160, #a9702f)',
  ink: 'linear-gradient(145deg, #66716f, #333b39)',
}

export function SourceMark({ accent, initials, className, style }: {
  accent: string
  initials: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl border border-white/40 font-mono font-semibold tracking-[-0.04em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25)]',
        className,
      )}
      style={{ background: gradients[accent] ?? gradients.ink, ...style }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
