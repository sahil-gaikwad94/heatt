'use client';
/* ============================================================================
   components/share/ShareStudio — stories.

   A share that behaves like the ones Apple Music and Medium ship: a
   full-screen story you step through — cover, the line worth reading out
   loud, signature — with segmented progress, tap/hold, and a glass action row.

   The frames are painted on canvas at real export resolution (1080×1920
   story, 1080×1350 feed, 1080×1080 square, 1200×630 link) so the preview is
   exactly the file you post. Export: download PNG, copy to the clipboard,
   native share sheet with a File, or copy the deep link.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '@/components/ui/primitives';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { avatarDataUri, cls, plain } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';
import { useMotionPrefs } from '@/components/ui/motion';

const FRAMES = ['Cover', 'The line', 'Signature'] as const;

type Fmt = 'story' | 'feed' | 'square' | 'card';
const DIMS: Record<Fmt, [number, number]> = {
  story: [1080, 1920],
  feed: [1080, 1350],
  square: [1080, 1080],
  card: [1200, 630],
};
const FORMAT_LABEL: Record<Fmt, string> = {
  story: 'Story 9:16',
  feed: 'Feed 4:5',
  square: 'Square 1:1',
  card: 'Link 1.91:1',
};

type Theme = 'champagne' | 'glacier' | 'obsidian' | 'platinum';
const THEMES: Record<Theme, { a: string; b: string; c: string; text: string; sub: string; bed: string; label: string }> = {
  champagne: { a: '#E8D3A4', b: '#8F7A4E', c: '#FFF8E6', text: '#FFFBF2', sub: 'rgba(255,248,230,.68)', bed: '#0A0906', label: 'champagne' },
  glacier: { a: '#6BA2FF', b: '#2F4C86', c: '#C6DEFF', text: '#F2F7FF', sub: 'rgba(226,238,255,.7)', bed: '#05070C', label: 'glacier' },
  obsidian: { a: '#8A8F9A', b: '#3A3E47', c: '#D5D9E0', text: '#F4F5F7', sub: 'rgba(255,255,255,.6)', bed: '#08090C', label: 'obsidian' },
  platinum: { a: '#CFD3DA', b: '#7C8290', c: '#F2F4F8', text: '#FBFCFD', sub: 'rgba(255,255,255,.66)', bed: '#0B0C10', label: 'platinum' },
};

export function ShareStudio() {
  const app = useApp();
  const s = useStore();
  const id = app.shareId;
  const open = !!id;
  const isProfile = !!id && id.startsWith('profile:');
  const profHandle = isProfile ? id.slice('profile:'.length) : null;
  const post = id && !isProfile ? app.posts.find((p) => p.id === id) : null;

  const [fmt, setFmt] = React.useState<Fmt>('story');
  const [theme, setTheme] = React.useState<Theme>('champagne');
  const [autoTheme, setAutoTheme] = React.useState(true);
  const [frame, setFrame] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const { reduced } = useMotionPrefs();
  const [note, setNote] = React.useState('');
  const [done, setDone] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = React.useState(false);
  const attach = React.useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    setCanvasReady((v) => (v === !!el ? v : !!el));
  }, []);

  /* the theme can follow the piece's own standing instead of being hand-picked */
  const heat = post?.heatScore?.heat ?? (isProfile ? 40 : 30);
  const effective: Theme = autoTheme ? (heat > 62 ? 'champagne' : heat > 34 ? 'platinum' : 'glacier') : theme;

  React.useEffect(() => {
    if (!open) return;
    setFrame(0);
    setProgress(0);
    setPaused(false);
    setNote('');
    setDone(null);
  }, [open, id]);

  /* story playback: 7s a frame, paused while you decide — and never
     auto-advancing for someone who asked for less motion */
  React.useEffect(() => {
    if (!open || paused || reduced) return;
    const t0 = Date.now();
    const iv = window.setInterval(() => {
      const v = (Date.now() - t0) / 7000;
      setProgress(Math.min(1, v));
      if (v >= 1) {
        setProgress(0);
        setFrame((n) => (n + 1) % FRAMES.length);
      }
    }, 80);
    return () => window.clearInterval(iv);
  }, [open, paused, frame, reduced]);

  /* paint */
  React.useEffect(() => {
    if (!open || !canvasReady) return;
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canvasReady, fmt, effective, frame, id, note]);

  async function draw() {
    const c = canvasRef.current;
    if (!c || !id) return;
    const [W, H] = DIMS[fmt];
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const t = THEMES[effective];

    try {
      await Promise.all([
        document.fonts.load('600 92px "Bricolage Grotesque Variable"'),
        document.fonts.load('400 italic 46px "Newsreader Variable"'),
        document.fonts.load('700 26px "Inter Variable"'),
        document.fonts.ready,
      ]);
    } catch {
      /* fonts mid-load — carry on with the fallbacks */
    }

    const data = payload();
    const pad = fmt === 'card' ? 52 : 76;
    const innerW = W - pad * 2;
    const seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0);

    /* ---------------------------------------------------------- background */
    ctx.fillStyle = t.bed;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 4; i++) {
      const q = (seed * (i + 3)) % 100;
      const x = W * (0.06 + ((q * 7.3) % 84) / 100);
      const y = H * (0.42 + ((q * 2.7) % 46) / 100);
      const r = Math.min(W, H) * (0.4 + ((q * 1.7) % 44) / 100);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = i % 3 === 0 ? t.a : i % 3 === 1 ? t.b : t.c;
      g.addColorStop(0, hexA(col, 0.34));
      g.addColorStop(0.5, hexA(col, 0.1));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    scrim.addColorStop(0, 'rgba(0,0,0,.86)');
    scrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H * 0.62);
    const base = ctx.createLinearGradient(0, H * 0.58, 0, H);
    base.addColorStop(0, 'rgba(0,0,0,0)');
    base.addColorStop(1, hexA(t.a, 0.16));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    /* film grain — a poster should feel printed, not rendered */
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
    }

    /* --------------------------------------------------------------- head */
    let y = pad;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // lockup
    ctx.font = `600 ${fmt === 'card' ? 24 : 30}px "Bricolage Grotesque Variable", sans-serif`;
    ctx.fillStyle = t.text;
    ctx.fillText('heatt', pad, y + 26);
    ctx.fillStyle = hexA(t.c, 0.9);
    ctx.fillRect(pad + 74, y + 10, 22, 2);

    ctx.textAlign = 'right';
    ctx.font = `700 ${fmt === 'card' ? 16 : 20}px "Inter Variable", sans-serif`;
    ctx.fillStyle = hexA(t.a, 0.95);
    ctx.fillText(data.chip.toUpperCase(), W - pad, y + 22);
    ctx.textAlign = 'left';
    y += fmt === 'card' ? 62 : 86;

    if (frame === 0) {
      /* frame 1 — the cover */
      if (data.cover && fmt !== 'card') {
        const ch = H * (fmt === 'story' ? 0.3 : 0.3);
        try {
          const img = await load(data.cover);
          ctx.save();
          round(ctx, pad, y, innerW, ch, 26);
          ctx.clip();
          drawCover(ctx, img, pad, y, innerW, ch);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,.14)';
          ctx.lineWidth = 2;
          round(ctx, pad, y, innerW, ch, 26);
          ctx.stroke();
          y += ch + 36;
        } catch {
          /* a failed cover must never break the poster */
        }
      } else if (fmt !== 'card') {
        const artH = H * 0.22;
        ctx.save();
        round(ctx, pad, y, innerW, artH, 30);
        const g = ctx.createLinearGradient(pad, y, pad + innerW, y + artH);
        g.addColorStop(0, hexA(t.a, 0.4));
        g.addColorStop(0.55, hexA(t.b, 0.22));
        g.addColorStop(1, hexA(t.c, 0.14));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        y += artH + 36;
      }

      const size = fmt === 'story' ? 86 : fmt === 'feed' ? 76 : 52;
      ctx.font = `600 ${size}px "Bricolage Grotesque Variable", sans-serif`;
      ctx.fillStyle = t.text;
      const lines = wrap(ctx, data.title, innerW, fmt === 'card' ? 3 : 5);
      lines.forEach((ln, i) => ctx.fillText(ln, pad, y + size * 0.96 * i + size * 0.78));
      y += lines.length * size * 0.98 + 22;

      ctx.font = `400 ${fmt === 'card' ? 20 : 27}px "Inter Variable", sans-serif`;
      ctx.fillStyle = t.sub;
      wrap(ctx, data.dek, innerW, fmt === 'story' ? 5 : 3).forEach((ln, i) => ctx.fillText(ln, pad, y + 30 * i + 24));
    } else if (frame === 1) {
      /* frame 2 — the line */
      const size = fmt === 'card' ? 30 : fmt === 'feed' ? 44 : 48;
      const lh = size * 1.34;
      ctx.font = `400 italic ${size}px "Newsreader Variable", Georgia, serif`;
      ctx.fillStyle = t.text;
      const q = wrap(ctx, `“${data.quote}”`, innerW - 38, fmt === 'story' ? 10 : 6);
      ctx.strokeStyle = hexA(t.a, 0.85);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pad, y + 4);
      ctx.lineTo(pad, y + q.length * lh);
      ctx.stroke();
      q.forEach((ln, i) => ctx.fillText(ln, pad + 38, y + size * 0.92 + i * lh));
      y += q.length * lh + 34;

      ctx.font = `700 ${fmt === 'card' ? 18 : 23}px "Inter Variable", sans-serif`;
      ctx.fillStyle = hexA(t.c, 0.92);
      ctx.fillText(data.author, pad + 38, y);

      if (note) {
        y += fmt === 'card' ? 38 : 52;
        ctx.font = `400 ${fmt === 'card' ? 20 : 28}px "Newsreader Variable", Georgia, serif`;
        ctx.fillStyle = t.sub;
        wrap(ctx, `“${note}”`, innerW - 38, 4).forEach((ln, i) => ctx.fillText(ln, pad + 38, y + i * 36));
      }
    } else {
      /* frame 3 — signature */
      const size = fmt === 'story' ? 74 : fmt === 'feed' ? 62 : fmt === 'square' ? 58 : 44;
      ctx.font = `600 ${size}px "Bricolage Grotesque Variable", sans-serif`;
      ctx.fillStyle = t.text;
      const lines = wrap(ctx, data.title, innerW, 4);
      lines.forEach((ln, i) => ctx.fillText(ln, pad, y + size * 0.96 * i + size * 0.78));
      y += lines.length * size * 0.98 + 26;

      ctx.font = `400 ${fmt === 'card' ? 20 : 27}px "Newsreader Variable", Georgia, serif`;
      ctx.fillStyle = t.sub;
      wrap(ctx, data.dek, innerW, 5).forEach((ln, i) => ctx.fillText(ln, pad, y + 22 + i * 38));

      y += 96;
      ctx.font = `600 ${fmt === 'card' ? 20 : 26}px "Bricolage Grotesque Variable", sans-serif`;
      ctx.fillStyle = hexA(t.c, 0.95);
      ctx.fillText(data.cta, pad, y);
    }

    /* ------------------------------------------------------------- footer */
    const fy = H - pad;
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, fy - 58);
    ctx.lineTo(W - pad, fy - 58);
    ctx.stroke();

    try {
      const av = await load(data.avatar);
      const r = fmt === 'card' ? 24 : 32;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pad + r, fy - 22, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(av, pad, fy - 22 - r, r * 2, r * 2);
      ctx.restore();
      ctx.strokeStyle = hexA(t.a, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pad + r, fy - 22, r, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      /* the procedural avatar always loads; this is belt and braces */
    }

    ctx.font = `600 ${fmt === 'card' ? 18 : 24}px "Inter Variable", sans-serif`;
    ctx.fillStyle = t.text;
    ctx.fillText(data.author, pad + (fmt === 'card' ? 62 : 82), fy - 28);
    ctx.font = `400 ${fmt === 'card' ? 14 : 18}px "Inter Variable", sans-serif`;
    ctx.fillStyle = t.sub;
    ctx.fillText(data.handleLine, pad + (fmt === 'card' ? 62 : 82), fy - 4);

    ctx.textAlign = 'right';
    ctx.font = `700 ${fmt === 'card' ? 16 : 20}px "Inter Variable", sans-serif`;
    ctx.fillStyle = hexA(t.c, 0.95);
    ctx.fillText('heatt', W - pad, fy - 12);
    ctx.textAlign = 'left';
  }

  function payload() {
    if (isProfile) {
      const u = app.posts.find((p) => p.authorHandle === profHandle)?.author;
      const name = u?.name ?? profHandle ?? 'someone';
      const pieces = app.posts.filter((p) => p.authorHandle === profHandle);
      return {
        title: name,
        dek: u?.bio ?? 'Writing on heatt.',
        quote: u?.bio ?? 'Reading more than posting.',
        chip: `${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}`,
        author: name,
        handleLine: `@${profHandle} · heatt`,
        avatar: u?.avatar ?? avatarDataUri(name, profHandle ?? 'you'),
        cover: u?.cover,
        cta: 'Read them in heatt →',
      };
    }
    const p = post!;
    const prose =
      p.kind === 'forge'
        ? (p.blocks ?? [])
            .filter((b) => b.t === 'p')
            .map((b) => ('text' in b ? b.text : ''))
            .join(' ') || plain(p.markdown ?? '') || p.dek || ''
        : p.text ?? '';
    return {
      title: p.kind === 'forge' ? p.title ?? 'A piece on heatt' : p.authorName,
      dek: p.kind === 'forge' ? p.dek ?? '' : plain(p.text ?? '').slice(0, 220),
      quote: plain(prose).replace(/\s+/g, ' ').trim().slice(0, 210) || plain(p.text ?? '').slice(0, 210),
      chip: p.kind === 'forge' ? `${p.minutes ?? 6} min read` : 'note',
      author: p.authorName,
      handleLine: `@${p.authorHandle} · heatt`,
      avatar: p.authorAvatar ?? avatarDataUri(p.authorName, p.authorHandle),
      cover: p.cover,
      cta: 'Read it in heatt →',
    };
  }

  async function toBlob(): Promise<Blob | null> {
    const c = canvasRef.current;
    if (!c) return null;
    return await new Promise((res) => c.toBlob((b) => res(b), 'image/png', 0.96));
  }

  const download = async () => {
    setBusy(true);
    const blob = await toBlob();
    setBusy(false);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatt-${fmt}-${(post?.id ?? profHandle ?? 'story').toString().slice(0, 24)}.png`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Saved to your device');
  };

  const copyImage = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error('no blob');
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        flash('Image copied');
      } else {
        throw new Error('unsupported');
      }
    } catch {
      flash('Copying an image is not supported here — use download');
    }
    setBusy(false);
  };

  const nativeShare = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      const file = blob ? new File([blob], 'heatt.png', { type: 'image/png' }) : null;
      const url = deepLink();
      if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: payload().title, url });
      } else if (navigator.share) {
        await navigator.share({ title: payload().title, url });
      } else {
        throw new Error('unsupported');
      }
      useStore.getState().addShare(post?.id ?? 'profile');
      flash('Shared');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') flash('The share sheet is unavailable here');
    }
    setBusy(false);
  };

  const deepLink = () =>
    typeof window === 'undefined'
      ? 'https://heatt.app'
      : post
        ? `${window.location.origin}/read/${encodeURIComponent(post.id)}`
        : `${window.location.origin}/u/${profHandle}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink());
      if (post) useStore.getState().addShare(post.id);
      flash('Link copied');
    } catch {
      flash('Clipboard unavailable');
    }
  };

  const flash = (m: string) => {
    setDone(m);
    window.setTimeout(() => setDone(null), 2200);
  };

  const title = isProfile ? `@${profHandle}` : post?.title ?? 'Note';

  /* ------------------------------------------------------------ stepping */

  const drag = React.useRef({ x: 0, active: false, moved: false, endedAt: 0 });
  const [dragX, setDragX] = React.useState(0);

  const step = React.useCallback(
    (delta: number) => {
      setFrame((n) => (n + delta + FRAMES.length) % FRAMES.length);
      setProgress(0);
    },
    []
  );

  /* arrows step, space holds, escape leaves — the way a story behaves */
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return app.setShare(null);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, app, step]);

  /* drag the preview left/right to move through the frames */
  const dragStart = (e: React.PointerEvent) => {
    drag.current = { ...drag.current, x: e.clientX, active: true, moved: false };
    setDragX(0);
  };
  const dragMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const d = e.clientX - drag.current.x;
    if (Math.abs(d) > 8) drag.current.moved = true;
    setDragX(Math.max(-170, Math.min(170, d)));
    if (drag.current.moved) setPaused(true);
  };
  const dragEnd = () => {
    const d = dragX;
    const moved = drag.current.moved;
    drag.current.active = false;
    setDragX(0);
    setPaused(false);
    if (moved && Math.abs(d) > 56) step(d < 0 ? 1 : -1);
    /* a drag must never also count as a tap on the zone underneath: the click
       fires right after the pointerup, so the guard is time-based */
    drag.current.endedAt = Date.now();
  };

  /** true when the click arriving now is really the tail of a drag */
  const wasDrag = () => Date.now() - drag.current.endedAt < 300;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ht-share"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: EASE_OUT }}
          role="dialog"
          aria-label={`Share ${title}`}
        >
          {/* --------------------------------------------------------- stage */}
          <div
            className="ht-share__stage"
            onPointerDown={dragStart}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onPointerCancel={dragEnd}
            onPointerLeave={dragEnd}
          >
            <div className="absolute inset-x-0 top-0 z-[1] flex items-center gap-2 px-4 py-3">
              <div className="ht-share__segments" role="tablist" aria-label="Frames">
                {FRAMES.map((f, i) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={i === frame}
                    aria-label={f}
                    onClick={() => {
                      setFrame(i);
                      setProgress(0);
                    }}
                    className="ht-share__segment"
                  >
                    <i style={{ transform: `scaleX(${i < frame ? 1 : i === frame ? progress : 0})`, transition: i === frame ? 'transform 90ms linear' : undefined }} />
                  </button>
                ))}
              </div>
              <span className="ht-num ml-2 text-[11px] text-ink-3">
                {frame + 1}/{FRAMES.length}
              </span>
              <button
                onClick={() => app.setShare(null)}
                className="ht-icon-btn ml-auto"
                aria-label="Close"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* tap zones: left back, right forward, hold to pause */}
            <button
              aria-label="Previous frame"
              className="absolute bottom-0 left-0 top-[52px] z-[2] w-[32%] cursor-default"
              onClick={() => {
                if (wasDrag()) return;
                step(-1);
              }}
            />
            <button
              aria-label="Next frame"
              className="absolute bottom-0 right-0 top-[52px] z-[2] w-[68%] cursor-default"
              onClick={() => {
                if (wasDrag()) return;
                step(1);
              }}
              onPointerDown={() => setPaused(true)}
              onPointerUp={() => setPaused(false)}
              onPointerLeave={() => setPaused(false)}
            />

            <motion.div
              className="ht-share__frame"
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              style={{
                height: 'min(72dvh, 620px)',
                aspectRatio: `${DIMS[fmt][0]} / ${DIMS[fmt][1]}`,
                maxWidth: '94%',
              }}
            >
              <div
                className="h-full w-full transition-transform duration-200 ease-out"
                style={{ transform: `translateX(${(dragX * 0.3).toFixed(1)}px)`, opacity: 1 - Math.min(0.4, Math.abs(dragX) / 400) }}
              >
                <canvas ref={attach} aria-label={`${FRAMES[frame]} poster preview`} style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
              </div>
            </motion.div>

            {done && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ht-toast absolute bottom-4 left-1/2 z-[3] -translate-x-1/2"
                data-tone="heat"
                role="status"
              >
                {done}
              </motion.div>
            )}
          </div>

          {/* --------------------------------------------------------- panel */}
          <div className="ht-share__panel">
            <div className="min-w-0">
              <span className="ht-eyebrow">{isProfile ? 'profile story' : post?.kind === 'forge' ? 'story' : 'note'}</span>
              <h2 className="ht-title mt-2 line-clamp-2 text-[17px] text-ink">{title}</h2>
            </div>

            <div className="mt-5">
              <p className="ht-label mb-2">format</p>
              <div className="ht-tabrail flex-wrap !rounded-[var(--r-lg)] !p-1">
                {(Object.keys(DIMS) as Fmt[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFmt(f)}
                    aria-pressed={fmt === f}
                    className={cls('ht-tab !px-3 !text-[12.5px]', fmt === f && 'bg-white/[.08] text-ink')}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="ht-label">theme</p>
                <button
                  onClick={() => setAutoTheme((v) => !v)}
                  aria-pressed={autoTheme}
                  className={cls('text-[11px] font-semibold transition-colors', autoTheme ? 'text-ember-300' : 'text-ink-4 hover:text-ink-2')}
                >
                  {autoTheme ? 'auto from heat · on' : 'auto from heat · off'}
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                {(Object.keys(THEMES) as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setAutoTheme(false);
                      setTheme(t);
                    }}
                    aria-label={THEMES[t].label}
                    data-on={effective === t ? 'true' : 'false'}
                    className="ht-share__theme"
                    style={{
                      background: `linear-gradient(140deg, ${THEMES[t].a}, ${THEMES[t].bed})`,
                      borderColor: effective === t ? '#fff' : 'transparent',
                    }}
                  />
                ))}
                <span className="ht-ink-4 text-[11.5px]">
                  {autoTheme ? `following the piece · ${effective}` : THEMES[effective].label}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="ht-label mb-2">add a line to the story (optional)</p>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 120))}
                placeholder="why you are sending this…"
                className="ht-input"
                aria-label="Add a note to the story"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button onClick={download} disabled={busy} className="ht-share__action" data-primary="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
                Download PNG
              </button>
              <button onClick={nativeShare} disabled={busy} className="ht-share__action">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
                </svg>
                Share sheet
              </button>
              <button onClick={copyImage} disabled={busy} className="ht-share__action">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V6a1 1 0 0 1 1-1h9" />
                </svg>
                Copy image
              </button>
              <button onClick={copyLink} className="ht-share__action">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10 13a4 4 0 0 0 5.6 0l2.4-2.4a4 4 0 0 0-5.6-5.6L11 6.4" />
                  <path d="M14 11a4 4 0 0 0-5.6 0L6 13.4a4 4 0 0 0 5.6 5.6l1.4-1.4" />
                </svg>
                Copy link
              </button>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-4">
              <span>
                <span className="ht-kbd">←</span> <span className="ht-kbd">→</span> step
              </span>
              <span>
                <span className="ht-kbd">space</span> hold
              </span>
              <span>drag the preview to move through the frames</span>
            </p>

            <div className="mt-4 flex items-center gap-2.5 border-t border-line pt-4">
              <Avatar name={post?.authorName ?? 'heatt'} handle={post?.authorHandle ?? 'heatt'} src={post?.authorAvatar} size={30} />
              <p className="text-[11.5px] leading-relaxed text-ink-4">
                The file you export is drawn at {DIMS[fmt][0]}×{DIMS[fmt][1]} — the preview above is the same pixels, not a mock-up.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------------------------------------- utilities */

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.length) {
    const last = lines[lines.length - 1];
    if (ctx.measureText(line).width > maxW) lines[lines.length - 1] = `${last.replace(/[.,;:]?$/, '')}…`;
  }
  return lines;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.width / img.height;
  const tr = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > tr) {
    dw = h * ir;
    dx = x - (dw - w) / 2;
  } else {
    dh = w / ir;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  if (imgCache.has(src)) return imgCache.get(src)!;
  const p = new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('image failed'));
    img.src = src;
  });
  imgCache.set(src, p);
  return p;
}

