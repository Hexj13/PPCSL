import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kupito - Автомобили во Македонија',
    short_name: 'Kupito',
    description: 'Купете или продадете авто на Kupito!',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#3b82f6',
    icons: [],
    categories: ['automotive', 'shopping', 'marketplace'],
    lang: 'mk',
    dir: 'ltr',
    orientation: 'portrait',
  };
}
