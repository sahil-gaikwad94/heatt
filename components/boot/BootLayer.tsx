'use client';
/* ============================================================================
   components/boot/BootLayer — first-visit choreography + global overlays.

   First visit:  4.2s cinematic intro → 4-scene onboarding → the board.
   Every other visit: straight in, no delay, no flash.

   The shell stays mounted underneath the whole time so the app is warm by the
   time it is revealed. Heavy overlays (share studio, composer, palette) are
   dynamically imported so the intro never waits on them.
   ==========================================================================*/

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Atmosphere } from '@/components/gl/Atmosphere';
import { Toast } from '@/components/ui/primitives';

const CinematicIntro = dynamic(() => import('@/components/intro/CinematicIntro').then((m) => m.CinematicIntro), { ssr: false });
const Onboarding = dynamic(() => import('@/components/onboarding/Onboarding').then((m) => m.Onboarding), { ssr: false });
const ShareStudio = dynamic(() => import('@/components/share/ShareStudio').then((m) => m.ShareStudio), { ssr: false });
const Composer = dynamic(() => import('@/components/compose/Composer').then((m) => m.Composer), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/palette/CommandPalette').then((m) => m.CommandPalette), { ssr: false });

export function BootLayer({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const introSeen = useStore((s) => s.introSeen);
  const onboarded = useStore((s) => s.onboarded);
  const [hydrated, setHydrated] = React.useState(false);
  const [phase, setPhase] = React.useState<'wait' | 'intro' | 'onboard' | 'app'>('wait');
  const [introDone, setIntroDone] = React.useState(false);

  /* Never decide before the persisted store has rehydrated, or a returning
     reader gets a one-frame flash of the intro. */
  React.useEffect(() => {
    const persist = (useStore as unknown as {
      persist?: { hasHydrated?: () => boolean; onFinishHydration?: (cb: () => void) => () => void };
    }).persist;
    if (!persist?.hasHydrated) {
      setHydrated(true);
      return;
    }
    if (persist.hasHydrated()) setHydrated(true);
    else persist.onFinishHydration?.(() => setHydrated(true)) as unknown as void;
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    setPhase(!introSeen ? 'intro' : !onboarded ? 'onboard' : 'app');
  }, [hydrated, introSeen, onboarded]);

  /* global shortcuts: ⌘K palette, / search, g-then-a-letter to jump */
  const lastG = React.useRef(0);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || !!el?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        app.setPalette(!app.paletteOpen);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === '/') {
        e.preventDefault();
        app.setPalette(true);
        return;
      }
      if (k === 'g') {
        lastG.current = Date.now();
        return;
      }
      if (Date.now() - lastG.current < 900) {
        const dest: Record<string, string> = {
          f: '/feed',
          e: '/explore',
          l: '/library',
          p: `/u/${useStore.getState().me?.handle ?? 'you'}`,
          s: '/settings',
          n: '/notifications',
        };
        const href = dest[k];
        if (href) {
          lastG.current = 0;
          app.go(href);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app]);

  const finishIntro = () => {
    useStore.getState().setIntroSeen();
    setIntroDone(true);
    setPhase(onboarded ? 'app' : 'onboard');
  };

  if (phase === 'wait') return <>{children}</>;

  const blocked = phase !== 'app';

  return (
    <>
      {/* the room's ambient light, paused while the intro owns the frame */}
      {app.prefs.ambient && phase === 'app' && (
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
          <Atmosphere />
        </div>
      )}
      {!app.prefs.ambient && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(90% 70% at 50% 118%, rgba(232,211,164,.05), transparent 62%), radial-gradient(70% 60% at 0% 0%, rgba(107,162,255,.05), transparent 60%), #000',
          }}
        />
      )}

      {phase === 'intro' && <CinematicIntro onDone={finishIntro} done={introDone} />}
      {phase === 'onboard' && <Onboarding onDone={() => setPhase('app')} />}

      <div
        className="relative z-10"
        style={blocked ? { opacity: 0, pointerEvents: 'none' } : undefined}
        aria-hidden={blocked || undefined}
      >
        {children}
      </div>

      <ShareStudio />
      <Composer />
      <CommandPalette />
      <Toast items={app.toasts} dismiss={app.dismissToast} />
    </>
  );
}
