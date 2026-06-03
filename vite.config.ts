import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Vercel production 배포에서만 false (데모 데이터 등 개발용 기능 숨김)
// preview(dev 브랜치)·로컬에서는 true
const demoEnabled = process.env.VERCEL_ENV !== 'production'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DEMO_ENABLED__: JSON.stringify(demoEnabled),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Repia',
        short_name: 'Repia',
        description: '트레이너와 개인 운동을 위한 기록 앱',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
