/* ============================================================================
   components/gl/Atmosphere — the room tone.

   Not a lava field. Two enormous, extremely soft lights (one cool, one warm)
   drifting on a 60s loop over a black bed, plus a 1px grid at 1.5% opacity.
   The room should feel alive without ever moving fast enough to pull an eye
   off a paragraph. Pure CSS — no canvas, no rAF.
   ==========================================================================*/

export function Atmosphere({ variant = 'app' }: { variant?: 'app' | 'public' }) {
  const cool = variant === 'public' ? 0.2 : 0.12;
  const warm = variant === 'public' ? 0.12 : 0.07;
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute left-[-14%] top-[-18%] h-[62vmax] w-[62vmax] rounded-full ht-breathe"
        style={{
          background: `radial-gradient(circle, rgba(107,162,255,${cool}), transparent 66%)`,
          filter: 'blur(70px)',
          animationDuration: '62s',
        }}
      />
      <div
        className="absolute right-[-18%] bottom-[-22%] h-[54vmax] w-[54vmax] rounded-full ht-breathe"
        style={{
          background: `radial-gradient(circle, rgba(232,211,164,${warm}), transparent 68%)`,
          filter: 'blur(80px)',
          animationDuration: '78s',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.014) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(70% 60% at 50% 40%, #000 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 40%, #000 20%, transparent 80%)',
        }}
      />
    </div>
  );
}
