import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/context/ThemeContext';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://auditweb.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AUDIT/WEB — Every interface leaves evidence.',
    template: '%s | AUDIT/WEB',
  },
  description:
    'Independent interface inspection workbench. Measure accessibility, experience, visual design, typography, colour and metadata straight from rendered live web pages. Evidence over opinion.',
  applicationName: 'AUDIT/WEB',
  authors: [{ name: 'Naphier', url: 'https://github.com/naphiertech' }],
  creator: 'Naphier (@naphiertech)',
  publisher: 'AUDIT/WEB',
  keywords: [
    'web audit',
    'interface inspection',
    'accessibility audit',
    'WCAG scanner',
    'UX analysis',
    'visual design score',
    'typography audit',
    'color contrast checker',
    'developer tool',
    'rendered evidence',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'AUDIT/WEB — Every interface leaves evidence.',
    description:
      'Independent interface inspection across 6 categories: Accessibility, Experience, Visual, Type, Colour, and Metadata. Rendered evidence over opinion.',
    url: '/',
    siteName: 'AUDIT/WEB',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AUDIT/WEB — Interface Inspection Workbench by Naphier',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AUDIT/WEB — Every interface leaves evidence.',
    description:
      'Independent interface inspection across 6 categories. Rendered evidence over opinion.',
    creator: '@naphiertech',
    site: '@naphiertech',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'developer',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1eee5' },
    { media: '(prefers-color-scheme: dark)', color: '#12130c' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'AUDIT/WEB',
      description:
        'Independent interface inspection workbench. Measure accessibility, experience, visual design, typography, colour and metadata — straight from the rendered page.',
      publisher: {
        '@type': 'Person',
        name: 'Naphier',
        url: 'https://github.com/naphiertech',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#application`,
      name: 'AUDIT/WEB',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      url: siteUrl,
      description:
        'Evidence-based web interface auditor measuring accessibility, UX, visual design, typography, colors, and metadata directly from rendered web pages.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      creator: {
        '@type': 'Person',
        name: 'Naphier',
        url: 'https://github.com/naphiertech',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ink)] antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
