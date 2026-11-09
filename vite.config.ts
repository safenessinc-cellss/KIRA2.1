import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['assets/kira-logo.png', 'firebase-messaging-sw.js', 'icons/kira.svg'],
        manifest: {
          name: 'KIRA Coach',
          short_name: 'KiraCoach',
          description: 'Ecosistema de Bienestar y Coaching Integral - SAFENESS.INC',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#1B4D5D',
          lang: 'es',
          icons: [
            {
              src: '/icons/kira.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            { name: 'Abrir KIRA', short_name: 'KIRA', url: '/', icons: [{ src: '/icons/kira.svg', sizes: 'any', type: 'image/svg+xml' }] }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/firebase-messaging-sw\.js$/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'kira-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 2592000 } }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/i,
              handler: 'CacheFirst',
              options: { cacheName: 'kira-images', expiration: { maxEntries: 100, maxAgeSeconds: 604800 } }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      sourcemap: false,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
      ws: false,
    },
  };
});
