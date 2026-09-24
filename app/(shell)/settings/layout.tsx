import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Reading, motion and identity — everything local, nothing leaving your device.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
