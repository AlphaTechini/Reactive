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
    // No custom optimizeDeps/ssr entries needed after migration to svelte-hot-french-toast
});
