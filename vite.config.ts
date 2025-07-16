import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'QR & Barcode Scanner',
        short_name: 'QRScanner',
        description: 'A progressive web app for scanning QR codes and barcodes',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true
              }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries
            'react-vendor': ['react', 'react-dom'],
            // Scanner library (heavy)
            'scanner-vendor': ['react-zxing'],
            // PWA libraries
            'pwa-vendor': ['workbox-window']
          }
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000
    }
  })
