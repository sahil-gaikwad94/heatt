'use client';
/* ============================================================================
   components/shell/RouteFocus — where the cursor goes when the page changes.

   A tap on the dock swaps the whole page underneath you. Without this, the
   screen reader is still sitting on the dock and the next Tab walks backwards
   through the navigation. On every route change we move focus to the main
   region (no scroll jump, no visible ring on a non-interactive element) and
   let the live region announce the new page by name.
   ==========================================================================*/

import * as React from 'react';
import { usePathname } from 'next/navigation';

export function RouteFocus() {
  const path = usePathname();
  const [announced, setAnnounced] = React.useState('');

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      /* never steal focus from something the reader opened */
      if (document.querySelector('[role="dialog"]')) return;
      const main = document.getElementById('main');
      main?.focus?.({ preventScroll: true });
      const heading = main?.querySelector('h1');
      const label = (heading?.textContent || document.title || '').trim();
      if (label) setAnnounced(label);
    }, 140);
    return () => window.clearTimeout(t);
  }, [path]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {announced ? `${announced} — page` : ''}
    </p>
  );
}
