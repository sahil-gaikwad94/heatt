/* ============================================================================
   lib/gpu — device capability probe (spec §4.2)

   "Upon initialization, a lightweight script profiles the device's GPU
   capabilities. If the hardware is constrained, the application seamlessly
   downgrades the dense WebGL geometry to a lower-polygon variant, or
   gracefully falls back to a highly optimized, CSS-driven gradient
   animation."

   `probeGpu` is the static half of that: a deterministic heuristic over the
   few signals the browser exposes (core count, reported memory, user-agent,
   touch points). The dynamic half — measuring real frame times at runtime
   and stepping quality tiers down — lives in components/gl/HeatField, which
   seeds its governor from the tier returned here.

   Tiers:  0 = full quality (default)
           1 = reduced (lower resolution scale, no pointer bloom)
           2 = minimal (smallest scale; the governor's next step is the
               CSS/WAAPI fallback, which this probe can also recommend
               directly for known-weak hardware)
   ==========================================================================*/

export type GpuEnv = {
  cores?: number;
  /** navigator.deviceMemory (GB) — Chrome-only, undefined elsewhere */
  mem?: number;
  ua?: string;
  touch?: number;
  /** false when WebGL is unavailable — callers then skip GL entirely */
  webgl?: boolean;
};

export type GpuProbe = {
  tier: 0 | 1 | 2;
  reason: string;
  mobile: boolean;
  cores: number;
  mem: number;
};

const MOBILE = /android|webos|iphone|ipad|ipod|blackberry|kindle|silk|opera mini/i;

export function probeGpu(env: GpuEnv = {}): GpuProbe {
  const ua = env.ua ?? '';
  const cores = env.cores && env.cores > 0 ? env.cores : 8;
  const mem = env.mem && env.mem > 0 ? env.mem : 8;
  const mobile = MOBILE.test(ua) || (env.touch !== undefined && env.touch > 1 && MOBILE.test(ua));

  let tier: 0 | 1 | 2 = 0;
  let reason = 'default full quality';

  if (cores <= 2) {
    tier = 2;
    reason = `${cores} logical cores — minimal geometry`;
  } else if (cores <= 4 || mem <= 3) {
    tier = 1;
    reason = `${cores} cores / ${mem} GB — reduced geometry`;
  } else if (mobile && (cores <= 6 || mem <= 4)) {
    tier = 1;
    reason = 'mobile with constrained profile — reduced geometry';
  } else if (mobile) {
    tier = 0;
    reason = 'mobile, modern profile';
  }

  return { tier, reason, mobile, cores, mem };
}

/** Runtime thresholds (ms median frame time) used by the HeatField governor. */
export const GOVERNOR = {
  /** frames measured before the first evaluation (warmup: JIT, shader compile) */
  warmup: 30,
  /** rolling window size for the median frame time */
  window: 90,
  /** step down a quality tier when the median frame time exceeds this */
  stepDownMs: 30,
  /** at the lowest GL tier, exceed this for this long → CSS fallback */
  cssMs: 55,
  /** hysteresis: minimum time between two quality changes */
  cooldownMs: 2500,
  /** how long (ms) of sustained low tier-2 performance before the CSS switch */
  cssSustainMs: 1500,
};

/**
 * Pure governor state machine — given the current tier and a batch of frame
 * deltas (ms), decide whether to hold, step down, or drop to CSS. Exported
 * for unit testing; HeatField feeds it real rAF deltas. Time is tracked as
 * accumulated frame delta, so the function stays wall-clock free.
 */
export type GovernorState = {
  tier: number; // 0..maxTier
  maxTier: number; // highest available GL tier (beyond it: CSS)
  frames: number[];
  sinceChange: number; // ms since last tier change
  cssSustain: number; // ms of sustained bad frames at maxTier
};

export type GovernorAction = 'hold' | 'step-down' | 'css-fallback';

export function governorStep(
  st: GovernorState,
  frameDeltas: number[]
): { action: GovernorAction; state: GovernorState } {
  if (!frameDeltas.length) return { action: 'hold', state: st };
  const dt = frameDeltas.reduce((a, b) => a + b, 0);
  const buffers = [...st.frames, ...frameDeltas];
  if (buffers.length <= GOVERNOR.warmup) {
    return { action: 'hold', state: { ...st, frames: buffers.slice(-GOVERNOR.window), sinceChange: st.sinceChange + dt } };
  }
  const sorted = [...buffers].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const sinceChange = st.sinceChange + dt;

  if (st.tier < st.maxTier) {
    if (median > GOVERNOR.stepDownMs && sinceChange >= GOVERNOR.cooldownMs) {
      return { action: 'step-down', state: { tier: st.tier + 1, maxTier: st.maxTier, frames: [], sinceChange: 0, cssSustain: 0 } };
    }
  } else if (median > GOVERNOR.cssMs) {
    const cssSustain = st.cssSustain + dt;
    if (cssSustain >= GOVERNOR.cssSustainMs) {
      return { action: 'css-fallback', state: st };
    }
    return { action: 'hold', state: { ...st, cssSustain } };
  }
  return { action: 'hold', state: { ...st, frames: buffers.slice(-GOVERNOR.window), sinceChange, cssSustain: st.tier === st.maxTier ? 0 : st.cssSustain } };
}
