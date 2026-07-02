cat > vite.config.ts << 'EOF'
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(), // ✅ Plugin do Tailwind CSS
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'KIRA.COACH · Bienestar Proactivo con IA',
          short_name: 'KIRA',
          description: 'Libera el espacio mental con inteligencia anticipatoria y coaching adaptativo.',
          theme_color: '#1B4D5D',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
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
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}']
        }
      })
    ],
    define: {
      'process.env': {
        GEMINI_API_KEY: JSON.stringify(env.GEMINI_API_KEY || ''),
        FIREBASE_API_KEY: JSON.stringify(env.FIREBASE_API_KEY || ''),
        FIREBASE_PROJECT_ID: JSON.stringify(env.FIREBASE_PROJECT_ID || '')
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
        '@styles': path.resolve(__dirname, 'src/styles')
      },
      dedupe: ['react', 'react-dom', 'react-is']
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      sourcemap: !isProduction,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto'
      },
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: function(id) {
            if (id.includes('react') || id.includes('react-is') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules')) {
              return 'vendor-libs';
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-is',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        '@google/generative-ai',
        'lucide-react',
        'recharts',
        'html2canvas',
        'jspdf',
        'motion'
      ],
      force: true,
      entries: ['src/main.tsx']
    },
    server: {
      port: 5173,
      strictPort: false,
      open: false
    },
    preview: {
      port: 4173,
      strictPort: false,
      open: false
    }
  };
});
EOF
