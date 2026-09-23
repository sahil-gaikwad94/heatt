import type { Metadata } from 'next';
import { AppGate } from '@/components/boot/AppGate';
import { MobileTabs, NavRail, RightRail } from '@/components/shell/Shell';
import { ReadingDock } from '@/components/reading/ReadingDock';

export const metadata: Metadata = {
  title: { default: 'heatt — where ideas burn', template: '%s · heatt' },
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGate>
      <div className="mx-auto flex w-full max-w-[1420px]">
        <NavRail />
        <main className="min-w-0 flex-1 px-4 pb-[110px] pt-0 sm:px-6 md:pb-10">{children}</main>
        <RightRail />
      </div>
      <MobileTabs />
      <ReadingDock />
    </AppGate>
  );
}
