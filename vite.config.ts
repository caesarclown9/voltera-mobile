import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
        manifest: {
          name: "Voltera Зарядные Станции",
          short_name: "Voltera",
          description: "Управление зарядкой электромобилей",
          theme_color: "#10B981",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          id: "kg.voltera.app",
          categories: ["utilities", "transportation"],
          icons: [
            {
              src: "icons/manifest-icon-192.maskable.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigationPreload: true,
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}",
          ],
          // Очистка старых кешей при обновлении
          cleanupOutdatedCaches: true,
          // Пропускаем ожидание при активации нового SW
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            // Charging and status endpoints - always from network
            {
              urlPattern:
                /^https:\/\/ocpp\.voltera\.kg\/api\/v1\/(charging|status)\/.*/i,
              handler: "NetworkOnly",
              options: {
                cacheName: "no-cache",
              },
            },
            // General API endpoints - StaleWhileRevalidate for instant loading
            {
              urlPattern: /^https:\/\/ocpp\.voltera\.kg\/api\/.*/i,
              handler: "StaleWhileRevalidate",
              method: "GET",
              options: {
                cacheName: "api-swr",
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
              handler: "StaleWhileRevalidate",
              method: "GET",
              options: {
                cacheName: "supabase-swr",
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
              handler: "NetworkOnly",
            },
            // JSON / шрифты — StaleWhileRevalidate
            {
              urlPattern: /\.json$/,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "json-swr" },
            },
            {
              urlPattern: /\.(woff2?|ttf|otf)$/,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "fonts-swr" },
            },
            // Images - cache first
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "images-cache",
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
        "@": "/src",
      },
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 3000,
      hmr: {
        overlay: false,
      },
      proxy:
        process.env.NODE_ENV === "development"
          ? {
              "/api": {
                target: "https://ocpp.voltera.kg",
                changeOrigin: true,
                secure: true,
                // Пробрасываем все заголовки, включая Authorization
                configure: (proxy, _options) => {
                  proxy.on("proxyReq", (proxyReq, req, _res) => {
                    // Явно пробрасываем все нужные заголовки
                    // В Node.js заголовки всегда lowercase
                    const auth =
                      req.headers["authorization"] ||
                      req.headers["Authorization"];
                    if (auth) {
                      proxyReq.setHeader("Authorization", auth);
                    }
                    const idempKey =
                      req.headers["idempotency-key"] ||
                      req.headers["Idempotency-Key"];
                    if (idempKey) {
                      proxyReq.setHeader("Idempotency-Key", idempKey);
                    }
                  });
                },
              },
            }
          : undefined,
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
      exclude: ["@tanstack/react-query"],
    },
  };
});
