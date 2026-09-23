import type { Metadata } from 'next';
import { AppGate } from '@/components/boot/AppGate';
import { MobileTabs, ReferenceHeader } from '@/components/shell/Shell';
import { ReadingDock } from '@/components/reading/ReadingDock';

export const metadata: Metadata = {
  title: { default: 'heatt — where ideas burn', template: '%s · heatt' },
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGate>
      <div className="reference-room">
        <ReferenceHeader />
        <main className="mx-auto min-w-0 w-full max-w-[1080px] px-4 pb-[120px] pt-0 sm:px-6 md:pb-[140px]">{children}</main>
      </div>
      <MobileTabs />
      <ReadingDock />
    </AppGate>
  );
}
