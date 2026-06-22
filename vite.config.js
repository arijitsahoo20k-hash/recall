import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Recall',
        short_name: 'Recall',
        description: 'Premium spaced repetition & revision planner for serious students',
        theme_color: '#0A0A0F',
        background_color: '#0A0A0F',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: '/icons/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
        ],
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Today\'s Revisions',
            short_name: 'Today',
            description: 'View today\'s revision tasks',
            url: '/dashboard',
            icons: [{ src: '/icons/favicon-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'Add Chapter',
            short_name: 'Add',
            description: 'Add a new chapter',
            url: '/chapters/new',
            icons: [{ src: '/icons/favicon-96x96.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
