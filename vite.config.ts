import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves from /cycle-vault/, but a Capacitor iOS build loads
// assets from the app bundle root. `npm run build:ios` sets CAP_BUILD=1 so the
// native build uses base '/'; the default (Pages) build keeps '/cycle-vault/'.
const isCapacitorBuild = process.env.CAP_BUILD === '1';

export default defineConfig({
  base: isCapacitorBuild ? '/' : '/cycle-vault/',
  plugins: [
    react(),
    tailwindcss(),
    // The PWA service worker is for the web/GitHub Pages deployment only. In a
    // Capacitor native build the assets are already local, and a SW only risks
    // stale caching inside the webview — so skip it for CAP_BUILD.
    ...(isCapacitorBuild
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            },
            manifest: {
              name: 'cycle vault',
              short_name: 'cycle vault',
              start_url: '/cycle-vault/',
              display: 'standalone',
              background_color: '#0A0A0A',
              theme_color: '#0A0A0A',
              orientation: 'portrait',
              icons: [
                { src: 'icon.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon.png', sizes: '512x512', type: 'image/png' },
              ],
            },
          }),
        ]),
  ],
});
