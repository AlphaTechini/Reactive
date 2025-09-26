import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['ethers', 'plotly.js-dist-min']
  }
});
