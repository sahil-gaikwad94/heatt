'use client';
/* ============================================================================
   components/palette/CommandPalette — ⌘K.

   Search the whole corpus and jump anywhere, or run one of a handful of
   actions. No hidden features: everything here is also reachable by tapping.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { matches } from '@/lib/feed';
import { cls, compact, timeAgo } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';

type Row = {
  id: string;
  label: string;
  hint?: string;
  kind: 'go' | 'post' | 'person' | 'action';
  run: () => void;
};

export function CommandPalette() {
  const app = useApp();
  const s = useStore();
  const open = app.paletteOpen;
  const [q, setQ] = React.useState('');
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = () => app.setPalette(false);

  const rows = React.useMemo<Row[]>(() => {
    const base: Row[] = [
      { id: 'go-feed', label: 'Board', hint: 'what is burning', kind: 'go', run: () => app.go('/feed') },
      { id: 'go-explore', label: 'Explore', hint: 'search and topics', kind: 'go', run: () => app.go('/explore') },
      { id: 'go-library', label: 'Library', hint: `${Object.keys(s.saved).length} kept`, kind: 'go', run: () => app.go('/library') },
      { id: 'go-me', label: 'Your profile', kind: 'go', run: () => app.go(`/u/${s.me?.handle ?? 'you'}`) },
      { id: 'go-settings', label: 'Settings', kind: 'go', run: () => app.go('/settings') },
      { id: 'act-write', label: 'Write a note', hint: 'n', kind: 'action', run: () => app.setComposer(true) },
      { id: 'act-story', label: 'Write a story', kind: 'action', run: () => app.setComposer(true, { kind: 'forge' }) },
    ];

    if (!q.trim()) return base;

    const posts = app.posts.filter((p) => matches(p, q)).slice(0, 6);
    const people = [...new Set(app.posts.map((p) => p.authorHandle))]
      .filter((h) => h.includes(q.toLowerCase().replace(/^@/, '')))
      .slice(0, 4)
      .map((h) => {
        const u = app.posts.find((p) => p.authorHandle === h)?.author;
        return { h, name: u?.name ?? h };
      });

    return [
      ...base.filter((r) => r.label.toLowerCase().includes(q.toLowerCase())),
      ...posts.map((p) => ({
        id: `post-${p.id}`,
        label: p.title ?? (p.text ?? '').slice(0, 64),
        hint: `@${p.authorHandle} · ${p.kind === 'forge' ? `${p.minutes} min` : 'note'} · ${timeAgo(p.date)}`,
        kind: 'post' as const,
        run: () => app.openPost(String(p.id)),
      })),
      ...people.map(({ h, name }) => ({
        id: `person-${h}`,
        label: name,
        hint: `@${h}`,
        kind: 'person' as const,
        run: () => app.go(`/u/${h}`),
      })),
    ].slice(0, 12);
  }, [q, app, s.saved, s.me]);

  React.useEffect(() => setCursor((c) => Math.min(c, Math.max(0, rows.length - 1))), [rows.length]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(rows.length - 1, c + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const row = rows[cursor];
        if (row) {
          row.run();
          close();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, rows, cursor]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex justify-center px-4"
          style={{ alignItems: 'flex-start', paddingTop: '11vh' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button className="ht-scrim absolute inset-0" aria-label="Close search" onClick={close} />
          <motion.div
            role="dialog"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            className="ht-modal relative z-[1] !max-h-[70dvh]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="text-ink-4" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4.2-4.2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search stories, writers, or run a command…"
                aria-label="Search or run a command"
                className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-ink-4"
              />
              <kbd className="ht-kbd">esc</kbd>
            </div>

            <div className="ht-no-scrollbar max-h-[52dvh] overflow-y-auto p-2">
              {rows.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-4">Nothing matched “{q}”.</p>}
              {rows.map((r, i) => (
                <button
                  key={r.id}
                  role="option"
                  aria-selected={i === cursor}
                  data-palette-item
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => {
                    r.run();
                    close();
                  }}
                  className={cls(
                    'flex w-full items-center gap-3 rounded-[var(--r-sm)] px-3 py-2.5 text-left transition-colors',
                    i === cursor ? 'bg-white/[.07]' : 'hover:bg-white/[.04]'
                  )}
                >
                  <span
                    className={cls(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px]',
                      r.kind === 'person' ? 'border-line text-ink-2' : r.kind === 'post' ? 'border-line text-ember-300' : 'border-line text-ink-3'
                    )}
                    aria-hidden
                  >
                    {r.kind === 'go' ? '→' : r.kind === 'action' ? '+' : r.kind === 'person' ? '@' : '¶'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">{r.label}</span>
                    {r.hint && <span className="block truncate text-[11.5px] text-ink-4">{r.hint}</span>}
                  </span>
                  {r.kind === 'post' && <span className="ht-num shrink-0 text-[11px] text-ink-4">{compact(i)}</span>}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-4">
              <span className="flex items-center gap-1.5">
                <kbd className="ht-kbd">↑</kbd>
                <kbd className="ht-kbd">↓</kbd> move
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="ht-kbd">↵</kbd> open
              </span>
              <span className="ml-auto">{app.posts.length} pieces indexed</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
