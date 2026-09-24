'use client';
/* ============================================================================
   /explore — search, topics, writers.

   A real search field (not a modal), a topic rail built from the actual
   corpus, and the writers behind the pieces — the house, the syndicated, and
   you. No suggested-people carousel of imaginary accounts.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { PostCard } from '@/components/cards/PostCard';
import { Avatar, Chip, Empty } from '@/components/ui/primitives';
import { PageHead, TopBar, usePathnameSafe } from '@/components/shell/Shell';
import { matches, trendingTags, topAuthors } from '@/lib/feed';
import { cls, compact } from '@/lib/util';
import { Stagger, item } from '@/components/ui/motion';

/* useSearchParams needs a Suspense boundary so the page can still prerender */
export default function ExplorePage() {
  return (
    <React.Suspense fallback={null}>
      <Explore />
    </React.Suspense>
  );
}

function Explore() {
  const app = useApp();
  const s = useStore();
  const path = usePathnameSafe();
  const params = useSearchParams();
  const initialQ = params?.get('q') ?? app.query ?? '';
  const [q, setQ] = React.useState(initialQ);
  const [tag, setTag] = React.useState<string | null>(null);

  React.useEffect(() => {
    app.setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  /* a link can carry a query (?q=design) — a trait chip, a trending topic */
  React.useEffect(() => {
    const url = params?.get('q');
    if (url) {
      setQ(url);
      setTag(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, path]);

  const tags = React.useMemo(() => trendingTags(app.posts, Date.now(), 16), [app.posts]);
  const authors = React.useMemo(() => topAuthors(app.posts, 8), [app.posts]);

  const results = React.useMemo(() => {
    const needle = q.trim() || tag || '';
    const list = app.posts.filter((p) => (needle ? matches(p, needle) : true));
    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 40);
  }, [app.posts, q, tag]);

  const searching = q.trim().length > 0 || !!tag;

  return (
    <>
      <TopBar />
      <div className="ht-stage pt-2">
        <PageHead
          eyebrow="explore"
          title={searching ? 'Search results' : 'Look around'}
          dek="Search titles, standfirsts, notes, handles and topics. Everything indexed here is either the house, a syndicated writer, or you."
        />

        {/* --------------------------------------------------------- search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.2-4.2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stories, notes, writers, topics…"
            aria-label="Search heatt"
            className="ht-input !h-[50px] !rounded-full !pl-11 !pr-11"
          />
          {(q || tag) && (
            <button
              onClick={() => {
                setQ('');
                setTag(null);
              }}
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink"
              aria-label="Clear search"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        {!searching && (
          <>
            {/* ----------------------------------------------------- topics */}
            <section className="mt-9">
              <span className="ht-eyebrow">topics</span>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t.tag} onClick={() => setTag(t.tag)} className="ht-chip">
                    #{t.tag}
                    <span className="ht-ink-4">{compact(t.weight)}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ---------------------------------------------------- writers */}
            <section className="mt-10">
              <span className="ht-eyebrow">writers in the room</span>
              <Stagger each={0.05} className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                <motion.div variants={item}>
                  <WriterRow handle="heatt" tag="the house" />
                </motion.div>
                {authors.map((a) => (
                  <motion.div key={a.handle} variants={item}>
                    <WriterRow handle={a.handle} tag={`${a.posts} ${a.posts === 1 ? 'piece' : 'pieces'}`} />
                  </motion.div>
                ))}
              </Stagger>
            </section>

            <section className="mt-10">
              <span className="ht-eyebrow">everything, newest first</span>
              <div className="mt-3.5 space-y-3.5">
                {results.slice(0, 12).map((p, i) => (
                  <PostCard key={p.id} post={p} index={i} />
                ))}
              </div>
            </section>
          </>
        )}

        {searching && (
          <>
            <div className="mt-5 flex items-center gap-2">
              <span className="text-[12.5px] text-ink-mute">
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {tag ? ` for #${tag}` : q ? ` for “${q}”` : ''}
              </span>
              {tag && (
                <button onClick={() => setTag(null)} className="ht-chip">
                  clear topic
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3.5">
              {results.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </div>
            {results.length === 0 && (
              <Empty
                title="Nothing matched"
                body="Try a shorter word, a topic like #design, or a handle. The index covers every story, note and syndicated piece."
                action={
                  <button onClick={() => { setQ(''); setTag(null); }} className="ht-btn ht-btn--quiet">
                    Clear search
                  </button>
                }
              />
            )}
          </>
        )}

        <div className="mt-12 flex items-center justify-between border-t border-line pt-6 text-[12px] text-ink-4">
          <span>{app.posts.length} pieces indexed</span>
          <Link href="/library" className="hover:text-ink-2">
            Your library · {Object.keys(s.saved).length} kept
          </Link>
        </div>
      </div>
    </>
  );
}

function WriterRow({ handle, tag }: { handle: string; tag: string }) {
  const app = useApp();
  const u = app.posts.find((p) => p.authorHandle === handle)?.author;
  const name = u?.name ?? handle;
  const following = app.follows.includes(handle);
  return (
    <div className="ht-row">
      <Link href={`/u/${handle}`} className="shrink-0" aria-label={`${name} profile`}>
        <Avatar name={name} handle={handle} src={u?.avatar} size={38} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${handle}`} className="block truncate text-[13.5px] font-semibold text-ink hover:text-white">
          {name}
        </Link>
        <span className="block truncate text-[11.5px] text-ink-faint">
          @{handle} · {tag}
        </span>
      </div>
      {handle !== "you" && (
        <button
          onClick={() => app.toggleFollow(handle)}
          className={cls('ht-chip shrink-0', following && 'ht-chip--heat')}
          aria-pressed={following}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      )}
      <Link href={`/u/${handle}`} className="ht-round ht-round--dark ht-round--sm" aria-label={`Open ${name}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

