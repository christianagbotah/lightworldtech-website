import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lightworld Technologies Limited',
    short_name: 'Lightworld',
    description: 'Software, apps, enterprise systems, AI automation, cloud, training and technology consultancy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050b10',
    theme_color: '#34d399',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
