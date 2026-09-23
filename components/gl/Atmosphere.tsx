/* ============================================================================
   components/gl/Atmosphere — the room tone of heatt.

   Deliberately *not* a full-bleed animated lava field. Two soft glows over a
   deep near-black base, one barely-visible grid, and a whisper of noise. The
   only motion is a single ~52s drift, so the environment feels alive without
   ever pulling attention off the content. Pure CSS — no canvas, no rAF.
   ==========================================================================*/

export function Atmosphere({ variant = 'app' }: { variant?: 'app' | 'public' }) {
  const lime = variant === 'public' ? 0.14 : 0.085;
  const aurora = variant === 'public' ? 0.18 : 0.1;
  return (
    <div className="ht-atmos" aria-hidden>
      <div
        className="ht-atmos-glow ht-atmos-glow-warm"
        style={{ background: `radial-gradient(circle, rgba(0,229,160,${lime}), transparent 68%)` }}
      />
      <div
        className="ht-atmos-glow ht-atmos-glow-cool"
        style={{ background: `radial-gradient(circle, rgba(61,220,255,${aurora}), transparent 68%)` }}
      />
      <div className="ht-atmos-grid" />
      <div className="ht-atmos-noise" />
    </div>
  );
}
