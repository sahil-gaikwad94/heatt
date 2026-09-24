import { NextResponse } from 'next/server';

/* ============================================================================
   GET /api/feed — zero-cost syndication engine (spec §6 + §9.2)

   Pulls free, public long-form articles from the Forem (Dev.to) REST API and
   normalises them into heatt "wire" items. The list endpoint intentionally
   omits bodies (we never store third-party text) — the reader fetches a body
   per view and renders it natively.

   Everything is cached with stale-while-revalidate so the CDN absorbs reads
   and the origin is hit once per revalidate window.
   ==========================================================================*/

export const revalidate = 600;
export const dynamic = 'force-dynamic'; // keep ISR semantics via revalidate, no full static

/* Cache policy is part of the contract: a good answer may sit at the edge for
   10 minutes, a thin one for two, and a failed one must not be cached at all —
   otherwise one bad minute upstream becomes a day of empty boards. */
const SWR_FULL = 's-maxage=600, stale-while-revalidate=86400';
const SWR_PARTIAL = 's-maxage=120, stale-while-revalidate=600';

type ForemArticle = {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  path?: string;
  url?: string;
  canonical_url?: string;
  published_at?: string;
  reading_time_minutes?: number;
  positive_reactions_count?: number;
  public_reactions_count?: number;
  comments_count?: number;
  tag_list?: string[];
  tags?: string;
  cover_image?: string;
  social_image?: string;
  user?: { name?: string; username?: string; profile_image_90?: string; website_url?: string };
  organization?: { name?: string; username?: string; profile_image_90?: string };
  flare_tag?: { name?: string };
};

const BOARDS: { key: string; params: Record<string, string> }[] = [
  { key: 'top', params: { per_page: '20', top: '3' } },
  { key: 'latest', params: { per_page: '20' } },
  { key: 'webdev', params: { per_page: '12', tag: 'webdev' } },
  { key: 'design', params: { per_page: '10', tag: 'design' } },
  { key: 'ai', params: { per_page: '10', tag: 'ai' } },
  { key: 'programming', params: { per_page: '10', tag: 'programming' } },
];

function norm(a: ForemArticle, board: string) {
  const u = a.user ?? {};
  return {
    board,
    id: a.id,
    title: (a.title ?? 'Untitled').trim(),
    excerpt: (a.description ?? '').trim(),
    handle: u.username ?? 'dev',
    author: u.name ?? u.username ?? 'Author',
    org: a.organization?.name,
    avatar: u.profile_image_90,
    path: a.path ?? `/${u.username}/${a.slug}`,
    canonical: a.canonical_url ?? `https://dev.to${a.path ?? ''}`,
    date: a.published_at ?? new Date().toISOString(),
    minutes: a.reading_time_minutes ?? 4,
    reactions: a.positive_reactions_count ?? a.public_reactions_count ?? 0,
    comments: a.comments_count ?? 0,
    tags: a.tag_list ?? (a.tags ? a.tags.split(',').map((t) => t.trim()) : []),
    cover: a.cover_image ?? a.social_image,
    flare: a.flare_tag?.name,
  };
}

async function grab(params: Record<string, string>) {
  const url = new URL('https://dev.to/api/articles');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), {
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(7000),
    headers: { accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`forem ${r.status}`);
  return (await r.json()) as ForemArticle[];
}

export async function GET() {
  const results = await Promise.allSettled(BOARDS.map((b) => grab(b.params).then((rows) => rows.map((r) => norm(r, b.key)))));
  const merged: ReturnType<typeof norm>[] = [];
  const seen = new Set<number>();
  for (const res of results) {
    if (res.status === 'fulfilled') {
      for (const item of res.value) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  const boardsAnswered = results.filter((r) => r.status === 'fulfilled').length;
  const anyOk = merged.length > 0;
  const partial = anyOk && boardsAnswered < BOARDS.length;

  /* Nothing came back: tell the truth, say when to try again, and keep the
     CDN out of it. The client falls back to its bundled snapshot at once. */
  if (!anyOk) {
    return NextResponse.json(
      { ok: false, at: Date.now(), source: 'unreachable', items: [] },
      {
        status: 503,
        headers: {
          'cache-control': 'no-store, max-age=0',
          'retry-after': '60',
          'x-heatt-origin': 'offline',
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      at: Date.now(),
      source: 'forem',
      partial,
      boards: boardsAnswered,
      items: merged,
    },
    {
      headers: {
        'cache-control': partial ? SWR_PARTIAL : SWR_FULL,
        'x-heatt-origin': 'forem',
        'x-heatt-partial': partial ? '1' : '0',
      },
    }
  );
}
