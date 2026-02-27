import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700, // Three.js core is ~600KB, lazy-loaded
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'vendor-three';
          if (id.includes('node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('node_modules/react-router-dom/')) return 'vendor-react';
          if (id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/@tsparticles/') || id.includes('node_modules/tsparticles')) return 'vendor-particles';
          if (id.includes('node_modules/chart.js/') || id.includes('node_modules/react-chartjs-2/')) return 'vendor-charts';
          if (id.includes('node_modules/react-leaflet/')) return 'vendor-react';
          if (id.includes('node_modules/leaflet/')) return 'vendor-maps';
        },
      },
    },
  },
})
