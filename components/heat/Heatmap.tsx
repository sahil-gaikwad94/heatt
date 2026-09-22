'use client';
/* ============================================================================
   components/heat/Heatmap — the thermal ledger (spec §5)

   Collapsed: a compact square of the last 5 weeks, high-level only.
   Expanded: a 53-week dashboard with day-level interrogation, weekly rhythm,
   streak mechanics that never punish, and a generated narrative for the day
   you tap. Cells are SVG rects — 365 of them, one paint, no layout thrash.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, streakOf } from '@/lib/store';
import { cls } from '@/lib/util';
import { useApp } from '@/lib/app';
import { narrativeFor, kindWord } from '@/lib/heat-narrative';

type Day = { key: string; date: Date; v: number; reads: number; heats: number; blazes: number; ignites: number; posts: number; minutes: number };

export function buildDays(activity: ReturnType<typeof useStore.getState>['activity'], weeks = 53): Day[][] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  // start on the Sunday 52 weeks back
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  const cols: Day[][] = [];
  let col: Day[] = [];
  const d = new Date(start);
  while (d <= today) {
    const key = d.toISOString().slice(0, 10);
    const a = activity[key];
    const raw = a ? a.reads + a.heats + a.ignites * 2.4 + a.posts * 2 : 0;
    col.push({
      key,
      date: new Date(d),
      v: Math.min(1, raw / 9),
      reads: a?.reads ?? 0,
      heats: a?.heats ?? 0,
      /* older persisted stores predate blazes — read defensively */
      blazes: a?.blazes ?? 0,
      ignites: a?.ignites ?? 0,
      posts: a?.posts ?? 0,
      minutes: a?.minutes ?? 0,
    });
    if (col.length === 7) {
      cols.push(col);
      col = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (col.length) cols.push(col);
  return cols;
}

export function cellColor(v: number) {
  if (v <= 0) return 'rgba(255,255,255,.055)';
  if (v < 0.22) return '#5d2109';
  if (v < 0.45) return '#a83a06';
  if (v < 0.7) return '#ff5c0a';
  if (v < 0.9) return '#ff9d2e';
  return '#fff6de';
}

