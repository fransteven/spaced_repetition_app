import type { MetadataRoute } from 'next';

// Installing the app ("Add to Home Screen") is the only way to read without
// browser bars on iPhone, where Safari has no Fullscreen API for pages.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NeuroCards',
    short_name: 'NeuroCards',
    description: 'Spaced repetition flashcards and an EPUB reader, powered by FSRS 4.5',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [{ src: '/icon.png?v=neurocards-1', sizes: '512x512', type: 'image/png' }],
  };
}
