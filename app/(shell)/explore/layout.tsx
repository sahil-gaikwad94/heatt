import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Search every story, note, writer and topic in the room.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
