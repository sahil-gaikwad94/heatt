import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Library',
  description: 'What you kept, and what you left half-read — stored on this device.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