export function HeatmapCard({ handle, onOpen }: { handle: string; onOpen?: () => void }) {
  const activity = useStore((s) => s.activity);
  const [expanded, setExpanded] = React.useState(false);
  const days = React.useMemo(() => buildDays(activity, expanded ? 53 : 6), [activity, expanded]);
  const flat = days.flat();
  const total = flat.reduce((a, d) => a + d.reads + d.heats + d.ignites + d.posts, 0);
  const streak = streakOf(activity);

  return (
    <motion.div layout className="ht-panel overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <motion.div layout className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="ht-title text-[15px]">Heat map</h2>
            <span className="ht-num text-[11.5px] text-ink-mute">
              {total} actions · <span className="text-ember-300">{streak.current}d</span> lit
            </span>
          </div>
          <div className="mt-3 overflow-hidden rounded-[10px]">
            <Grid days={days} small onCell={() => setExpanded(true)} />
          </div>
          <p className="mt-2 text-[11.5px] text-ink-faint">{cardSubline(flat, expanded)}</p>
        </motion.div>
      </div>
      <div className="flex items-center justify-between border-t border-white/[.06] px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[10.5px] text-ink-mute">
          <span>Less</span>
          {[0, 0.15, 0.35, 0.55, 0.8, 1].map((v) => (
            <span key={v} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cellColor(v) }} />
          ))}
          <span>Incandescent</span>
        </div>
        <div className="flex gap-1.5">
          {onOpen && (
            <button onClick={onOpen} className="ht-btn ht-btn--ghost !py-1 !text-[11.5px]">
              Dashboard
            </button>
          )}
          <button onClick={() => setExpanded((e) => !e)} className="ht-btn !py-1 !text-[11.5px]">
            {expanded ? 'Collapse' : 'Expand year'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Grid({ days, small, onCell, selected, hover }: { days: Day[][]; small?: boolean; onCell?: (d: Day) => void; selected?: string; hover?: string }) {
  const size = small ? 9 : 12;
  const gap = small ? 2.5 : 3.5;
  return (
    <svg
      width={days.length * (size + gap)}
      height={7 * (size + gap)}
      viewBox={`0 0 ${days.length * (size + gap)} ${7 * (size + gap)}`}
      role="img"
      aria-label="Daily heat activity grid"
      style={{ display: 'block', maxWidth: '100%', height: 'auto', overflow: 'visible' }}
    >
      {days.map((week, wi) =>
        week.map((d, di) => (
          <rect
            key={d.key}
            className="ht-cell"
            x={wi * (size + gap)}
            y={di * (size + gap)}
            width={size}
            height={size}
            rx={size / 4}
            fill={cellColor(d.v)}
            stroke={selected === d.key ? 'var(--ht-whitehot)' : hover === d.key ? 'rgba(255,255,255,.4)' : 'transparent'}
            strokeWidth={1.2}
            style={d.v > 0.75 ? { filter: `drop-shadow(0 0 ${3 + d.v * 5}px ${cellColor(d.v)})` } : undefined}
            onClick={() => onCell?.(d)}
          >
            <title>{`${d.key} — ${d.reads} reads · ${d.heats} heats · ${d.ignites} ignitions · ${d.posts} posts`}</title>
          </rect>
        ))
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ dashboard */

export function HeatDashboard() {
  const s = useStore();
  const app = useApp();
  const [sel, setSel] = React.useState<Day | null>(null);
  const days = React.useMemo(() => buildDays(s.activity, 53), [s.activity]);
  const flat = days.flat();
  const streak = streakOf(s.activity);
  const totals = flat.reduce(
    (a, d) => ({
      reads: a.reads + d.reads,
      heats: a.heats + d.heats,
      ignites: a.ignites + d.ignites,
      posts: a.posts + d.posts,
      minutes: a.minutes + d.minutes,
    }),
    { reads: 0, heats: 0, ignites: 0, posts: 0, minutes: 0 }
  );
  const busiest = flat.reduce((a, d) => (d.v > (a?.v ?? -1) ? d : a), flat[0]);
  const weekday = [0, 0, 0, 0, 0, 0, 0];
  flat.forEach((d) => (weekday[d.date.getDay()] += d.reads + d.heats + d.ignites * 2 + d.posts * 2));
  const wmax = Math.max(1, ...weekday);
  const months = days
    .map((w, i) => ({ i, m: w[0]?.date.getMonth() }))
    .filter((x, i, arr) => x.m !== undefined && (i === 0 || arr[i - 1].m !== x.m));

  const todayKey = new Date().toISOString().slice(0, 10);
  const narrative = sel
    ? narrativeFor(
        { key: sel.key, v: sel.v, reads: sel.reads, heats: sel.heats, blazes: sel.blazes, ignites: sel.ignites, posts: sel.posts, minutes: sel.minutes, isToday: sel.key === todayKey },
        flat.map((d) => ({ key: d.key, v: d.v, reads: d.reads, heats: d.heats, blazes: d.blazes, ignites: d.ignites, posts: d.posts, minutes: d.minutes, isToday: d.key === todayKey })),
        streak,
        s.events
      )
    : null;

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="ht-panel relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(80% 120% at 10% 0%, rgba(255,92,10,.1), transparent 60%)' }} />
        <header className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="ht-label">thermal ledger</span>
            <h2 className="ht-title text-[clamp(1.5rem,1.1rem+1.6vw,2.3rem)]">
              {totals.reads + totals.heats + totals.posts > 0 ? 'Your year, lit' : 'Nothing here yet — that changes today'}
            </h2>
            <p className="mt-1 text-[13px] text-ink-mute">
              {app.me ? `@${app.me.handle}` : '@you'} · {flat.length} days tracked · {compactNum(totals.minutes)} minutes of reading ·{' '}
              <span className="text-ember-300">{totals.ignites} ignitions</span>
            </p>
          </div>
          <button onClick={() => { app.toast('Opening share studio for your year', 'heat'); app.setShare('year'); }} className="ht-btn ht-btn--heat !py-2 !text-[12.5px]">
            Share my year
          </button>
        </header>

        <div className="relative overflow-x-auto pb-2">
          <div className="min-w-[720px]">
            <div className="mb-1 flex gap-[3.5px] pl-[26px]">
              {months.map((m) => (
                <span key={m.i} className="text-[10px] uppercase tracking-[0.1em] text-ink-faint" style={{ width: (12 + 3.5) * 4 }}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m.m!]}
                </span>
              ))}
            </div>
            <div className="flex gap-[3.5px]">
              <div className="flex w-[22px] flex-col gap-[3.5px] pr-1 text-[9px] text-ink-faint">
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                  <span key={i} style={{ height: 12, lineHeight: '12px' }}>
                    {d}
                  </span>
                ))}
              </div>
              <Grid days={days} onCell={(d) => setSel(d)} selected={sel?.key} />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {narrative && sel && (
            <motion.div
              key={sel.key}
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="relative mt-4 overflow-hidden rounded-[16px] border border-ember-500/25 bg-[linear-gradient(110deg,rgba(255,45,18,.1),transparent_55%)] p-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="ht-title text-[17px] ht-heat-text">{sel.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                <span className="ht-num text-[12px] text-ink-mute">heat index {Math.round(sel.v * 100)}/100</span>
                <button onClick={() => setSel(null)} className="ht-btn ht-btn--ghost ml-auto !py-0.5 !text-[11px]">
                  close
                </button>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-dim">{narrative.text}</p>
              {narrative.timeline.length > 0 && (
                <ol className="mt-3 space-y-1 border-l border-ember-500/30 pl-3" aria-label="Memorable moments this day">
                  {narrative.timeline.map((e) => (
                    <li key={`${e.id}-${e.t}`} className="text-[12px] text-ink-mute">
                      <span className="ht-num text-ember-300">{new Date(e.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      {' · '}
                      <span className="uppercase tracking-[0.08em] text-[10.5px] text-ink-faint">{kindWord(e.kind)}</span>
                      {' · '}
                      {e.title ? (
                        <>“{e.title.length > 56 ? e.title.slice(0, 55) + '…' : e.title}”</>
                      ) : (
                        'a post'
                      )}
                      {e.author ? <span className="text-ink-faint"> by @{e.author}</span> : null}
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
                <Metric label="reads" v={sel.reads} />
                <Metric label="heats" v={sel.heats} />
                <Metric label="ignitions" v={sel.ignites} hot />
                <Metric label="posts" v={sel.posts} />
                <Metric label="minutes" v={sel.minutes} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="ht-panel p-4">
          <span className="ht-label">current streak</span>
          <div className="mt-1 flex items-end gap-2">
            <span className="ht-title ht-heat-text text-[42px] leading-none">{streak.current}</span>
            <span className="pb-1 text-[12px] text-ink-mute">days</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
            A missed day pauses the streak, it never breaks it. We do not do red gaps.
          </p>
        </div>
        <div className="ht-panel p-4">
          <span className="ht-label">weekly rhythm</span>
          <div className="mt-3 flex h-[54px] items-end gap-1.5">
            {weekday.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(3, (v / wmax) * 100)}%`, background: `linear-gradient(180deg,${cellColor(v / wmax)},rgba(255,92,10,.15))`, transition: 'height .8s cubic-bezier(.2,1,.3,1)' }} />
                <span className="text-[9px] uppercase text-ink-faint">{['s', 'm', 't', 'w', 't', 'f', 's'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ht-panel p-4">
          <span className="ht-label">hottest day</span>
          {busiest ? (
            <>
              <div className="mt-1 text-[19px] font-bold">{new Date(busiest.key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <p className="mt-1.5 text-[12px] text-ink-mute">
                {busiest.reads} reads, {busiest.ignites} ignitions — the day the grid went white-hot.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[12px] text-ink-mute">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, v, hot }: { label: string; v: number; hot?: boolean }) {
  return (
    <span className={cls('ht-chip !normal-case !tracking-normal', hot && v > 0 && '!border-ember-500/45 !text-ember-200')}>
      <b className="ht-num">{v}</b> {label}
    </span>
  );
}

/** Collapsed-card subline: a live "today" summary when there is one to show. */
function cardSubline(flat: Day[], expanded: boolean) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = flat.find((d) => d.key === todayKey);
  const parts: string[] = [];
  if (today) {
    if (today.reads) parts.push(`${today.reads} read${today.reads === 1 ? '' : 's'}`);
    if (today.heats) parts.push(`${today.heats} heat${today.heats === 1 ? '' : 's'}`);
    if (today.ignites) parts.push(`${today.ignites} ignition${today.ignites === 1 ? '' : 's'}`);
    if (today.posts) parts.push(`${today.posts} post${today.posts === 1 ? '' : 's'}`);
  }
  const hint = expanded ? 'tap a day for its narrative' : 'click the grid to expand the full year';
  if (parts.length) return `Today: ${parts.join(' · ')} — ${hint}`;
  return expanded ? 'Tap a day for its narrative' : 'Click the grid to expand the full year';
}

function compactNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
