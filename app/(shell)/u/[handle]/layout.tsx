import type { Metadata } from 'next';
import { getUser } from '@/lib/seed/users';

/** A profile link should carry the writer's name and one line about them. */
export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const key = decodeURIComponent(handle ?? '');
  const user = getUser(key);
  const name = user.name || key;

  return {
    title: `${name} (@${user.handle})`,
    description: user.bio || `${name} writes on heatt.`,
    alternates: { canonical: `/u/${user.handle}` },
    openGraph: {
      type: 'profile',
      title: `${name} on heatt`,
      description: user.bio || `${name} writes on heatt.`,
      url: `/u/${user.handle}`,
      /* a profile without artwork still needs a picture in the card */
      images: [
        user.cover
          ? { url: user.cover, width: 1200, height: 675, alt: name }
          : { url: '/art/nocturne-ui.jpg', width: 1200, height: 627, alt: `${name} on heatt` },
      ],
    },
    twitter: { card: 'summary', title: `${name} on heatt`, description: user.bio || `${name} writes on heatt.` },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
