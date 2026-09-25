'use client';
/* ============================================================================
   /read/[id] — the deep-linkable reader.

   The same ArticleReader the app mounts, but as a page, so a shared link opens
   straight into the text with the progress rail already running.
   ==========================================================================*/

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { ArticleReader } from '@/components/reader/Reader';
import { ORIGINALS } from '@/lib/seed/articles';
import { getUser } from '@/lib/seed/users';
import { heatFor, type Post } from '@/lib/feed';

export default function ReadPage() {
  const params = useParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const s = useStore();
  const id = decodeURIComponent(params?.id ?? '');

  const post = React.useMemo<Post | null>(() => {
    const found = app.posts.find((p) => p.id === id);
    if (found) return { ...found, heatScore: found.heatScore ?? heatFor(found, s as never) };
    /* a story can be linked before the wire has loaded: reconstruct it from
       the bundled Originals so the URL never dead-ends. */
    const o = ORIGINALS.find((a) => a.id === id);
    if (!o) return null;
    const u = getUser(o.author);
    const basic = {
      id: o.id,
      kind: 'forge' as const,
      origin: 'original' as const,
      authorHandle: o.author,
      authorName: u.name,
      authorAvatar: u.avatar,
      author: u,
      date: o.date,
      tags: o.tags,
      reactions: o.reactions ?? 0,
      comments: o.comments ?? 0,
      title: o.title,
      dek: o.dek,
      cover: o.cover,
      minutes: o.minutes,
      blocks: o.blocks,
    };
    return { ...basic, heatScore: heatFor(basic as never, s as never) } as Post;
  }, [id, app.posts, s]);

  React.useEffect(() => {
    if (!post) router.replace('/feed');
  }, [post, router]);

  if (!post) return null;
  return (
    <ArticleReader
      post={post}
      onClose={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.replace('/feed');
      }}
    />
  );
}
