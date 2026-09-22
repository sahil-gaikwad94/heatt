'use client';
/* ============================================================================
   components/share/ShareStudio — poster-grade share cards, drawn on canvas.

   Three formats at real export resolution (1080×1920 story, 1080×1080 square,
   1200×675 link card). The background is generated from the post's own
   temperature, so a cold post shares cool and an ignited one shares molten —
   the card is a data visualisation, not a screenshot with a logo on it.

   Export: download PNG, copy to clipboard, native share sheet (Web Share
   Level 2 with a File), or copy the deep link.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Avatar } from '@/components/ui/primitives';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { waveformFor } from '@/lib/feed';
import { kelvin, tempLabel } from '@/lib/heat';
import { avatarDataUri, cls, compact } from '@/lib/util';

type Fmt = 'story' | 'square' | 'card';
const DIMS: Record<Fmt, [number, number]> = { story: [1080, 1920], square: [1080, 1080], card: [1200, 675] };
type Palette = 'ember' | 'cryo' | 'mono' | 'ash';
const PAL: Record<Palette, { a: string; b: string; c: string; text: string; sub: string }> = {
  ember: { a: '#FF2D12', b: '#FF8A1F', c: '#FFD27D', text: '#FFF6DE', sub: 'rgba(255,246,222,.72)' },
  cryo: { a: '#5B4BFF', b: '#2BE0C8', c: '#D9FFFB', text: '#F2FFFF', sub: 'rgba(230,255,252,.7)' },
  mono: { a: '#3A3A40', b: '#9A9794', c: '#EFEDEA', text: '#FFFFFF', sub: 'rgba(255,255,255,.62)' },
  ash: { a: '#7C1B09', b: '#FF5C0A', c: '#FFB531', text: '#F7E9DC', sub: 'rgba(247,233,220,.66)' },
};

export function ShareStudio() {
  const app = useApp();
  const s = useStore();
  const id = app.shareId;
  const open = !!id;
  const isYear = id === 'year';
  const isProfile = !!id && id.startsWith('profile:');
  const profHandle = isProfile ? id.slice('profile:'.length) : null;
  const post = id && !isYear && !isProfile ? app.posts.find((p) => p.id === id) : null;
  const [fmt, setFmt] = React.useState<Fmt>('story');
  const [pal, setPal] = React.useState<Palette>('ember');
  const [showCover, setShowCover] = React.useState(true);
  const [showWave, setShowWave] = React.useState(true);
  const [autoPal, setAutoPal] = React.useState(true);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  // Temperature drives the whole poster: colours, chip, gradient weight.
  const act = s.activity;
  const yearHeats = Object.values(act).reduce((a, d) => a + d.heats, 0);
  const yearIgnites = Object.values(act).reduce((a, d) => a + d.ignites, 0);
  const temp = isProfile
    ? Math.min(96, 26 + yearHeats * 0.5 + yearIgnites * 2 + app.streak.current * 4)
    : isYear
      ? Math.min(96, 30 + yearHeats * 0.35 + app.streak.current * 3)
      : post?.heat?.temp ?? 42;
  const label = tempLabel(temp);
  const effectivePal: Palette = autoPal ? (temp > 34 ? 'ember' : temp > 14 ? 'ash' : 'cryo') : pal;

  React.useEffect(() => {
    if (!open) return;
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fmt, effectivePal, showCover, showWave, id]);

  async function draw() {
    const [W, H] = DIMS[fmt];
    const c = canvasRef.current;
    if (!c || !id) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const p = PAL[effectivePal];

    // wait for variable fonts so the poster uses the real type, not a fallback
    try {
      await Promise.all([
        document.fonts.load('700 96px "Bricolage Grotesque Variable"'),
        document.fonts.load('400 40px "Newsreader Variable"'),
        document.fonts.load('800 26px "Inter Variable"'),
        document.fonts.ready,
      ]);
    } catch {/* fonts may be mid-load; carry on */}

    /* ---------------------------------------------------------- background */
    ctx.fillStyle = '#08080A';
    ctx.fillRect(0, 0, W, H);

    // molten field: layered radial gradients seeded by the post id
    const seedNum = [...(id ?? '')].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const blobs = 5;
    for (let i = 0; i < blobs; i++) {
      const t = (seedNum * (i + 3)) % 100;
      const x = W * (0.08 + ((t * 7.3) % 84) / 100);
      const y = fmt === 'card' ? H * (0.2 + ((t * 3.1) % 60) / 100) : H * (0.62 + ((t * 2.7) % 40) / 100);
      const r = (fmt === 'card' ? 0.5 : 0.72) * Math.min(W, H) * (0.42 + ((t * 1.7) % 46) / 100);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = i % 3 === 0 ? p.a : i % 3 === 1 ? p.b : p.c;
      g.addColorStop(0, hexA(col, 0.55));
      g.addColorStop(0.45, hexA(col, 0.16));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // heat haze at the base + top scrim for legibility
    const base = ctx.createLinearGradient(0, H * 0.55, 0, H);
    base.addColorStop(0, 'rgba(8,8,10,0)');
    base.addColorStop(1, hexA(p.a, 0.42));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    scrim.addColorStop(0, 'rgba(6,6,8,.86)');
    scrim.addColorStop(1, 'rgba(6,6,8,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H * 0.6);

    // embers
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const x = ((seedNum * (i + 11) * 37) % W) as number;
      const y = ((seedNum * (i + 5) * 71) % H) as number;
      const r = 1 + ((i * 7) % 5) * 0.9;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
      g.addColorStop(0, hexA(p.c, 0.9));
      g.addColorStop(1, hexA(p.b, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // fine grain
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }

    /* ------------------------------------------------------------- content */
    const pad = fmt === 'card' ? 56 : 72;
    const innerW = W - pad * 2;
    let y = pad;

    // lockup
    drawLockup(ctx, pad, y + 10, p, fmt === 'card' ? 26 : 34);
    y += fmt === 'card' ? 62 : 88;

    // temperature chip
    const chipTxt = `${kelvin(temp)}  ·  ${label.label.toUpperCase()}`;
    ctx.font = `800 ${fmt === 'card' ? 20 : 26}px "Inter Variable", sans-serif`;
    const cw = ctx.measureText(chipTxt).width + 44;
    roundRect(ctx, pad, y, cw, fmt === 'card' ? 40 : 54, 999);
    ctx.fillStyle = hexA(p.b, 0.2);
    ctx.fill();
    ctx.strokeStyle = hexA(p.c, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(chipTxt, pad + 24, y + (fmt === 'card' ? 21 : 28));
    y += (fmt === 'card' ? 40 : 54) + 30;

    const data = payload();

    // cover image
    if (showCover && data.cover && fmt !== 'card') {
      try {
        const img = await loadImg(data.cover);
        const ch = fmt === 'story' ? H * 0.26 : H * 0.3;
        ctx.save();
        roundRect(ctx, pad, y, innerW, ch, 28);
        ctx.clip();
        drawCover(ctx, img, pad, y, innerW, ch);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.lineWidth = 2;
        roundRect(ctx, pad, y, innerW, ch, 28);
        ctx.stroke();
        y += ch + 34;
      } catch {
        /* cross-origin or 404: fall through, the poster still reads */
      }
    }

    // title
    const titleSize = fmt === 'story' ? 74 : fmt === 'square' ? 62 : 44;
    ctx.font = `700 ${titleSize}px "Bricolage Grotesque Variable", "Inter Variable", sans-serif`;
    ctx.fillStyle = p.text;
    ctx.textBaseline = 'alphabetic';
    const lines = wrap(ctx, data.title, innerW, fmt === 'card' ? 5 : fmt === 'story' ? 6 : 4);
    lines.forEach((ln, i) => ctx.fillText(ln, pad, y + titleSize * 1.04 * i + titleSize * 0.82));
    y += lines.length * titleSize * 1.04 + 18;

    // dek / excerpt
    const dekSize = fmt === 'card' ? 22 : 27;
    ctx.font = `400 ${dekSize}px "Newsreader Variable", Georgia, serif`;
    ctx.fillStyle = p.sub;
    const dekLines = wrap(ctx, data.dek, innerW, fmt === 'story' ? 4 : 3);
    dekLines.forEach((ln, i) => ctx.fillText(ln, pad, y + dekSize * 1.42 * i + dekSize));
    y += dekLines.length * dekSize * 1.42 + 26;

    // crowd waveform
    if (showWave && data.wave.length > 1) {
      const bh = fmt === 'card' ? 42 : 64;
      const gap = 6;
      const n = Math.min(data.wave.length, 26);
      const bw = (innerW - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const v = data.wave[i];
        const h = Math.max(6, v * bh);
        const x = pad + i * (bw + gap);
        const yy = y + (bh - h);
        const g = ctx.createLinearGradient(0, yy, 0, yy + h);
        g.addColorStop(0, p.c);
        g.addColorStop(1, hexA(p.a, 0.35));
        ctx.fillStyle = g;
        roundRect(ctx, x, yy, bw, h, Math.min(6, bw / 2));
        ctx.fill();
      }
      ctx.font = `800 ${fmt === 'card' ? 13 : 16}px "Inter Variable", sans-serif`;
      ctx.fillStyle = hexA(p.c, 0.7);
      ctx.fillText('CROWD HEAT · WHERE READERS STOPPED AND HELD', pad, y + bh + (fmt === 'card' ? 20 : 26));
      y += bh + (fmt === 'card' ? 34 : 46);
    }

    // stat band (profiles and year-in-heat) — three columns of evidence
    if (data.stats?.length) {
      const sw = innerW / data.stats.length;
      const sy = fmt === 'card' ? H - pad - 96 : Math.min(y + 10, H - pad - 190);
      data.stats.forEach((st, i) => {
        const x = pad + i * sw;
        ctx.textAlign = i === 0 ? 'left' : 'center';
        ctx.font = `700 ${fmt === 'card' ? 40 : 56}px "Bricolage Grotesque Variable", sans-serif`;
        ctx.fillStyle = p.text;
        ctx.fillText(st.value, i === 0 ? x : x + sw / 2, sy);
        ctx.font = `800 ${fmt === 'card' ? 12 : 14}px "Inter Variable", sans-serif`;
        ctx.fillStyle = hexA(p.c, 0.78);
        ctx.fillText(st.label.toUpperCase(), i === 0 ? x : x + sw / 2, sy + (fmt === 'card' ? 22 : 30));
      });
      ctx.textAlign = 'left';
      y = sy + (fmt === 'card' ? 44 : 58);
    }

    // quote band for sparks
    if (data.isSpark) {
      ctx.font = `400 italic ${fmt === 'card' ? 24 : 32}px "Newsreader Variable", Georgia, serif`;
      ctx.fillStyle = p.text;
      const ql = wrap(ctx, `“${data.body}”`, innerW - 40, fmt === 'card' ? 3 : 5);
      ctx.strokeStyle = hexA(p.b, 0.8);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad, y + ql.length * (fmt === 'card' ? 30 : 42) + 8);
      ctx.stroke();
      ql.forEach((ln, i) => ctx.fillText(ln, pad + 30, y + 30 + i * (fmt === 'card' ? 30 : 42)));
      y += ql.length * (fmt === 'card' ? 30 : 42) + 34;
    }

    /* ------------------------------------------------------------- footer */
    const fy = fmt === 'card' ? H - pad - 6 : H - pad - 4;
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, fy - (fmt === 'card' ? 22 : 34));
    ctx.lineTo(W - pad, fy - (fmt === 'card' ? 22 : 34));
    ctx.stroke();

    try {
      const av = await loadImg(data.avatar);
      const r = fmt === 'card' ? 26 : 34;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pad + r, fy - r * 0.2, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(av, pad, fy - r * 1.2, r * 2, r * 2);
      ctx.restore();
      ctx.strokeStyle = hexA(p.c, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pad + r, fy - r * 0.2, r, 0, Math.PI * 2);
      ctx.stroke();
    } catch {/* procedural fallback already drawn by loadImg */}

    ctx.font = `700 ${fmt === 'card' ? 20 : 25}px "Inter Variable", sans-serif`;
    ctx.fillStyle = p.text;
    ctx.fillText(data.author, pad + (fmt === 'card' ? 64 : 84), fy - (fmt === 'card' ? 12 : 18));
    ctx.font = `500 ${fmt === 'card' ? 15 : 19}px "Inter Variable", sans-serif`;
    ctx.fillStyle = p.sub;
    ctx.fillText(data.handleLine, pad + (fmt === 'card' ? 64 : 84), fy + (fmt === 'card' ? 8 : 12));

    // CTA
    ctx.textAlign = 'right';
    ctx.font = `800 ${fmt === 'card' ? 17 : 21}px "Inter Variable", sans-serif`;
    ctx.fillStyle = hexA(p.c, 0.95);
    ctx.fillText(data.cta, W - pad, fy - 4);
    ctx.textAlign = 'left';

    setBusy(false);
  }

  function payload() {
    if (isYear) {
      const act = s.activity;
      const days = Object.values(act);
      const reads = days.reduce((a, d) => a + d.reads, 0);
      const heats = days.reduce((a, d) => a + d.heats, 0);
      const ignites = days.reduce((a, d) => a + d.ignites, 0);
      const streak = app.streak;
      return {
        title: `${streak.current} days lit, ${reads} forges finished`,
        dek: `${heats} heats given · ${ignites} ignitions · ${days.length} active days on the heat map.`,
        author: s.me?.name ?? 'You',
        handleLine: `@${s.me?.handle ?? 'you'} · heatt heat map`,
        avatar: s.me?.avatar ?? avatarDataUri(s.me?.name ?? 'you', s.me?.handle ?? 'you'),
        cover: '/art/graphite-lattice.jpg',
        wave: Array.from({ length: 20 }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.7 + (heats % 9))) * 0.8),
        isSpark: false,
        body: '',
        stats: [
          { label: 'active days', value: `${days.length}` },
          { label: 'heats given', value: `${heats}` },
          { label: 'ignitions', value: `${ignites}` },
        ],
        cta: 'heatt.app — where ideas burn',
      };
    }
    if (isProfile) {
      const user = s.me && profHandle === s.me.handle ? s.me : null;
      const name = user?.name ?? profHandle ?? 'someone';
      const st = app.streak;
      return {
        title: `${name} runs hot on heatt`,
        dek: user?.bio ?? 'Reading, heating and forging on heatt.',
        author: name,
        handleLine: `@${profHandle} · heatt thermal passport`,
        avatar: user?.avatar ?? avatarDataUri(name, profHandle ?? 'you'),
        cover: '/art/story-canvas.jpg',
        wave: Object.values(act).slice(-26).map((d) => Math.min(1, 0.14 + d.heats * 0.16 + d.reads * 0.08)),
        isSpark: false,
        body: '',
        stats: [
          { label: 'day streak', value: `${st.current}` },
          { label: 'heats given', value: `${yearHeats}` },
          { label: 'ignitions', value: `${yearIgnites}` },
        ],
        cta: 'heatt.app — where ideas burn',
      };
    }
    const p = post!;
    return {
      title: p.kind === 'forge' ? p.title ?? 'A forge on heatt' : `${p.authorName} on heatt`,
      dek: p.kind === 'forge' ? p.dek ?? '' : (p.text ?? '').slice(0, 240),
      author: p.authorName,
      handleLine: `@${p.authorHandle} · ${p.kind === 'forge' ? `${p.minutes} min read` : 'spark'} · ${compact(p.reactions + (s.heatCounts[p.id] ?? 0))} heats`,
      avatar: p.authorAvatar ?? avatarDataUri(p.authorName, p.authorHandle),
      cover: p.cover,
      wave: waveformFor(p, s as any),
      isSpark: p.kind === 'spark',
      body: (p.text ?? '').slice(0, 260),
      stats: undefined as undefined | { label: string; value: string }[],
      cta: 'Read it in heatt →',
    };
  }

  async function exportPng(): Promise<Blob | null> {
    const c = canvasRef.current;
    if (!c) return null;
    return await new Promise((res) => c.toBlob((b) => res(b), 'image/png', 0.96));
  }

  const download = async () => {
    const blob = await exportPng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatt-${fmt}-${(id ?? 'card').replace(/[^a-z0-9-]/gi, '')}.png`;
    a.click();
    URL.revokeObjectURL(url);
    record('downloaded');
  };

  const copy = async () => {
    const blob = await exportPng();
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      record('copied to clipboard');
    } catch {
      record('clipboard blocked — download instead', true);
    }
  };

  const nativeShare = async () => {
    const blob = await exportPng();
    if (!blob) return;
    const file = new File([blob], 'heatt-share.png', { type: 'image/png' });
    const text = isYear ? 'My heat map on heatt' : `${post?.title ?? post?.text ?? 'a post'} — on heatt`;
    const link = isYear ? 'https://heatt.app' : `https://heatt.app/read/${post?.id}`;
    try {
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'heatt', text, url: link });
        record('shared');
        return;
      }
      if (nav.share) {
        await nav.share({ title: 'heatt', text: `${text}\n${link}` });
        record('shared');
        return;
      }
      record('no share sheet here — use download', true);
    } catch {
      record('share cancelled', true);
    }
  };

  const copyLink = async () => {
    const link = isYear ? location.href : `${location.origin}/read/${post?.id}`;
    try {
      await navigator.clipboard.writeText(link);
      record('link copied');
    } catch {
      record('copy blocked', true);
    }
  };

  function record(what: string, bad?: boolean) {
    setDone(what);
    if (!bad && post) useStore.getState().addShare(post.id);
    app.toast(`Card ${what}`, bad ? 'cool' : 'heat');
    window.setTimeout(() => setDone(null), 2200);
  }

  /* Preview is measured, not guessed: the poster scales to the room available
     so a 1080px-wide export never blows out a 360px phone screen. */
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [stageW, setStageW] = React.useState(0);
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, [open]);
  const scaleTarget = React.useMemo(() => {
    const room = Math.max(180, Math.min(stageW || 420, 640));
    return Math.max(0.14, Math.min(0.62, room / DIMS[fmt][0]));
  }, [stageW, fmt]);

  return (
    <Modal open={open} onClose={() => app.setShare(null)} wide labelledBy="share-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] px-4 py-3">
        <div>
          <span className="ht-label">share studio</span>
          <h2 id="share-title" className="ht-title text-[17px]">
            {isYear ? 'Your year, as a poster' : 'Turn this into a card people repost'}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(DIMS) as Fmt[]).map((f) => (
            <button key={f} onClick={() => setFmt(f)} className={cls('ht-chip !normal-case !tracking-normal', fmt === f && '!border-ember-500/50 !bg-ember-500/12 !text-ember-200')}>
              {f === 'story' ? 'Story 9:16' : f === 'square' ? 'Feed 1:1' : 'Link 16:9'}
            </button>
          ))}
          <button onClick={() => app.setShare(null)} className="ht-btn ht-btn--ghost !px-2.5 !py-1.5">✕</button>
        </div>
      </div>

      <div className="grid max-h-[78vh] overflow-y-auto md:grid-cols-[1.15fr_.85fr]">
        <div ref={stageRef} className="flex items-start justify-center overflow-hidden bg-[repeating-linear-gradient(45deg,#0b0b0e_0_12px,#09090c_12px_24px)] p-5">
          <div style={{ transform: `scale(${scaleTarget})`, transformOrigin: 'top center', height: DIMS[fmt][1] * scaleTarget, width: DIMS[fmt][0] * scaleTarget }}>
            <canvas
              ref={canvasRef}
              className="rounded-[22px]"
              style={{ width: DIMS[fmt][0], height: DIMS[fmt][1], boxShadow: '0 60px 140px -50px rgba(255,92,10,.5), 0 0 0 1px rgba(255,255,255,.08)', transition: 'box-shadow .5s' }}
            />
          </div>
        </div>

        <div className="border-t border-white/[.06] p-4 md:border-l md:border-t-0">
          <span className="ht-label">palette</span>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {(Object.keys(PAL) as Palette[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setAutoPal(false);
                  setPal(k);
                }}
                className={cls('h-11 rounded-[12px] border transition-all', (autoPal ? false : pal === k) && '!border-white/60')}
                style={{ background: `linear-gradient(140deg, ${PAL[k].a}, ${PAL[k].b} 55%, ${PAL[k].c})`, boxShadow: !autoPal && pal === k ? `0 10px 28px -10px ${PAL[k].b}` : undefined }}
                title={k}
              >
                <span className="sr-only">{k}</span>
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-dim">
            <input type="checkbox" checked={autoPal} onChange={(e) => setAutoPal(e.target.checked)} className="accent-[var(--ht-ember)]" />
            Match the palette to the post’s temperature
          </label>

          <div className="mt-4 space-y-1.5">
            <Check label="Include cover image" value={showCover} onChange={setShowCover} />
            <Check label="Include crowd waveform" value={showWave} onChange={setShowWave} />
          </div>

          <div className="mt-4 rounded-[14px] border border-white/[.07] bg-black/25 p-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="ht-label">card data</span>
              <span className="ht-num" style={{ color: label.color }}>
                {kelvin(temp)}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mute">
              Background, ember density and palette are generated from the post’s live heat, so the card ages with the piece.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={download} className="ht-btn ht-btn--heat !py-2.5 !text-[13px]">
              Download PNG
            </button>
            <button onClick={copy} className="ht-btn !py-2.5 !text-[13px]">
              Copy image
            </button>
            <button onClick={nativeShare} className="ht-btn !py-2.5 !text-[13px]">
              Share sheet…
            </button>
            <button onClick={copyLink} className="ht-btn !py-2.5 !text-[13px]">
              Copy link
            </button>
          </div>

          <AnimatePresence>
            {done && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2.5 text-center text-[12px] text-ember-300">
                {done}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-4 flex items-center gap-2.5 rounded-[14px] border border-white/[.06] p-3">
            <Avatar name={isYear ? s.me?.name ?? 'You' : post?.authorName ?? ''} handle={isYear ? s.me?.handle ?? 'you' : post?.authorHandle} src={isYear ? s.me?.avatar : post?.authorAvatar} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-bold">{isYear ? 'Your heat map' : post?.kind === 'forge' ? post.title : post?.text?.slice(0, 44)}</div>
              <div className="text-[11px] text-ink-mute">{isYear ? 'heatt.app' : `heatt.app/read/${post?.id}`}</div>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
            Exported at {DIMS[fmt][0]}×{DIMS[fmt][1]} — sized for IG Stories, X, and link previews without re-cropping.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- helpers */

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-[12px] border border-white/[.07] px-3 py-2 text-[13px] text-ink-dim transition-colors hover:border-white/20">
      {label}
      <span className="grid h-4.5 w-[18px] place-items-center rounded-[5px] border" style={{ borderColor: value ? 'var(--ht-flame)' : 'var(--ht-line)', background: value ? 'rgba(255,138,31,.2)' : 'transparent', height: 18 }}>
        {value && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ht-whitehot)" strokeWidth="3.4">
            <path d="m5 13 4.5 4.5L19 7" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

function drawLockup(ctx: CanvasRenderingContext2D, x: number, y: number, p: { a: string; b: string; c: string; text: string }, size: number) {
  const g = ctx.createLinearGradient(x, y, x + size * 0.9, y + size * 1.3);
  g.addColorStop(0, p.c);
  g.addColorStop(0.5, p.b);
  g.addColorStop(1, p.a);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.beginPath();
  ctx.moveTo(14.1, 1.6);
  ctx.bezierCurveTo(15.7, 5.9, 14.4, 8, 12.6, 10);
  ctx.bezierCurveTo(10.6, 12.3, 8.1, 14.3, 8.1, 18.5);
  ctx.bezierCurveTo(8.1, 22.6, 11.4, 25, 15, 25);
  ctx.bezierCurveTo(19, 25, 22, 22, 22, 17.8);
  ctx.bezierCurveTo(22, 14.4, 20, 12.1, 19.2, 8.9);
  ctx.bezierCurveTo(21.4, 11.5, 23, 14.4, 23, 18);
  ctx.bezierCurveTo(23, 24.6, 17.6, 30, 10.6, 30);
  ctx.bezierCurveTo(3.6, 30, -1, 24.6, -1, 17.7);
  ctx.bezierCurveTo(-1, 9.8, 6.5, 5.5, 11.6, 1.6);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.font = `700 ${size * 1.15}px "Bricolage Grotesque Variable", sans-serif`;
  ctx.fillStyle = p.text;
  ctx.textBaseline = 'middle';
  ctx.fillText('heatt', x + size * 1.35, y + size * 0.62);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = (text ?? '').split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > width && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else cur = test;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const used = lines.join(' ').length;
    const rest = text.slice(used).trim();
    if (rest) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,.;:]$/, '')}…`;
  }
  return lines.filter(Boolean);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) sw = img.height * r;
  else sh = img.width / r;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImg(src: string): Promise<HTMLImageElement> {
  const key = src;
  const hit = imgCache.get(key);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // never let a remote image break the poster — fall back to procedural
      const fb = new Image();
      fb.onload = () => resolve(fb);
      fb.onerror = reject;
      fb.src = avatarDataUri('heatt', 'heatt');
    };
    img.src = src;
  });
  imgCache.set(key, p);
  return p;
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
