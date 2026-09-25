'use client';
/* ============================================================================
   lib/feed — one union type for everything the app renders, plus the small
   ranker that orders it.

   Sources, in order of trust:

     originals   @heatt's own stories (bundled)
     notes       @heatt's own short notes (bundled)
     mine        what you wrote on this device
     wire        public articles by real writers, syndicated from Dev.to

   Nothing here invents an author, and nothing here fabricates an interaction.
   ==========================================================================*/

import { ORIGINALS } from './seed/articles';
import { SPARKS } from './seed/sparks';
import { getUser, HOUSE_HANDLE } from './seed/users';
import { computeHeat, type HeatResult, spreadByAuthor } from './heat';
import type { ArticleBlock, HeatLevel, Spark, User } from './types';
import type { State } from './store';
import type { WireItem } from './syndicate';

export type Post = {
  id: string;
  kind: 'spark' | 'forge';
  origin: 'original' | 'note' | 'mine' | 'wire';
  authorHandle: string;
  authorName: string;
  authorAvatar?: string;
  author?: User;
  org?: string;
  date: string;
  tags: string[];
  reactions: number;
  comments: number;
  reposts?: number;
  /* spark */
  text?: string;
  media?: { url: string; alt: string }[];
  link?: Spark['link'];
  poll?: Spark['poll'];
  quoteOf?: Spark['quoteOf'];
  longRef?: string;
  /* forge */
  title?: string;
  dek?: string;
  cover?: string;
  minutes?: number;
  blocks?: ArticleBlock[];
  markdown?: string;
  canonical?: string;
  path?: string;
  source?: { name: string; url: string };
  accent?: string;
  editorsPick?: boolean;
  /* computed */
  heatScore?: HeatResult;
  heated?: HeatLevel;
  savedAt?: number;
  readPct?: number;
};

export type RankMode = 'for-you' | 'fresh' | 'popular' | 'discussed';
export type Tab = 'all' | 'stories' | 'notes' | 'following' | 'kept';

/* --------------------------------------------------------------- assembly */

function fromOriginals(): Post[] {
  return ORIGINALS.map((a) => {
    const u = getUser(a.author);
    return {
      id: a.id,
      kind: 'forge' as const,
      origin: 'original' as const,
      authorHandle: a.author,
      authorName: u.name,
      authorAvatar: u.avatar,
      author: u,
      org: u.org,
      date: a.date,
      tags: a.tags,
      reactions: a.reactions ?? 0,
      comments: a.comments ?? 0,
      title: a.title,
      dek: a.dek,
      cover: a.cover,
      accent: a.accent,
      minutes: a.minutes,
      blocks: a.blocks,
      editorsPick: a.editorsPick,
      canonical: `#/${a.id}`,
      source: { name: 'heatt Originals', url: '#/originals' },
    } as Post;
  });
}

function fromNotes(): Post[] {
  return SPARKS.map((p) => {
    const u = getUser(p.author);
    return {
      id: p.id,
      kind: 'spark' as const,
      origin: 'note' as const,
      authorHandle: p.author,
      authorName: u.name,
      authorAvatar: u.avatar,
      author: u,
      date: p.date,
      tags: p.tags ?? [],
      reactions: p.reactions ?? 0,
      comments: p.comments ?? 0,
      reposts: p.reposts,
      text: p.text,
      media: p.media,
      link: p.link,
      poll: p.poll,
      quoteOf: p.quoteOf,
      longRef: p.longRef,
    } as Post;
  });
}

function fromMine(s: State): Post[] {
  const me = s.me;
  if (!me) return [];
  const sparks: Post[] = (s.mySparks ?? []).map((p) => ({
    id: p.id,
    kind: 'spark',
    origin: 'mine',
    authorHandle: me.handle,
    authorName: me.name,
    authorAvatar: me.avatar,
    author: me,
    date: p.date,
    tags: p.tags ?? [],
    reactions: p.reactions ?? 0,
    comments: s.replies.filter((r) => r.postId === p.id).length,
    text: p.text,
    media: p.media,
    link: p.link,
    poll: p.poll,
    quoteOf: p.quoteOf,
    longRef: p.longRef,
  }));
  const stories: Post[] = (s.myArticles ?? []).map((a) => ({
    id: a.id,
    kind: 'forge',
    origin: 'mine',
    authorHandle: me.handle,
    authorName: me.name,
    authorAvatar: me.avatar,
    author: me,
    date: a.date,
    tags: a.tags,
    reactions: 0,
    comments: 0,
    title: a.title,
    dek: a.dek,
    cover: a.cover,
    minutes: a.minutes,
    markdown: a.markdown,
    source: a.source,
  }));
  return [...sparks, ...stories];
}

function fromWire(items: WireItem[]): Post[] {
  return items.map((w) => ({
    id: w.id,
    kind: 'forge' as const,
    origin: 'wire' as const,
    authorHandle: w.handle,
    authorName: w.author,
    authorAvatar: w.avatar,
    author: getUser(w.handle),
    org: w.org,
    date: w.date,
    tags: w.tags,
    reactions: w.reactions,
    comments: w.comments,
    title: w.title,
    dek: w.dek,
    cover: w.cover,
    minutes: w.minutes,
    path: w.path,
    canonical: w.canonical,
    accent: w.flare,
    source: { name: 'Dev.to', url: 'https://dev.to' },
  }));
}

