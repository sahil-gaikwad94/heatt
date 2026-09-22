'use client';
/* ============================================================================
   components/gl/HeatField — GPU thermal field (spec §4.1 + §4.2)

   A single full-bleed quad, an FBM turbulence shader, and nothing else: no
   three.js, no textures, ~4KB of GLSL. Displacement and colour are computed
   per fragment on the GPU, so the shell stays at 60-120Hz on a phone while
   the CPU does feed work.

   §4.2 adaptive degradation, fully wired:
     • startup: `probeGpu()` reads the device profile (cores, memory, UA,
       touch) and seeds the quality tier — constrained hardware never starts
       at full resolution;
     • runtime: a frame-time governor (median of a rolling rAF window,
       hysteresis-cooled) steps the tier down when the GPU can't keep up —
       lower DPR cap + smaller render scale — and if even the minimal tier
       sags, it swaps the canvas for a Web-Animations-API-driven CSS gradient
       (hardware-accelerated, ~0 JS per frame);
     • `webglcontextlost` / `restored` are handled: loss → CSS fallback
       immediately, restore → shaders recompile and GL resumes;
     • cursor *and* gyroscope both drive the focal distortion (spec §4.1:
       "uniform variables bound to the user's cursor position or device
       gyroscope").

   Props let every surface tune it: the intro pushes `surge`, the app shell
   keeps `intensity` low so text stays readable, and pointer heat adds a
   local bloom that follows the cursor like a real ember.
   ==========================================================================*/

import * as React from 'react';
import { governorStep, probeGpu, type GovernorState } from '@/lib/gpu';

export type HeatFieldProps = {
  /** 0..1 global burn */
  intensity?: number;
  /** 0..1 upward turbulence */
  surge?: number;
  /** auto-scroll speed multiplier */
  flow?: number;
  /** colour bias: 0 = magma/orange, 1 = cryo teal-indigo */
  cool?: number;
  /** add pointer-reactive bloom (cursor + gyroscope) */
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** pause the rAF loop (e.g. when a modal is open or tab hidden) */
  paused?: boolean;
  /** base quality: 1 = full DPR, 0.6 = cheaper on low-end */
  scale?: number;
  /** vignette strength */
  vignette?: number;
  /** quality tier changed (0..2 = GL tiers, 3 = CSS fallback) */
  onTier?: (tier: number, reason: string) => void;
};

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_t;
uniform float u_intensity;
uniform float u_surge;
uniform float u_cool;
uniform vec2  u_mouse;
uniform float u_mouseOn;
uniform float u_vig;

// --- value noise, 3 octaves of fbm: cheap, stable, no textures -----------
float hash21(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// tiny clamp helper for the cryo branch (keeps bright teal from blowing out)
vec3 col_min(vec3 c){ return c * 0.62; }
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.03;
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 q = (uv - 0.5) * asp;

  float t = u_t;

  // domain-warped fbm — the classic "flowing heat" look
  vec2 w = vec2(fbm(q * 1.7 + vec2(0.0, t * 0.06)),
                fbm(q * 1.9 + vec2(t * 0.05, 0.0)));
  float n = fbm(q * 2.15 + w * 1.35 + vec2(0.0, -t * 0.075 - u_surge * t * 0.06));

  // heat rises: stronger at the bottom, dissipating upward
  float rise = pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.55 + u_surge * 0.6);
  float field = n * 0.62 + rise * 0.55 + w.y * 0.22;

  field = smoothstep(0.18, 1.02, field * (0.55 + u_intensity * 1.05));

  // molten ramp: deep crimson → ember → flame → incandescent
  vec3 cold = vec3(0.055, 0.012, 0.008);
  vec3 magma = vec3(0.86, 0.13, 0.05);
  vec3 ember = vec3(1.0, 0.36, 0.04);
  vec3 flare = vec3(1.0, 0.72, 0.22);
  vec3 white = vec3(1.0, 0.96, 0.86);

  vec3 heat = mix(cold, magma, smoothstep(0.02, 0.42, field));
  heat = mix(heat, ember, smoothstep(0.36, 0.72, field));
  heat = mix(heat, flare, smoothstep(0.66, 0.92, field));
  heat = mix(heat, white, smoothstep(0.92, 1.0, field) * 0.85);

  // cryo counterweight (indigo/teal) blended in for cool surfaces
  vec3 cryo = mix(vec3(0.16, 0.10, 0.62), vec3(0.14, 0.86, 0.78),
                  smoothstep(0.30, 0.95, field + w.x * 0.3));
  vec3 col = mix(heat, col_min(cryo), u_cool);

  // pointer/gyro ember — a soft bloom that trails the input
  if (u_mouseOn > 0.0) {
    vec2 m = (u_mouse - 0.5) * asp;
    float d = length(q - m);
    float glow = exp(-d * (5.5 - u_surge * 1.5));
    col += mix(vec3(1.0, 0.55, 0.16), vec3(0.35, 0.9, 0.95), u_cool) * glow * 0.55;
  }

  // fine grain + horizontal sweep so it never looks like a static gradient
  float g = hash21(gl_FragCoord.xy + fract(t) * 137.0);
  col *= 0.9 + 0.1 * g;

  // vignette keeps the centre dark for readable text
  float v = 1.0 - u_vig * length(q * vec2(0.78, 1.0));
  col *= clamp(v, 0.0, 1.2);

  // never pure black — preserves shadow definition (spec §3.1)
  col = max(col, vec3(0.021, 0.021, 0.027));

  gl_FragColor = vec4(col, 1.0);
}

