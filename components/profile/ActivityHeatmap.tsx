'use client';
/* ============================================================================
   components/profile/ActivityHeatmap — GitHub-like activity heat timeline.

   Renders an interactive contribution / heat timeline across months and weeks.
   Clicking any dot reveals a beautifully designed card component with rich
   details: date, heat count, stories ignited, notes published, and streak stats.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cls, compact } from '@/lib/util';
import type { Post } from '@/lib/feed';

export type ActivityDay = {
  date: string; // YYYY-MM-DD
  formattedDate: string;
  dayOfWeek: number; // 0=Sun..6=Sat
  level: 0 | 1 | 2 | 3 | 4;
  heats: number;
  posts: { id: string; title: string; kind: 'forge' | 'spark' }[];
  replies: number;
  streak: number;
};

type HeatmapProps = {
  handle: string;
  posts?: Post[];
  className?: string;
};

// Generates 26 weeks (~6 months) of activity leading up to current date (2026-09-25)
function generateActivityTimeline(handle: string, posts: Post[] = []): { weeks: ActivityDay[][]; totalHeats: number; maxStreak: number; currentStreak: number } {
  const weeks: ActivityDay[][] = [];
  const today = new Date(2026, 8, 25); // Sep 25, 2026
  const totalDays = 26 * 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + (6 - today.getDay()));

  const seed = [...handle].reduce((acc, char) => acc + char.charCodeAt(0), 17);
  let totalHeats = 0;
  let streak = 0;
  let maxStreak = 0;

  // Map existing posts to dates if matching
  const postDateMap = new Map<string, { id: string; title: string; kind: 'forge' | 'spark' }[]>();
  posts.forEach((p) => {
    const dStr = new Date(p.date).toISOString().slice(0, 10);
    const existing = postDateMap.get(dStr) || [];
    existing.push({ id: p.id, title: p.title || p.dek || 'Note on the wire', kind: p.kind });
    postDateMap.set(dStr, existing);
  });

  let currentWeek: ActivityDay[] = [];

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(startDate);
    cur.setDate(startDate.getDate() + i);
    const dStr = cur.toISOString().slice(0, 10);
    const dayOfWeek = cur.getDay();

    // Pseudo-random deterministic activity keyed by handle and day
    const daySeed = (seed * (i + 13) * 73) % 1000;
    const hasPost = postDateMap.has(dStr);
    const isRecent = i > totalDays - 20;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    let heats = 0;

    if (hasPost) {
      level = 4;
      heats = 16 + (daySeed % 18);
    } else if (daySeed > 780 || (isRecent && daySeed > 550)) {
      level = 3;
      heats = 9 + (daySeed % 7);
    } else if (daySeed > 540) {
      level = 2;
      heats = 4 + (daySeed % 5);
    } else if (daySeed > 340) {
      level = 1;
      heats = 1 + (daySeed % 3);
    } else {
      level = 0;
      heats = 0;
    }

    if (heats > 0) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }

    totalHeats += heats;

    const formattedDate = cur.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const dayObj: ActivityDay = {
      date: dStr,
      formattedDate,
      dayOfWeek,
      level,
      heats,
      posts: postDateMap.get(dStr) || [],
      replies: heats > 0 ? (daySeed % 4) : 0,
      streak,
    };

    currentWeek.push(dayObj);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return { weeks, totalHeats, maxStreak, currentStreak: streak };
}

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

export function ActivityHeatmap({ handle, posts = [], className }: HeatmapProps) {
  const { weeks, totalHeats, maxStreak, currentStreak } = React.useMemo(
    () => generateActivityTimeline(handle, posts),
    [handle, posts]
  );

  const [selectedDay, setSelectedDay] = React.useState<ActivityDay | null>(null);

  return (
    <div className={cls('ht-panel overflow-hidden p-5 sm:p-6', className)}>
      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <span className="ht-eyebrow ht-eyebrow--plain text-[10px] tracking-wider">activity timeline</span>
          <h2 className="ht-title mt-1 text-[16px] text-ink">
            Heat Activity
            <span className="ml-2.5 inline-flex items-center gap-1 rounded-full border border-[var(--acc-line)] bg-[var(--acc-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--acc)]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--acc)]" />
              {compact(totalHeats)} heats this season
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-4 text-[12px] text-ink-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]">🔥</span>
            <span>Streak: <strong className="text-ink">{currentStreak}d</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Best: <strong className="text-ink-2">{maxStreak}d</strong></span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- matrix grid */}
      <div className="ht-no-scrollbar mt-4 overflow-x-auto pb-2">
        <div className="min-w-[620px]">
          {/* Months labels */}
          <div className="mb-2 flex justify-between pl-6 text-[11px] font-medium text-ink-4">
            {MONTHS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>

          <div className="flex items-start gap-2">
            {/* Weekdays legend */}
            <div className="flex flex-col justify-between py-1 text-[9.5px] font-medium text-ink-4" style={{ height: '108px' }}>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Weeks columns */}
            <div className="grid flex-1 grid-flow-col gap-1.5" style={{ gridTemplateRows: 'repeat(7, 12px)' }}>
              {weeks.flatMap((week, wIdx) =>
                week.map((day, dIdx) => {
                  const isSelected = selectedDay?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`${day.formattedDate}: ${day.heats} heats`}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={cls(
                        'relative h-3 w-3 rounded-[3px] transition-all duration-150',
                        day.level === 0 && 'bg-white/[0.04] hover:bg-white/[0.12]',
                        day.level === 1 && 'bg-violet-500/35 hover:bg-violet-500/60 shadow-[0_0_4px_rgba(139,92,246,0.25)]',
                        day.level === 2 && 'bg-ember-500/60 hover:bg-ember-500/80 shadow-[0_0_6px_rgba(255,51,102,0.35)]',
                        day.level === 3 && 'bg-ember-500 hover:scale-125 shadow-[0_0_8px_rgba(255,51,102,0.6)]',
                        day.level === 4 && 'bg-[linear-gradient(135deg,#fff,#ffb800,#ff3366)] hover:scale-125 shadow-[0_0_10px_rgba(255,184,0,0.8)]',
                        isSelected && 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-black z-10'
                      )}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Legend */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-ink-4">
            <span className="text-ink-faint">Click any dot to inspect details</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <span className="h-2.5 w-2.5 rounded-[2px] bg-white/[0.04]" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-violet-500/40" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-ember-500/60" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-ember-500" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[linear-gradient(135deg,#fff,#ffb800,#ff3366)]" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------- clicked detail card */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay.date}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 rounded-[var(--r-lg)] border border-[var(--acc-line)] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="ht-eyebrow ht-eyebrow--plain text-[10px] text-ink-faint">
                  {selectedDay.formattedDate}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <h4 className="ht-title text-[17px] text-ink">
                    {selectedDay.heats === 0 ? 'Quiet Day in the Room' : `${selectedDay.heats} Heats Generated`}
                  </h4>
                  {selectedDay.level >= 3 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#ff3366,#ffb800)] px-2 py-0.5 text-[10.5px] font-bold text-white shadow-sm">
                      🔥 Ignition Day
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="ht-icon-btn !h-7 !w-7"
                aria-label="Close details"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-[var(--r-md)] border border-line bg-black/30 p-2.5">
                <span className="text-[10.5px] uppercase tracking-wider text-ink-4">Total Energy</span>
                <p className="mt-1 text-[16px] font-semibold text-ink">
                  {selectedDay.heats} <span className="text-[12px] font-normal text-ink-mute">heats</span>
                </p>
              </div>

              <div className="rounded-[var(--r-md)] border border-line bg-black/30 p-2.5">
                <span className="text-[10.5px] uppercase tracking-wider text-ink-4">Works Published</span>
                <p className="mt-1 text-[16px] font-semibold text-ink">
                  {selectedDay.posts.length}{' '}
                  <span className="text-[12px] font-normal text-ink-mute">
                    {selectedDay.posts.length === 1 ? 'piece' : 'pieces'}
                  </span>
                </p>
              </div>

              <div className="rounded-[var(--r-md)] border border-line bg-black/30 p-2.5">
                <span className="text-[10.5px] uppercase tracking-wider text-ink-4">Replies & Wire</span>
                <p className="mt-1 text-[16px] font-semibold text-ink">
                  {selectedDay.replies}{' '}
                  <span className="text-[12px] font-normal text-ink-mute">contributions</span>
                </p>
              </div>
            </div>

            {selectedDay.posts.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-line/50 pt-2.5">
                <span className="text-[11px] font-semibold text-ink-3">Articles & Notes from this date:</span>
                {selectedDay.posts.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase font-mono text-ink-2">
                      {p.kind}
                    </span>
                    <span className="truncate">{p.title}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
