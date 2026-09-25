import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages · heatt',
  description: 'Direct messaging and real-time community chat on heatt.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
