import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  return {
    // ✅ Agregado: Base URL para despliegue
    base: '/',
    
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // ✅ Mejorado: Incluir todos los íconos necesarios
        includeAssets: [
          'favicon.ico',
          'favicon-32x32.png',
          'favicon-16x16.png',
          'apple-touch-icon.png',
          'maskable-icon.png',
          'og-image.jpg'
        ],
        manifest: {
          name: 'KIRA.COACH · Bienestar Proactivo con IA',
          short_name: 'KIRA',
          description: 'Libera el espacio mental con inteligencia anticipatoria y coaching adaptativo.',
          theme_color: '#1B4D5D',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          // ✅ Mejorado: Íconos específicos por tamaño
          icons: [
            {
              src: '/assets/kira-logo-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/assets/kira-logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/assets/kira-logo-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/assets/kira-logo-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        // ✅ Mejorado: Estrategias de caché Workbox
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-static-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
                }
              }
            },
            {
              urlPattern: /^https:\/\/firebase\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1 día
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 // 1 hora
                }
              }
            }
          ]
        }
      })
    ],
    
    // ✅ Mejorado: Variables de entorno más seguras
    define: {
      'process.env': {
        GEMINI_API_KEY: JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ""),
        FIREBASE_API_KEY: JSON.stringify(process.env.FIREBASE_API_KEY || env.FIREBASE_API_KEY || ""),
        FIREBASE_PROJECT_ID: JSON.stringify(process.env.FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || ""),
      }
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@styles': path.resolve(__dirname, 'src/styles'),
      },
    },
    
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      sourcemap: isProduction ? false : true, // ✅ Mejorado
      rollupOptions: {
        output: {
          // ✅ Mejorado: Nombres de chunks más descriptivos
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-animations';
              }
              if (id.includes('@google/generative-ai')) {
                return 'vendor-gemini';
              }
              return 'vendor-libs';
            }
          }
        }
      }
    },
    
    server: {
      // ✅ Mejorado: Solo desactivar HMR en producción
      hmr: isProduction ? false : {
        protocol: 'ws',
        host: 'localhost',
        port: 24678
      },
      ws: isProduction ? false : true,
      port: 5173,
      strictPort: false,
      open: false,
    },
    
    // ✅ Nuevo: Optimización de pre-carga
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        '@google/generative-ai',
        'lucide-react',
        'recharts'
      ]
    },
    
    // ✅ Nuevo: Previsualización en producción
    preview: {
      port: 4173,
      strictPort: false,
      open: false
    }
  };
});
