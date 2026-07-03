import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tandyr',
    short_name: 'Tandyr',
    description: 'Управление сменами пекарни',
    start_url: '/employee',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#E8564A',
    background_color: '#F9FAFB',
    lang: 'ru',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
