import tailwindcss from '@tailwindcss/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Vite config: tailwind + sveltekit + devtools JSON. Removed legacy svelte-notifications tweaks.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson()
	],
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Split large dependencies into separate chunks
					if (id.includes('node_modules')) {
						if (id.includes('ethers')) return 'ethers';
						if (id.includes('uniswap')) return 'uniswap';
						if (id.includes('plotly')) return 'plotly';
						if (id.includes('helia')) return 'helia';
						return 'vendor';
					}
				}
			}
		}
	}
});
