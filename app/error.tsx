'use client';
/* ============================================================================
   app/error.tsx — the room's error boundary.

   Something threw while rendering. We do not show a stack, we do not show a
   sad face: we say what happened, keep the room, and offer the two doors that
   actually help — try the page again, or go back to the board.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    /* one line, in the console, for whoever is debugging */
    console.error('[heatt] render error:', error?.message, error?.digest ?? '');
  }, [error]);

  return (
    <main className="ht-room ht-grain grid min-h-[100dvh] place-items-center px-6">
      <div className="ht-stage max-w-[560px] text-center">
        <span className="ht-eyebrow block">something broke</span>
        <h1 className="ht-display mt-4 text-[clamp(1.8rem,1.4rem+2.2vw,2.8rem)] text-ink">
          That did not load.
        </h1>
        <p className="ht-lead mx-auto mt-4 max-w-[48ch]">
          The page hit an error while rendering. Your heat, keeps and drafts are stored locally and are untouched.
        </p>
        {error?.digest && <p className="ht-num mt-3 text-[11px] text-ink-4">ref {error.digest}</p>}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="ht-btn ht-btn--heat !h-[46px] !px-6 !text-[14px]">
            Try again
          </button>
          <Link href="/feed" className="ht-btn ht-btn--quiet !h-[46px] !px-5 !text-[14px]">
            Back to the board
          </Link>
          <Link href="/settings" className="ht-btn ht-btn--ghost !h-[46px] !px-4 !text-[13.5px]">
            Clear this device
          </Link>
        </div>
      </div>
    </main>
  );
}
