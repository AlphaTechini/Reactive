import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Output directory for Vercel
			// Vercel will automatically detect and deploy from .vercel/output
		})
	}
};

export default config;