export function assemble(s: State, wire: WireItem[] = []): Post[] {
  const all = [...fromOriginals(), ...fromNotes(), ...fromMine(s), ...fromWire(wire)];
  const seen = new Set<string>();
  const muted = new Set(s.muted ?? []);
  const out: Post[] = [];
  for (const p of all) {
    if (muted.has(`@${p.authorHandle}`)) continue;
    let id = p.id;
    let n = 2;
    while (seen.has(id)) id = `${p.id}-${n++}`;
    seen.add(id);
    const post = id === p.id ? p : { ...p, id };
    /* heat is attached here, once, so every consumer (cards, reader, share
       studio, profile sort) reads a real number instead of guessing */
    out.push({ ...post, heatScore: heatFor({ ...post, heatScore: undefined } as Post, s) });
  }
  return out;
}

/* ------------------------------------------------------------------- heat */

export function heatFor(p: Post, s: State): HeatResult {
  const mine = s.heat?.[p.id];
  return computeHeat({
    reactions: p.reactions,
    comments: p.comments,
    reposts: p.reposts,
    date: p.date,
    seed: p.id,
    mine: mine
      ? {
          level: mine.level,
          at: mine.at,
          read: !!s.reads?.[p.id]?.finished,
          saved: !!s.saved?.[p.id],
          shared: s.shares?.[p.id] ?? 0,
        }
      : {
          level: 0,
          read: !!s.reads?.[p.id]?.finished,
          saved: !!s.saved?.[p.id],
          shared: s.shares?.[p.id] ?? 0,
        },
  });
}

/* ------------------------------------------------------------------- rank */

export type RankOpts = {
  mode?: RankMode;
  tab?: Tab | string;
  query?: string;
  handle?: string;
  /** limits the board to what you follow (following tab) */
  follows?: string[];
};

export function rank(posts: Post[], s: State, opts: RankOpts = {}) {
  const mode = opts.mode ?? 'for-you';
  const tab = (opts.tab ?? 'all') as Tab;

  const scored = posts.map((p) => {
    const heatScore = p.heatScore ?? heatFor(p, s);
    const mine = s.shares?.[p.id] ? 1 : 0;
    return { ...p, heatScore, heated: s.heat?.[p.id]?.level ?? 0, shared: mine };
  });

  let items = scored;

  if (tab === 'stories') items = items.filter((p) => p.kind === 'forge');
  if (tab === 'notes') items = items.filter((p) => p.kind === 'spark');
  if (tab === 'kept') items = items.filter((p) => !!s.saved?.[p.id]);
  if (tab === 'following') {
    const following = new Set([...(opts.follows ?? s.follows ?? []), s.me?.handle ?? '']);
    items = items.filter((p) => following.has(p.authorHandle));
  }
  if (opts.handle) items = items.filter((p) => p.authorHandle === opts.handle);
  if (opts.query) items = items.filter((p) => matches(p, opts.query!));

  const byDate = (a: Post, b: Post) => new Date(b.date).getTime() - new Date(a.date).getTime();
  const sorters: Record<RankMode, (a: (typeof items)[number], b: (typeof items)[number]) => number> = {
    'for-you': (a, b) => {
      /* ranking is heat, with a gentle pull toward writers you follow and a
         small boost for anything you kept (you told us it mattered). */
      const bump = (p: (typeof items)[number]) =>
        (s.follows?.includes(p.authorHandle) ? 0.06 : 0) + (s.saved?.[p.id] ? 1.6 : 0);
      return (b.heatScore!.score + bump(b)) - (a.heatScore!.score + bump(a));
    },
    fresh: byDate,
    popular: (a, b) => b.heatScore!.volume - a.heatScore!.volume,
    discussed: (a, b) => b.comments - a.comments || byDate(a, b),
  };

  items = [...items].sort(sorters[mode] ?? sorters['for-you']);
  if (mode === 'for-you') items = spreadByAuthor(items, 3) as typeof items;

  return { items, total: items.length };
}

export function matches(p: Post, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [p.title, p.dek, p.text, p.authorName, p.authorHandle, p.tags.join(' '), p.org]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((word) => hay.includes(word.replace(/^#|^@/, '')));
}

export function trendingTags(posts: Post[], now = Date.now(), limit = 10) {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const ageDays = Math.max(0.4, (now - new Date(p.date).getTime()) / 86400000);
    const weight = (1 + Math.log1p(p.reactions + p.comments * 2)) / ageDays;
    for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + weight);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, weight]) => ({ tag, weight: Math.round(weight * 10) / 10 }));
}

export function topAuthors(posts: Post[], limit = 6) {
  const counts = new Map<string, { posts: number; reactions: number; name: string; avatar?: string }>();
  for (const p of posts) {
    const row = counts.get(p.authorHandle) ?? { posts: 0, reactions: 0, name: p.authorName, avatar: p.authorAvatar };
    row.posts += 1;
    row.reactions += p.reactions;
    counts.set(p.authorHandle, row);
  }
  return [...counts.entries()]
    .filter(([handle]) => handle !== HOUSE_HANDLE)
    .sort((a, b) => b[1].posts * 4 + b[1].reactions - (a[1].posts * 4 + a[1].reactions))
    .slice(0, limit)
    .map(([handle, row]) => ({ handle, ...row }));
}

/** the pieces you left unfinished, newest first */
export function unfinished(posts: Post[], s: State) {
  return Object.entries(s.reads ?? {})
    .filter(([, r]) => r.pct >= 3 && r.pct < 97)
    .sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
    .map(([id, r]) => {
      const post = posts.find((p) => p.id === id);
      return post ? { post, pct: Math.round(r.pct), at: r.at } : null;
    })
    .filter((x): x is { post: Post; pct: number; at: number } => !!x);
}
