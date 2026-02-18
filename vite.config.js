import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-three': ['three'],
          'vendor-particles': ['@tsparticles/engine', '@tsparticles/react', '@tsparticles/slim'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
