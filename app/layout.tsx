import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { BootLayer } from '@/components/boot/BootLayer';
import { ShellProviders } from '@/components/boot/ShellProviders';

export const metadata: Metadata = {
  metadataBase: new URL('https://heatt.app'),
  title: {
    default: 'heatt — where ideas burn',
    template: '%s · heatt',
  },
  description:
    'heatt is a hybrid microblogging and long-form platform: sparks and forges in one feed, heat-driven ranking, and full articles you read without ever leaving.',
  openGraph: {
    title: 'heatt — where ideas burn',
    description:
      'Sparks and long-form forges in a single feed. Heat instead of likes. Read everything in-app.',
    type: 'website',
    images: [{ url: '/art/hero-forge.jpg', width: 1200, height: 627, alt: 'heatt — short sparks and full-length forges' }],
    siteName: 'heatt',
  },
  twitter: { card: 'summary_large_image', title: 'heatt — where ideas burn', description: 'Spark + forge, heat-ranked, read in-app.' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050505',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ember" data-density="normal" data-measure="normal" data-serif="true" data-reduce-motion="false">
      <head>
        <link rel="preconnect" href="https://dev.to" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media2.dev.to" crossOrigin="anonymous" />
      </head>
      <body className="ht-grain antialiased">
        <ShellProviders>
          <div className="relative min-h-[100dvh] bg-[var(--ht-void)]">
            <BootLayer>{children}</BootLayer>
          </div>
        </ShellProviders>
      </body>
    </html>
  );
}
