/* ============================================================================
   lib/heat-narrative — day-level narrative for the heatmap (spec §5.2)

   "The system dynamically generates narrative summaries of the user's
   achievements for that day, highlighting saved articles, the exact time of
   viral posts, and overall platform contribution, making the data feel
   personal and celebratory."

   Two rules keep it trustworthy:
     • every number in the sentence comes from real stored data — no
       estimates, no "about 60% of them rose above an ember";
     • superlatives (records, top-percentile) only render once the user has
       enough of their own history to compare against.
   ==========================================================================*/

import type { LogEvent, LogEventKind } from './types';

export type DayStats = {
  key: string;
  /** 0..1 normalized heat index */
  v: number;
  reads: number;
  heats: number;
  blazes: number;
  ignites: number;
  posts: number;
  minutes: number;
  isToday: boolean;
};

export type Narrative = {
  text: string;
  /** the day's memorable moments (real timestamps), oldest first */
  timeline: LogEvent[];
};

const MIN_YEAR_DAYS = 7; // superlatives need a baseline, not one busy week

function timeOf(t: number) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dayKeyOf(t: number) {
  return new Date(t).toISOString().slice(0, 10);
}

function titleOf(e: LogEvent) {
  return e.title ? `“${e.title.length > 42 ? e.title.slice(0, 41) + '…' : e.title}”` : 'a post';
}

function eventVerb(e: LogEvent) {
  switch (e.kind) {
    case 'ignite':
      return `went to full ignition`;
    case 'blaze':
      return `caught blaze`;
    case 'read':
      return `finished reading`;
    case 'post':
      return `published`;
    case 'share':
      return `shared`;
    case 'save':
      return `saved`;
    default:
      return `touched`;
  }
}

const KIND_WORD: Record<LogEventKind, string> = {
  ignite: 'ignition',
  blaze: 'blaze',
  read: 'read',
  post: 'publish',
  share: 'share',
  save: 'save',
};

/**
 * Build the narrative for one day. `year` is the user's full grid (for
 * personal records/percentiles), `streak` the current/longest run, and
 * `events` the stored memorable-moment ring.
 */
export function narrativeFor(
  day: DayStats,
  year: DayStats[],
  streak: { current: number; longest: number },
  events: LogEvent[]
): Narrative {
  const dayEvents = events
    .filter((e) => dayKeyOf(e.t) === day.key)
    .sort((a, b) => a.t - b.t)
    .slice(-6);
  const timeline = dayEvents;

  /* ------------------------------------------------------------- base facts */
  const bits: string[] = [];
  if (day.reads > 0) bits.push(`you finished ${day.reads} long-form ${day.reads === 1 ? 'piece' : 'pieces'}`);
  if (day.heats > 0) {
    const blazePart = day.blazes > 0 ? ` — ${day.blazes} of them reached blaze` : '';
    bits.push(`you gave ${day.heats} ${day.heats === 1 ? 'heat' : 'heats'}${blazePart}`);
  }
  if (day.ignites > 0) bits.push(`${day.ignites} ${day.ignites === 1 ? 'of those' : 'of them'} ${day.ignites === 1 ? 'went' : 'went'} to full ignition`);
  if (day.posts > 0) bits.push(`you published ${day.posts} ${day.posts === 1 ? 'time' : 'times'}`);

  if (!bits.length) {
    const todayOpen = day.isToday ? ' — today is still open' : ' — the streak is unbroken around it';
    return {
      text: `A quiet day. The grid stays neutral rather than red — pausing is allowed${todayOpen}.`,
      timeline,
    };
  }

  const sentences: string[] = [];
  const cap = bits[0][0].toUpperCase() + bits[0].slice(1);
  sentences.push(bits.length > 1 ? `${cap}, and ${bits.slice(1).join(', ')}.` : `${cap}.`);

  /* --------------------------------------------- personal context (honest) */
  const active = year.filter((d) => d.v > 0);
  if (day.v > 0 && active.length >= MIN_YEAR_DAYS) {
    const above = active.filter((d) => d.v > day.v && d.key !== day.key).length;
    const fracAbove = above / Math.max(1, active.length - 1);
    if (fracAbove <= 0.1) sentences.push('One of your top-10% days.');

    const maxReads = Math.max(...active.map((d) => d.reads));
    const maxIgnites = Math.max(...active.map((d) => d.ignites));
    if (day.reads >= 2 && day.reads >= maxReads) sentences.push('Your best reading day on record.');
    if (day.ignites >= 2 && day.ignites >= maxIgnites) sentences.push('Most ignitions you have done in a single day.');
  }

  /* ------------------------------------------- the exact-time moments */
  const viral = dayEvents.filter((e) => e.kind === 'ignite' || e.kind === 'post');
  if (viral.length) {
    const e = viral[viral.length - 1];
    const author = e.author ? ` by @${e.author}` : '';
    sentences.push(`${timeOf(e.t)} — ${titleOf(e)} ${eventVerb(e)}${author}.`);
  } else if (dayEvents.length) {
    const e = dayEvents[dayEvents.length - 1];
    sentences.push(`${timeOf(e.t)} — ${titleOf(e)} ${eventVerb(e)}.`);
  }

  /* ------------------------------------------------------------- streak */
  if (day.isToday && streak.current > 1) {
    let s = `Day ${streak.current} of your current streak.`;
    if (streak.longest > streak.current + 2) {
      s += ` ${streak.longest - streak.current - 1} short of your longest run.`;
    }
    sentences.push(s);
  }

  const tail = day.v > 0.75 ? 'Incandescent.' : day.v > 0.4 ? 'Solidly burning.' : 'A warm, low-noise day.';
  sentences.push(`Heat index ${Math.round(day.v * 100)}/100 — ${tail}`);

  return { text: sentences.join(' '), timeline };
}

export function kindWord(kind: LogEventKind) {
  return KIND_WORD[kind];
}
