import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signals',
  description: 'What came back on the things you put into the room.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
