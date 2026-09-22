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
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function compact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export const HEAT_VERB: Record<HeatLevel, string> = {
  0: 'heat',
  1: 'heated',
  2: 'blazing',
  3: 'ignited',
};

/** Deterministic 0..2^32 hash */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rand01(str: string, salt = 0): number {
  const h = hash(`${salt}:${str}`);
  return (h % 100000) / 100000;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
  if (!parts[0]) return 'he';
  if (parts.length === 1) return parts[0].slice(0, 2).toLowerCase();
  return (parts[0][0] + parts[1][0]).toLowerCase();
}

/**
 * Procedural heat avatar: a deterministic molten gradient + initials, encoded
 * as an inline SVG. Guarantees the app never shows a broken avatar — including
 * offline, and for syndicated authors whose CDN image fails.
 */
export function avatarDataUri(name: string, handle = name): string {
  const h = hash(handle);
  const a = (h % 360) - 20;
  const b = ((h >> 8) % 60) + 20;
  const c = ((h >> 16) % 90) + 12;
  const bg = `hsl(${a < 0 ? 350 : 18 + (a % 22)} 88% ${9 + (h % 5)}%)`;
  const g1 = `hsl(${18 + (h % 26)} 100% ${52 + (h % 12)}%)`;
  const g2 = `hsl(${6 + (b % 16)} 96% ${44 + (c % 10)}%)`;
  const rot = (h >> 5) % 360;
  const initials = initialsOf(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
<defs>
<linearGradient id="g" gradientTransform="rotate(${rot} .5 .5)">
<stop offset="0" stop-color="${g1}"/><stop offset=".55" stop-color="${g2}"/><stop offset="1" stop-color="#120a06"/>
</linearGradient>
<radialGradient id="r" cx=".5" cy=".15" r=".9">
<stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
</radialGradient>
<filter id="b"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="160" height="160" fill="${bg}"/>
<g filter="url(#b)" opacity=".92"><circle cx="${30 + (h % 90)}" cy="${120 + (c % 30)}" r="46" fill="${g1}" opacity=".75"/></g>
<rect width="160" height="160" fill="url(#g)" opacity=".55"/>
<rect width="160" height="160" fill="url(#r)"/>
<text x="80" y="80" text-anchor="middle" dominant-baseline="central"
 font-family="Inter,system-ui,sans-serif" font-size="62" font-weight="700"
 letter-spacing="-3" fill="#0a0705" opacity=".92">${initials}</text>
<text x="80" y="80" text-anchor="middle" dominant-baseline="central"
 font-family="Inter,system-ui,sans-serif" font-size="62" font-weight="700"
 letter-spacing="-3" fill="#fff" opacity=".16" transform="translate(0 -2)">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Procedural cover: molten mesh gradient, deterministic per handle/id. */
export function coverDataUri(seed: string): string {
  const h = hash(seed);
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const x = (hash(`${seed}x${i}`) % 1000) / 10;
    const y = (hash(`${seed}y${i}`) % 1000) / 10;
    const r = 24 + ((hash(`${seed}r${i}`) % 400) / 10);
    const hue = 4 + ((h >> i) % 34);
    return `<circle cx="${x}%" cy="${y}%" r="${r}%" fill="hsl(${hue} 100% ${18 + (i * 7) % 34}%)" opacity=".8"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
<defs><filter id="bl"><feGaussianBlur stdDeviation="70"/></filter>
<linearGradient id="v" x1="0" x2="0" y1="0" y2="1">
<stop offset="0" stop-color="#0a0a0b" stop-opacity=".1"/><stop offset="1" stop-color="#060607" stop-opacity=".95"/>
</linearGradient></defs>
<rect width="1200" height="400" fill="#0b0b0d"/>
<g filter="url(#bl)">${blobs}</g>
<rect width="1200" height="400" fill="url(#v)"/>
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
