<script>
	import '../../app.css';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let theme = $state('dark');
	
	onMount(() => {
		// Initialize theme from localStorage or system preference
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			theme = savedTheme;
		} else {
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		updateTheme();
	});
	
	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		updateTheme();
	}
	
	function updateTheme() {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		localStorage.setItem('theme', theme);
	}
</script>

<svelte:head>
	<title>Reactive Portfolio - Intelligent Automated Trading</title>
</svelte:head>

<!-- Theme Toggle Button (Fixed Position) -->
<button
	onclick={toggleTheme}
	class="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg"
	aria-label="Toggle theme"
>
	{#if theme === 'dark'}
		<svg class="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
			<path d="M5.64 17l-.71.71a1 1 0 001.41 1.41l.71-.71a1 1 0 00-1.41-1.41zM5 12a1 1 0 001-1V9a1 1 0 00-2 0v2a1 1 0 001 1zm7-7a1 1 0 001-1V2a1 1 0 00-2 0v2a1 1 0 001 1zM5.64 7.05a1 1 0 00.7.29 1 1 0 00.71-1.71l-.71-.7A1 1 0 104.93 6.34l.71.71zM17 11a1 1 0 001 1 1 1 0 001-1V9a1 1 0 00-2 0zm-5 8a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6.36-2.05a1 1 0 00-1.41 1.41l.71.71a1 1 0 001.41-1.41zM12 6.5A5.5 5.5 0 1017.5 12 5.51 5.51 0 0012 6.5z"/>
		</svg>
	{:else}
		<svg class="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
			<path d="M21.64 13a1 1 0 00-1.05-.14 8.05 8.05 0 01-3.37.73A8.15 8.15 0 019.08 5.49a8 8 0 01.25-2A1 1 0 009 2.36 10.14 10.14 0 1022 14a1 1 0 00-.36-1z"/>
		</svg>
	{/if}
</button>

{@render children?.()}
