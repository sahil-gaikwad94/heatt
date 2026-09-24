import type { HeatLevel, User } from './types';

/* ============================================================================
   heatt — formatting + deterministic visual identity helpers
   ==========================================================================*/

export function timeAgo(iso: string | number, now = Date.now()): string {
  const t = typeof iso === 'number' ? iso : new Date(iso).getTime();
  const s = Math.max(1, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function prettyDate(iso: string | number): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function compact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0)}K`.replace('.0K', 'K');
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export const HEAT_VERB: Record<HeatLevel, string> = {
  0: 'heat',
  1: 'heated',
  2: 'blazing',
  3: 'ignited',
};

/** Deterministic 32-bit hash */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rand01(str: string, salt = 0): number {
  return (hash(`${salt}:${str}`) % 100000) / 100000;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
  if (!parts[0]) return 'he';
  if (parts.length === 1) return parts[0].slice(0, 2).toLowerCase();
  return (parts[0][0] + parts[1][0]).toLowerCase();
}

/* The three hue families the app is allowed to generate identities from:
   ember (16-44°), iris (232-256°) and a rare gold (40°). No green. */
function identityHue(h: number) {
  const fam = h % 7;
  if (fam === 0) return 40 + (h % 10); // gold
  if (fam === 1 || fam === 2) return 236 + (h % 18); // iris
  return 14 + (h % 26); // ember
}

/**
 * Procedural identity avatar — a deterministic ember/iris gradient with the
 * writer's initials, encoded as an inline SVG. Guarantees the app never shows
 * a broken avatar, even for a syndicated author whose CDN image fails.
 */
export function avatarDataUri(name: string, handle = name): string {
  const h = hash(handle);
  const hue = identityHue(h);
  const bg = `hsl(${hue} 24% ${5 + (h % 3)}%)`;
  const g1 = `hsl(${hue + 6} 78% ${50 + (h % 12)}%)`;
  const g2 = `hsl(${hue - 12} 62% ${30 + ((h >> 3) % 10)}%)`;
  const rot = (h >> 5) % 360;
  const initials = initialsOf(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
<defs>
<linearGradient id="g" gradientTransform="rotate(${rot} .5 .5)">
<stop offset="0" stop-color="${g1}"/><stop offset=".58" stop-color="${g2}"/><stop offset="1" stop-color="#120703"/>
</linearGradient>
<radialGradient id="r" cx=".5" cy=".12" r=".9">
<stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
</radialGradient>
<filter id="b"><feGaussianBlur stdDeviation="15"/></filter>
</defs>
<rect width="160" height="160" fill="${bg}"/>
<g filter="url(#b)" opacity=".9"><circle cx="${26 + (h % 96)}" cy="${116 + ((h >> 4) % 34)}" r="48" fill="${g1}" opacity=".7"/></g>
<rect width="160" height="160" fill="url(#g)" opacity=".62"/>
<rect width="160" height="160" fill="url(#r)"/>
<text x="80" y="80" text-anchor="middle" dominant-baseline="central"
 font-family="Inter,system-ui,sans-serif" font-size="60" font-weight="700"
 letter-spacing="-3" fill="#180a02" opacity=".9">${initials}</text>
<text x="80" y="80" text-anchor="middle" dominant-baseline="central"
 font-family="Inter,system-ui,sans-serif" font-size="60" font-weight="700"
 letter-spacing="-3" fill="#fff" opacity=".18" transform="translate(0 -2)">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Procedural cover: an ember/iris mesh gradient, deterministic per seed. */
export function coverDataUri(seed: string): string {
  const h = hash(seed);
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const x = (hash(`${seed}x${i}`) % 1000) / 10;
    const y = (hash(`${seed}y${i}`) % 1000) / 10;
    const r = 22 + ((hash(`${seed}r${i}`) % 420) / 10);
    const hue = i % 3 === 2 ? 238 + ((h >> i) % 18) : 12 + ((h >> i) % 30);
    const light = 22 + ((i * 9) % 26);
    return `<circle cx="${x}%" cy="${y}%" r="${r}%" fill="hsl(${hue} 82% ${light}%)" opacity=".78"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420">
<defs><filter id="bl"><feGaussianBlur stdDeviation="72"/></filter>
<linearGradient id="v" x1="0" x2="0" y1="0" y2="1">
<stop offset="0" stop-color="#08080A" stop-opacity=".08"/><stop offset="1" stop-color="#000000" stop-opacity=".94"/>
</linearGradient></defs>
<rect width="1200" height="420" fill="#0B0B0E"/>
<g filter="url(#bl)">${blobs}</g>
<rect width="1200" height="420" fill="url(#v)"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function userAvatar(u?: Pick<User, 'name' | 'handle'> & { avatar?: string }): string {
  if (u?.avatar) return u.avatar;
  return avatarDataUri(u?.name ?? 'heatt', u?.handle ?? 'heatt');
}

export function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function uid(prefix = 'ht') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** strip markdown syntax for previews without importing a parser */
export function plain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readMinutes(words: number) {
  return Math.max(1, Math.round(words / 225));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** first sentence-ish chunk, used for story posters and previews */
export function leadSentence(text: string, max = 180) {
  const clean = plain(text);
  const cut = clean.slice(0, max);
  const stop = cut.lastIndexOf('. ');
  return (stop > 60 ? cut.slice(0, stop + 1) : cut).trim();
}
