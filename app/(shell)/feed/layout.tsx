import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The board',
  description: 'Ranked by heat: what people responded to, faded by age, with no scoreboard attached to anyone.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
