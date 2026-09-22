'use client';
/* ============================================================================
   components/gl/HeatField — GPU thermal field (spec §4.1)

   A single full-bleed quad, an FBM turbulence shader, and nothing else: no
   three.js, no textures, ~4KB of GLSL. Displacement and colour are computed
   per fragment on the GPU, so the shell stays at 60-120Hz on a phone while
   the CPU does feed work.

   Props let every surface tune it: the intro pushes `surge`, the app shell
   keeps `intensity` low so text stays readable, and pointer heat adds a local
   bloom that follows the cursor like a real ember.
   ==========================================================================*/

import * as React from 'react';

export type HeatFieldProps = {
  /** 0..1 global burn */
  intensity?: number;
  /** 0..1 upward turbulence */
  surge?: number;
  /** auto-scroll speed multiplier */
  flow?: number;
  /** colour bias: 0 = magma/orange, 1 = cryo teal-indigo */
  cool?: number;
  /** add pointer-reactive bloom */
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** pause the rAF loop (e.g. when a modal is open or tab hidden) */
  paused?: boolean;
  /** quality: 1 = full DPR, 0.6 = cheaper on low-end */
  scale?: number;
  /** vignette strength */
  vignette?: number;
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

  // pointer ember — a soft bloom that trails the cursor
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
}: HeatFieldProps) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const state = React.useRef({
    gl: null as WebGLRenderingContext | null,
    prog: null as WebGLProgram | null,
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
  });

  // keep live prop values reachable from the render loop without re-binding GL
  const props = React.useRef({ intensity, surge, flow, cool, vignette });
  props.current = { intensity, surge, flow, cool, vignette };

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const s = state.current;
    s.reduced =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.dataset.reduceMotion === 'true');

    let gl: WebGLRenderingContext | null = null;
    const opts: WebGLContextAttributes = { antialias: false, alpha: false, powerPreference: 'low-power', depth: false, stencil: false };
    try {
      gl = (canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) {
      // graceful: keep the CSS gradient atmosphere underneath
      canvas.style.background =
        'radial-gradient(120% 80% at 50% 110%, rgba(255,92,10,.22), transparent 60%), linear-gradient(180deg,#0a0a0b,#060607)';
      return;
    }
    s.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    s.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (const u of ['u_res', 'u_t', 'u_intensity', 'u_surge', 'u_cool', 'u_mouse', 'u_mouseOn', 'u_vig']) {
      s.uniforms[u] = gl.getUniformLocation(prog, u);
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
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

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      s.target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      s.mouseOn = 1;
    };
    const onLeave = () => {
      s.mouseOn = 0;
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerleave', onLeave);
    }

    const onVis = () => {
      s.hidden = document.hidden;
    };
    document.addEventListener('visibilitychange', onVis);

    const draw = (now: number) => {
      s.raf = requestAnimationFrame(draw);
      if (paused || s.hidden) {
        s.last = now;
        return;
      }
      const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
      s.last = now;
      if (!s.reduced) s.t += dt * props.current.flow;

      // ease pointer heat so it trails rather than sticks
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
      gl!.uniform1f(u.u_mouseOn, s.mouseOn);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    };
    s.raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (interactive) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerleave', onLeave);
      }
      gl?.deleteProgram(prog);
      gl?.deleteShader(vs);
      gl?.deleteShader(fs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, scale]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...style }}
    />
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
