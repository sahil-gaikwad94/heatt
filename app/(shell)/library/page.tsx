'use client';
/* ============================================================================
   /library — the reading desk. Saved forages, in-progress rows with resume
   bars, finished receipts, and an offline-ready cache panel.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { TopBar } from '@/components/shell/Shell';
import { Avatar, Meter, Sparkline } from '@/components/ui/primitives';
import { bodyCacheSize, clearBodies } from '@/lib/syndicate';
import { kelvin, tempLabel } from '@/lib/heat';
import { cls, timeAgo } from '@/lib/util';
import { heatFor } from '@/lib/feed';

type Row = { id: string; title: string; author: string; handle: string; avatar?: string; minutes: number; pct: number; saved?: number; readAt?: number; temp: number; tags: string[]; kind: 'forge' | 'spark' };

export default function LibraryPage() {
  const app = useApp();
  const s = useStore();
  const [filter, setFilter] = React.useState<'all' | 'saved' | 'reading' | 'done'>('all');
  const [cache, setCache] = React.useState(0);
  React.useEffect(() => setCache(bodyCacheSize()), []);

  const rows: Row[] = React.useMemo(() => {
    const out: Row[] = [];
    for (const p of app.posts) {
      const saved = s.saved[p.id];
      const r = s.reads[p.id];
      if (!saved && !r) continue;
      out.push({
        id: p.id,
        title: p.title ?? p.text?.slice(0, 80) ?? 'Untitled',
        author: p.authorName,
        handle: p.authorHandle,
        avatar: p.authorAvatar,
        minutes: p.minutes ?? 3,
        pct: r?.pct ?? 0,
        saved,
        readAt: r?.at,
        temp: p.heat?.temp ?? heatFor(p, s as any).temp,
        tags: p.tags,
        kind: p.kind,
      });
    }
    return out
      .filter((x) => (filter === 'saved' ? !!x.saved : filter === 'reading' ? x.pct > 0 && x.pct < 97 : filter === 'done' ? x.pct >= 97 : true))
      .sort((a, b) => Math.max(b.saved ?? 0, b.readAt ?? 0) - Math.max(a.saved ?? 0, a.readAt ?? 0));
  }, [app.posts, s, filter]);

  const savedCount = Object.keys(s.saved).length;
  const reading = Object.values(s.reads).filter((r) => r.pct > 0 && r.pct < 97).length;
  const done = Object.values(s.reads).filter((r) => r.pct >= 97).length;
  const minutes = Object.values(s.activity).reduce((a, d) => a + d.minutes, 0);
  const totalWords = rows.reduce((a, r) => a + Math.round((r.minutes * 225 * r.pct) / 100), 0);

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <TopBar title="Library" sub={`${savedCount} saved · ${reading} in progress`} />

      <div className="mt-1 grid gap-3 sm:grid-cols-3">
        <StatCard label="saved for later" value={String(savedCount)} foot="stored on this device" />
        <StatCard label="in progress" value={String(reading)} foot="resume where you stopped" accent />
        <StatCard label="finished" value={String(done)} foot={`${minutes} min read · ${totalWords.toLocaleString()} words`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-white/[.06] pb-3">
        {(['all', 'saved', 'reading', 'done'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cls('ht-chip !normal-case !tracking-normal', filter === f && '!border-ember-500/50 !bg-ember-500/12 !text-ember-200')}>
            {f === 'all' ? 'Everything' : f === 'reading' ? 'In progress' : f === 'done' ? 'Finished' : 'Saved'}
          </button>
        ))}
        <span className="flex-1" />
        <div className="flex items-center gap-2 text-[11.5px] text-ink-mute">
          <span className="ht-num">{cache}</span> article{cache === 1 ? '' : 's'} cached for offline
          <button
            onClick={() => {
              clearBodies();
              setCache(0);
              app.toast('Offline text cache cleared', 'cool');
            }}
            className="ht-btn ht-btn--ghost !py-1 !text-[11px]"
          >
            clear
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 pb-8">
        {rows.map((r, i) => {
          const t = tempLabel(r.temp);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.2, i * 0.035), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="ht-card flex items-center gap-3.5 p-3.5"
            >
              <Avatar name={r.author} handle={r.handle} src={r.avatar} size={38} />
              <div className="min-w-0 flex-1">
                <button onClick={() => app.openPost(r.id)} className="block w-full text-left">
                  <span className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink hover:text-white">{r.title}</span>
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-mute">
                  <span>@{r.handle}</span>
                  <span>·</span>
                  <span>{r.minutes} min</span>
                  {r.saved && (
                    <>
                      <span>·</span>
                      <span className="text-ember-300">saved {timeAgo(r.saved)}</span>
                    </>
                  )}
                  {r.pct > 0 && (
                    <>
                      <span>·</span>
                      <span className={r.pct >= 97 ? 'text-cryo-teal' : ''}>{r.pct >= 97 ? 'finished' : `${r.pct}% read`}</span>
                    </>
                  )}
                </div>
                {r.pct > 0 && r.pct < 97 && <Meter value={r.pct / 100} className="mt-2" />}
              </div>
              <span className="hidden shrink-0 text-right sm:block">
                <span className="ht-num block text-[13px] font-bold" style={{ color: t.color }}>
                  {kelvin(r.temp)}
                </span>
                <span className="block text-[10px] uppercase tracking-[0.1em] text-ink-faint">{t.label}</span>
              </span>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button onClick={() => app.openPost(r.id)} className="ht-btn !px-3 !py-1.5 !text-[11.5px]">
                  {r.pct > 0 && r.pct < 97 ? 'Resume' : 'Open'}
                </button>
                <button
                  onClick={() => {
                    s.toggleSave(r.id);
                    app.toast('Removed from library', 'cool');
                  }}
                  className="ht-btn ht-btn--ghost !px-3 !py-1 !text-[11px]"
                >
                  remove
                </button>
              </div>
            </motion.div>
          );
        })}

        {rows.length === 0 && (
          <div className="ht-panel p-10 text-center">
            <h3 className="ht-title text-[20px]">Your desk is clear</h3>
            <p className="mx-auto mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-dim">
              Save a forge with the bookmark button and it lives here — cached on this device, resumable to the paragraph you left, and readable on a plane.
            </p>
            <Link href="/feed" className="ht-btn ht-btn--heat mt-4">
              Back to the board
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, foot, accent }: { label: string; value: string; foot: string; accent?: boolean }) {
  return (
    <div className="ht-panel p-4">
      <span className="ht-label !text-[9px]">{label}</span>
      <div className={cls('ht-num mt-1 text-[28px] font-black leading-none', accent ? 'ht-heat-text' : 'text-ink')}>{value}</div>
      <div className="mt-1.5 text-[11.5px] text-ink-faint">{foot}</div>
    </div>
  );
}
