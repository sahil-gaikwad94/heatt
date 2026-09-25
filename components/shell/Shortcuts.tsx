'use client';
/* ============================================================================
   components/shell/Shortcuts — the keyboard sheet (?).

   Everything in heatt is reachable by tapping. This is for the people who
   would rather not: one honest page that lists what the keyboard can do,
   opened with ? and never shown uninvited.
   ==========================================================================*/

import * as React from 'react';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Modal } from '@/components/ui/primitives';

type Row = { keys: string[]; what: string };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'anywhere',
    rows: [
      { keys: ['⌘', 'K'], what: 'Search everything, or jump to a screen' },
      { keys: ['/'], what: 'Search the same way' },
      { keys: ['?'], what: 'This sheet' },
      { keys: ['Esc'], what: 'Close whatever is open' },
      { keys: ['N'], what: 'Write a note' },
    ],
  },
  {
    title: 'the board',
    rows: [
      { keys: ['J'], what: 'Next story' },
      { keys: ['K'], what: 'Previous story' },
      { keys: ['H'], what: 'Heat the story under the cursor' },
      { keys: ['↵'], what: 'Open it' },
    ],
  },
  {
    title: 'reading',
    rows: [
      { keys: ['S'], what: 'Keep it in your library' },
      { keys: ['Esc'], what: 'Back to the board' },
    ],
  },
  {
    title: 'going places',
    rows: [
      { keys: ['G', 'F'], what: 'Board' },
      { keys: ['G', 'E'], what: 'Explore' },
      { keys: ['G', 'L'], what: 'Library' },
      { keys: ['G', 'N'], what: 'Signals' },
      { keys: ['G', 'P'], what: 'Your profile' },
      { keys: ['G', 'S'], what: 'Settings' },
    ],
  },
];

export function Shortcuts() {
  const app = useApp();
  const s = useStore();
  const me = s.me?.handle ?? 'you';

  return (
    <Modal open={app.shortcutsOpen} onClose={() => app.setShortcuts(false)} label="Keyboard shortcuts" align="top">
      <div className="flex max-h-[min(80dvh,700px)] flex-col">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <span className="ht-eyebrow">keyboard</span>
            <h2 className="ht-title mt-1 text-[17px] text-ink">Everything here is also a tap away</h2>
          </div>
          <button onClick={() => app.setShortcuts(false)} className="ht-icon-btn !h-8 !w-8" aria-label="Close shortcuts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="ht-no-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {GROUPS.map((g) => (
            <section key={g.title} className="mb-6 last:mb-1">
              <span className="ht-label block !text-[9.5px] text-ink-4">{g.title}</span>
              <dl className="mt-2.5 space-y-1.5">
                {g.rows.map((r) => (
                  <div key={r.keys.join('') + r.what} className="flex items-center gap-3">
                    <dt className="flex w-[86px] shrink-0 items-center gap-1.5">
                      {r.keys.map((k, i) => (
                        <React.Fragment key={`${k}-${i}`}>
                          {i > 0 && <span className="text-[10px] text-ink-4">then</span>}
                          <kbd className="ht-kbd">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </dt>
                    <dd className="min-w-0 flex-1 text-[13.5px] text-ink-2">{r.what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <p className="mt-5 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-4">
            You are signed in on this device as <span className="text-ink-3">@{me}</span> — no account, no password,
            nothing leaving the browser.
          </p>
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-5 py-3.5">
          <span className="text-[12px] text-ink-4">Tap anywhere outside to close</span>
          <span className="flex-1" />
          <button onClick={() => app.setShortcuts(false)} className="ht-btn ht-btn--quiet !h-9">
            Got it
          </button>
        </footer>
      </div>
    </Modal>
  );
}
