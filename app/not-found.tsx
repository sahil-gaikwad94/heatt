import Link from 'next/link';
import type { Metadata } from 'next';
import { LogoMark } from '@/components/shell/Shell';

export const metadata: Metadata = {
  title: 'Nothing here',
  description:
    'That address does not match anything in heatt. The board of stories and notes is still where you left it — this page just was never part of the room.',
  robots: { index: false, follow: false },
};

/**
 * The 404, in-system: same room, same type, one way back. A dead end should
 * still look like heatt and still offer a door.
 */
export default function NotFound() {
  return (
    <main className="ht-room ht-grain grid min-h-[100dvh] place-items-center px-6">
      <div className="ht-stage max-w-[560px] text-center">
        <Link href="/" className="ht-wordmark justify-center" aria-label="heatt home">
          <LogoMark size={28} />
          <span>heatt</span>
        </Link>

        <span className="ht-eyebrow mt-8 block">404 — not in the room</span>
        <h1 className="ht-display mt-4 text-[clamp(1.9rem,1.5rem+2.4vw,3rem)] text-ink">
          This page was never here.
        </h1>
        <p className="ht-lead mx-auto mt-4 max-w-[46ch]">
          Nothing is broken — the address just does not match anything we have. The board is still where you left it.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/feed" className="ht-btn ht-btn--heat !h-[46px] !px-6 !text-[14px]">
            Back to the board
          </Link>
          <Link href="/explore" className="ht-btn ht-btn--quiet !h-[46px] !px-5 !text-[14px]">
            Search instead
          </Link>
        </div>
      </div>
    </main>
  );
}
