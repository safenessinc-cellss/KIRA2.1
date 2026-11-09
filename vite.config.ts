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
        includeAssets: ['manifest.webmanifest', 'assets/kira-logo.png'],
        manifest: false,
        scope: '/',
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ""),
    },
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
