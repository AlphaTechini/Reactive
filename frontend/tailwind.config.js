/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			fontFamily: {
				display: ['Inter', 'ui-sans-serif', 'system-ui'],
				sans: ['Inter', 'ui-sans-serif', 'system-ui']
			},
			colors: {
				brand: {
					50: '#f0f7ff',
					100: '#e0efff',
					200: '#b9dfff',
					300: '#82c5ff',
					400: '#3ba7ff',
					500: '#0d8cf2',
					600: '#0070d0',
					700: '#0058a8',
					800: '#004a8a',
					900: '#00396b'
				}
			},
			boxShadow: {
				'soft': '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.1)',
				'elevated': '0 4px 12px -2px rgba(0,0,0,0.08),0 2px 4px -2px rgba(0,0,0,0.06)'
			},
			animation: {
				'fade-in': 'fadeIn 250ms ease-out',
				'scale-in': 'scaleIn 180ms ease-out'
			},
			keyframes: {
				fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
				scaleIn: { '0%': { opacity:0, transform: 'scale(.96)' }, '100%': { opacity:1, transform:'scale(1)' } }
			}
		}
	},
		// Make plugins optional so build doesn't fail if packages removed
		plugins: (function() {
			const list = [];
			try { list.push(require('@tailwindcss/forms')); } catch (e) { /* optional */ }
			try { list.push(require('@tailwindcss/typography')); } catch (e) { /* optional */ }
			return list;
		})()
};
