import type { Metadata } from 'next';
import { AppGate } from '@/components/boot/AppGate';
import { BottomDock } from '@/components/shell/Shell';
import { ReadingDock, ReadingRail } from '@/components/reading/ReadingDock';
import { RouteFocus } from '@/components/shell/RouteFocus';

export const metadata: Metadata = {
  title: { default: 'heatt — a room, not a feed', template: '%s · heatt' },
};

/**
 * The app frame: one bottom dock, one floating reading pill, one progress
 * rail. Nothing else is pinned to the viewport, so every screen is free to
 * use its whole height.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGate>
      <div className="ht-room">
        <a href="#main" className="ht-skip-link">
          Skip to content
        </a>
        <main id="main" tabIndex={-1} className="min-h-[100dvh] pb-[116px]">
          {children}
        </main>
        <RouteFocus />
      </div>
      <ReadingRail />
      <ReadingDock />
      <BottomDock />
    </AppGate>
  );
}
