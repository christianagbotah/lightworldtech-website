import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lightworld Technologies Ltd',
    short_name: 'Lightworld',
    description: 'Software, apps, enterprise systems, AI automation, cloud, training and technology consultancy.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#050b10',
    theme_color: '#34d399',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'technology'],
    shortcuts: [
      {
        name: 'Services',
        short_name: 'Services',
        description: 'Explore Lightworld technology services.',
        url: '/services',
      },
      {
        name: 'Products',
        short_name: 'Products',
        description: 'Explore Lightworld product directions.',
        url: '/products',
      },
      {
        name: 'Contact',
        short_name: 'Contact',
        description: 'Start a project conversation with Lightworld.',
        url: '/contact',
      },
    ],
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
