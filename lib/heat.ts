/* ============================================================================
   heatt — the heat model.

   Deliberately small and legible. A piece of writing has *volume* (how many
   people responded) and *lift* (how much you personally said it mattered) and
   both fade with age. Heat is that sum, squashed into 0-100 so it can be read
   as a single number and never as a physics claim.

       energy(t) = Σ counters · e^(−Δt/τ)  +  Σ your heat · e^(−Δt/τᵐ)
       heat      = 100 · (1 − e^(−energy / 260))
       score     = log1p(energy) · (1 + yourLift)      ← what the feed sorts by

   No graph, no conductance, no temperature. Just recency-weighted attention.
   ==========================================================================*/

import type { HeatLevel } from './types';

export const HEAT = {
  /** crowd counters cool with a 30h half-life-ish constant */
  tau: 30,
  /** your own heat cools slower — you meant it */
  tauMine: 46,
  /** weight of each heat level */
  levelW: [0, 1, 2.6, 6.5] as const,
  /** read to the end, saved, shared */
  readW: 0.9,
  saveW: 1.5,
  shareW: 2.4,
  /** reply / repost weights applied to public counters */
  replyW: 2.2,
  repostW: 2.8,
  /** squash constant for the 0-100 read-out */
  squash: 260,
  floor: 1e-4,
} as const;

const HOUR = 3600_000;

/** exponential fade — 1 at age 0, ~0.37 after one τ */
export function fade(hoursElapsed: number, tau: number = HEAT.tau) {
  return Math.exp(-Math.max(0, hoursElapsed) / tau);
}

export type HeatSignals = {
  reactions?: number;
  comments?: number;
  reposts?: number;
  /** the local reader's own engagement */
  mine?: { level: HeatLevel; at?: number; read?: boolean; saved?: boolean; shared?: number };
  /** ISO date or epoch ms */
  date?: string | number;
  /** deterministic tie-breaker */
  seed?: string;
};

export type HeatResult = {
  /** 0-100, the only number the UI shows */
  heat: number;
  /** sort key for the feed */
  score: number;
  /** decayed public engagement */
  volume: number;
  /** decayed personal lift */
  lift: number;
};

function jitter(seed = '') {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function computeHeat(sig: HeatSignals, now = Date.now()): HeatResult {
  const t0 = sig.date ? new Date(sig.date).getTime() : now - 6 * HOUR;
  const ageH = Math.max(0, (now - t0) / HOUR);

  const raw =
    (sig.reactions ?? 0) * 0.55 +
    (sig.comments ?? 0) * HEAT.replyW +
    (sig.reposts ?? 0) * HEAT.repostW;

  const volume = raw * fade(ageH, HEAT.tau);

  const lvl = sig.mine?.level ?? 0;
  const sinceH = sig.mine?.at ? Math.max(0, (now - sig.mine.at) / HOUR) : 0;
  const personal =
    HEAT.levelW[lvl] * 2.4 +
    (sig.mine?.read ? HEAT.readW : 0) +
    (sig.mine?.saved ? HEAT.saveW : 0) +
    (sig.mine?.shared ?? 0) * HEAT.shareW;
  const lift = personal * fade(sinceH, HEAT.tauMine);

  const energy = Math.max(HEAT.floor, volume + lift + jitter(sig.seed) * 0.4);
  const heat = Math.round(100 * (1 - Math.exp(-energy / HEAT.squash)));
  const score = Math.log1p(energy) * (1 + Math.min(2.2, lift / 6));

  return { heat, score, volume: Math.round(volume * 100) / 100, lift: Math.round(lift * 100) / 100 };
}

export const LEVEL_META: Record<
  number,
  { name: string; hold: number; ring: string; copy: string }
> = {
  0: { name: 'Quiet', hold: 0, ring: 'rgba(255,255,255,.2)', copy: 'No heat yet' },
  1: { name: 'Heated', hold: 0, ring: '#FF3366', copy: 'Heated' },
  2: { name: 'Blazing', hold: 1000, ring: '#FFB800', copy: 'Blazing' },
  3: { name: 'Ignited', hold: 2200, ring: '#FFFFFF', copy: 'Ignited' },
};

/** hold durations in ms to reach level 2 / 3 */
export const HOLD_MS = [0, 0, 1000, 2200];

export function levelLabel(level: HeatLevel) {
  return LEVEL_META[level].name;
}

/**
 * Feed ordering helper: keeps a run of pieces from one author from owning the
 * top of the board, without the cliff-detection machinery it used to need.
 */
export function spreadByAuthor<T extends { authorHandle: string }>(items: T[], window = 3): T[] {
  const out: T[] = [];
  const recent: string[] = [];
  const queue = [...items];
  while (queue.length) {
    const i = queue.findIndex((x) => !recent.includes(x.authorHandle));
    const pick = queue.splice(i === -1 ? 0 : i, 1)[0];
    out.push(pick);
    recent.push(pick.authorHandle);
    if (recent.length > window) recent.shift();
  }
  return out;
}
