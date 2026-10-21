import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AUDIT/WEB — Interface Inspection Workbench',
    short_name: 'AUDIT/WEB',
    description:
      'Independent interface inspection. Measure accessibility, experience, visual hierarchy, typography, colors, and metadata.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f1eee5',
    theme_color: '#12130c',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
