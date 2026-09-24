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
    default: 'heatt — a room, not a feed',
    template: '%s · heatt',
  },
  description:
    'heatt is a black, reading-first room: short notes that grow into full stories, a reader that never redirects you, and a share worth sending.',
  openGraph: {
    title: 'heatt — a room, not a feed',
    description:
      'Short notes and full stories in one black room. Read, heat what matters, keep it, send it.',
    type: 'website',
    images: [{ url: '/art/nocturne-ui.jpg', width: 1200, height: 627, alt: 'heatt — a black editorial room' }],
    siteName: 'heatt',
  },
  twitter: { card: 'summary_large_image', title: 'heatt — a room, not a feed', description: 'Short notes and full stories in one black room.' },
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
  themeColor: '#06070A',
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
