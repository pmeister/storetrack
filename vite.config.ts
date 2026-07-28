import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'StoreTrack',
        short_name: 'StoreTrack',
        description: 'Shopping lists by store, plus pantry tracking',
        display: 'standalone',
        start_url: '/',
        theme_color: '#059669',
        background_color: '#f8fafc',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // Data freshness is TanStack Query's job; never let the SW touch Supabase.
        navigateFallbackDenylist: [/^https:\/\/.*\.supabase\.co/],
      },
    }),
  ],
})
