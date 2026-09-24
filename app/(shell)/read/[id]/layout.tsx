import type { Metadata } from 'next';
import { ORIGINALS } from '@/lib/seed/articles';
import { SYNDICATED } from '@/lib/seed/syndicated';

/**
 * A shared story has to look like something worth tapping in a chat window,
 * so the title, standfirst and artwork are resolved on the server before the
 * reader (a client component) ever mounts.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const key = decodeURIComponent(id ?? '');

  const original = ORIGINALS.find((a) => a.id === key);
  const syndicated = original ? undefined : SYNDICATED.find((s) => `dev-${s.id}` === key);

  if (original) {
    return {
      title: original.title,
      description: original.dek,
      alternates: { canonical: `/read/${original.id}` },
      openGraph: {
        type: 'article',
        title: original.title,
        description: original.dek,
        url: `/read/${original.id}`,
        images: original.cover ? [{ url: original.cover, width: 1200, height: 675, alt: original.title }] : undefined,
      },
      twitter: { card: 'summary_large_image', title: original.title, description: original.dek },
    };
  }

  if (syndicated) {
    return {
      title: syndicated.title,
      description: syndicated.excerpt,
      alternates: { canonical: syndicated.canonical },
      openGraph: {
        type: 'article',
        title: syndicated.title,
        description: syndicated.excerpt,
        url: `/read/dev-${syndicated.id}`,
        images: syndicated.cover ? [{ url: syndicated.cover, alt: syndicated.title }] : undefined,
      },
      twitter: { card: 'summary_large_image', title: syndicated.title, description: syndicated.excerpt },
    };
  }

  return {
    title: 'Story not found',
    description: 'That piece is not in the room.',
    robots: { index: false, follow: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
