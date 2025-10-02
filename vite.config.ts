import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EvPower Зарядные Станции',
        short_name: 'EvPower',
        description: 'Управление зарядкой электромобилей',
        theme_color: '#10B981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: 'kg.evpower.app',
        categories: ['utilities', 'transportation'],
        icons: [
          {
            src: 'icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'vite.svg',
            sizes: '512x512', 
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'vite.svg',
            sizes: '32x32',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        runtimeCaching: [
          // Charging and status endpoints - always from network
          {
            urlPattern: /^https:\/\/ocpp\.evpower\.kg\/api\/v1\/(charging|status)\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'no-cache',
            },
          },
          // General API endpoints - StaleWhileRevalidate for instant loading
          {
            urlPattern: /^https:\/\/ocpp\.evpower\.kg\/api\/.*/i,
            handler: 'StaleWhileRevalidate',
            method: 'GET',
            options: {
              cacheName: 'api-swr',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Supabase API - StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'StaleWhileRevalidate',
            method: 'GET',
            options: {
              cacheName: 'supabase-swr',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Payments - always from network
          {
            urlPattern: /^https:\/\/api\.dengi\.o\.kg\/.*/i,
            handler: 'NetworkOnly',
          },
          // Images - cache first
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'https://ocpp.evpower.kg',
        changeOrigin: true,
        secure: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@tanstack/react-query']
  },
}})