`;

/* -------------------------------------------------------- quality tiers */

/** per-tier multipliers against the base `scale` prop, plus DPR caps. */
const TIER_FACTOR = [1, 0.72, 0.5];
const TIER_DPR_CAP = [2, 1.5, 1];
/** pointer bloom only at full quality — it is the most expensive uniform. */
const TIER_BLOOM = [true, false, false];

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn('[heatt] shader error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * The CSS/WAAPI fallback (spec §4.2): two drifting thermal gradients,
 * animated through the Web Animations API so the compositor owns the motion
 * and per-frame JS cost is ~0. Falls back to a static gradient where WAAPI
 * is unavailable (or the user prefers reduced motion).
 */
function startCssFallback(layer: HTMLDivElement, animated: boolean) {
  layer.innerHTML = '<div class="ht-cssheat ht-cssheat-a"></div><div class="ht-cssheat ht-cssheat-b"></div>';
  if (!animated) return;
  const a = layer.querySelector('.ht-cssheat-a');
  const b = layer.querySelector('.ht-cssheat-b');
  if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;
  try {
    a.animate(
      [
        { backgroundPosition: '50% 100%', opacity: 0.85 },
        { backgroundPosition: '50% 30%', opacity: 1 },
      ],
      { duration: 16000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
    );
    b.animate(
      [
        { backgroundPosition: '0% 0%', opacity: 0.5 },
        { backgroundPosition: '30% 40%', opacity: 0.9 },
      ],
      { duration: 23000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
    );
  } catch {
    /* WAAPI unavailable — the static gradients still render */
  }
}

export function HeatField({
  intensity = 0.45,
  surge = 0,
  flow = 1,
  cool = 0,
  interactive = true,
  className,
  style,
  paused = false,
  scale = 0.75,
  vignette = 0.55,
  onTier,
}: HeatFieldProps) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const cssRef = React.useRef<HTMLDivElement | null>(null);
  const [cssMode, setCssMode] = React.useState(false);
  const [tier, setTier] = React.useState(0);
  /* cssMode readable from the rAF loop without re-binding the effect */
  const cssModeRef = React.useRef(cssMode);
  cssModeRef.current = cssMode;
  const state = React.useRef({
    gl: null as WebGLRenderingContext | null,
    prog: null as WebGLProgram | null,
    vs: null as WebGLShader | null,
    fs: null as WebGLShader | null,
    raf: 0,
    t: 0,
    last: 0,
    mouse: [0.5, 0.5],
    target: [0.5, 0.5],
    mouseOn: 0,
    uniforms: {} as Record<string, WebGLUniformLocation | null>,
    reduced: false,
    hidden: false,
    dpr: 1,
    tierIdx: 0,
    gov: null as GovernorState | null,
    pending: [] as number[],
    probeReason: '',
  });

  // keep live prop values reachable from the render loop without re-binding GL
  const props = React.useRef({ intensity, surge, flow, cool, vignette, paused, scale });
  props.current = { intensity, surge, flow, cool, vignette, paused, scale };
  const onTierRef = React.useRef(onTier);
  onTierRef.current = onTier;

  const announceTier = React.useCallback((t: number, reason: string) => {
    setTier(t);
    onTierRef.current?.(t, reason);
  }, []);

  /** rebuild the program after a context restore */
  const linkShaders = React.useCallback((gl: WebGLRenderingContext): boolean => {
    const s = state.current;
    s.vs = compile(gl, gl.VERTEX_SHADER, VERT);
    s.fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!s.vs || !s.fs) return false;
    const prog = gl.createProgram();
    if (!prog) return false;
    gl.attachShader(prog, s.vs);
    gl.attachShader(prog, s.fs);
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return false;
    }
    gl.useProgram(prog);
    s.prog = prog;
    for (const u of ['u_res', 'u_t', 'u_intensity', 'u_surge', 'u_cool', 'u_mouse', 'u_mouseOn', 'u_vig']) {
      s.uniforms[u] = gl.getUniformLocation(prog, u);
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return true;
  }, []);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const s = state.current;
    s.reduced =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.dataset.reduceMotion === 'true');

    /* §4.2 — profile the device before drawing a single frame */
    const probe = probeGpu({
      cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
      mem: (navigator as { deviceMemory?: number } | undefined)?.deviceMemory,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      touch: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : undefined,
    });
    s.tierIdx = Math.min(2, probe.tier);
    s.gov = { tier: s.tierIdx, maxTier: 2, frames: [], sinceChange: 0, cssSustain: 0 };
    s.probeReason = probe.reason;
    s.pending = [];
    announceTier(s.tierIdx, probe.reason);
    try {
      (window as unknown as { __heattGpu?: unknown }).__heattGpu = probe;
    } catch {
      /* non-browser */
    }

    let gl: WebGLRenderingContext | null = null;
    const opts: WebGLContextAttributes = { antialias: false, alpha: false, powerPreference: 'low-power', depth: false, stencil: false };
    try {
      gl = (canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) {
      // no WebGL at all → animated CSS atmosphere (static under reduced motion)
      setCssMode(true);
      announceTier(3, 'no WebGL context — CSS gradient fallback');
      return;
    }
    s.gl = gl;

    if (!linkShaders(gl)) {
      setCssMode(true);
      announceTier(3, 'shader compile failed — CSS gradient fallback');
      return;
    }

    const resize = () => {
      const dprCap = TIER_DPR_CAP[s.tierIdx] ?? 1;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * Math.max(0.3, props.current.scale * TIER_FACTOR[s.tierIdx]);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      s.dpr = dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl!.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* §4.1 — cursor AND gyroscope drive the focal distortion. The cursor
       wins while it moves (mouseOn 1); gyro is a softer ambient input. On
       iOS the deviceorientation event never fires without the user granting
       permission, so this is a passive no-op there — zero cost. */
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      s.target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      s.mouseOn = 1;
    };
    const onLeave = () => {
      if (s.mouseOn === 1) s.mouseOn = 0;
    };
    const onGyro = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      s.target = [Math.min(1, Math.max(0, 0.5 + e.gamma / 90)), Math.min(1, Math.max(0, 0.72 - e.beta / 120))];
      s.mouseOn = Math.max(s.mouseOn, 0.55);
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerleave', onLeave);
      if ('DeviceOrientationEvent' in window) window.addEventListener('deviceorientation', onGyro as EventListener, { passive: true });
    }

    const onVis = () => {
      s.hidden = document.hidden;
    };
    document.addEventListener('visibilitychange', onVis);

    /* §4.2 — context loss is a real thing on mobile GPUs (driver resets,
       memory pressure). We pre-empt the blank canvas by switching to CSS
       immediately and resuming when the context comes back. */
    const onLost = (e: Event) => {
      e.preventDefault();
      setCssMode(true);
      announceTier(3, 'WebGL context lost — CSS gradient fallback');
    };
    const onRestored = () => {
      if (!s.gl) return;
      if (linkShaders(s.gl)) {
        resize();
        setCssMode(false);
        s.gov = { tier: s.tierIdx, maxTier: 2, frames: [], sinceChange: 0, cssSustain: 0 };
        announceTier(s.tierIdx, 'WebGL context restored');
      }
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const draw = (now: number) => {
      s.raf = requestAnimationFrame(draw);
      if (props.current.paused || s.hidden || cssModeRef.current) {
        s.last = now;
        return;
      }
      const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
      s.last = now;
      if (!s.reduced) s.t += dt * props.current.flow;

      // §4.2 — governor: batch frame deltas, evaluate the pure state machine
      if (!s.reduced) {
        s.pending.push(dt * 1000);
        if (s.pending.length >= 12) {
          const g = s.gov;
          if (g) {
            const { action, state: g2 } = governorStep(g, s.pending);
            s.pending = [];
            if (action === 'step-down') {
              s.tierIdx = g2.tier;
              s.gov = g2;
              resize();
              announceTier(g2.tier, `frame time sagging — stepped to tier ${g2.tier}`);
              return;
            }
            if (action === 'css-fallback') {
              s.gov = g2;
              setCssMode(true);
              announceTier(3, 'sustained frame lag at minimal tier — CSS gradient fallback');
              return;
            }
            s.gov = g2;
          }
        }
      }

      // ease pointer/gyro heat so it trails rather than sticks
      s.mouse[0] += (s.target[0] - s.mouse[0]) * Math.min(1, dt * 6);
      s.mouse[1] += (s.target[1] - s.mouse[1]) * Math.min(1, dt * 6);

      const u = s.uniforms;
      gl!.uniform2f(u.u_res, canvas.width, canvas.height);
      gl!.uniform1f(u.u_t, s.t);
      gl!.uniform1f(u.u_intensity, props.current.intensity);
      gl!.uniform1f(u.u_surge, props.current.surge);
      gl!.uniform1f(u.u_cool, props.current.cool);
      gl!.uniform1f(u.u_vig, props.current.vignette);
      gl!.uniform2f(u.u_mouse, s.mouse[0], s.mouse[1]);
      gl!.uniform1f(u.u_mouseOn, TIER_BLOOM[s.tierIdx] ? s.mouseOn : 0);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    };
    s.raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (interactive) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerleave', onLeave);
        if ('DeviceOrientationEvent' in window) window.removeEventListener('deviceorientation', onGyro as EventListener);
      }
      gl?.deleteProgram(s.prog);
      gl?.deleteShader(s.vs);
      gl?.deleteShader(s.fs);
      s.prog = null;
      s.vs = null;
      s.fs = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, scale]);

  /* start/stop the WAAPI animation whenever the fallback mounts */
  React.useEffect(() => {
    const layer = cssRef.current;
    if (!cssMode || !layer) return;
    startCssFallback(layer, !(state.current.reduced || document.documentElement.dataset.reduceMotion === 'true'));
  }, [cssMode]);

  return (
    <React.Fragment>
      <canvas
        ref={ref}
        aria-hidden
        data-gpu-tier={tier}
        className={className}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', visibility: cssMode ? 'hidden' : undefined, ...style }}
      />
      {cssMode && <div ref={cssRef} aria-hidden data-gpu-tier={3} className="ht-cssheat-layer" style={{ position: 'absolute', inset: 0, ...style }} />}
    </React.Fragment>
  );
}

/**
 * Spark burst: a tiny 2D-canvas ember emitter used by ignition, the composer
 * and the intro. Kept separate from HeatField so it can overlay a card.
 */
export function useSparkField(count = 40) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const api = React.useRef<{ burst: (x: number, y: number, power?: number) => void } | null>(null);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hue: number };
    let parts: P[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.max(1, w * dpr);
      c.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.life += 1;
        p.vy += 0.012; // buoyancy: embers accelerate up
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        const t = 1 - p.life / p.max;
        if (t <= 0) continue;
        const r = p.r * t;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0.5, r * 3));
        g.addColorStop(0, `hsla(${p.hue + 22}, 100%, ${64 + t * 30}%, ${0.9 * t})`);
        g.addColorStop(0.4, `hsla(${p.hue}, 100%, 52%, ${0.42 * t})`);
        g.addColorStop(1, 'hsla(18, 100%, 45%, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, r * 3), 0, Math.PI * 2);
        ctx.fill();
      }
      parts = parts.filter((p) => p.life / p.max < 1);
      if (!parts.length) ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);

    api.current = {
      burst(x, y, power = 1) {
        const n = Math.round(count * power);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 0.4 + Math.random() * 2.6 * power;
          parts.push({
            x,
            y,
            vx: Math.cos(a) * sp * 0.8,
            vy: Math.sin(a) * sp * 0.5 - (0.7 + Math.random() * 1.9) * power,
            life: 0,
            max: 28 + Math.random() * 46,
            r: 0.6 + Math.random() * 1.7,
            hue: 14 + Math.random() * 30,
          });
        }
      },
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return { canvasRef, api };
}
