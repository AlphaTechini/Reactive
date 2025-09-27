<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { walletService, walletConnected, networkCorrect } from '$lib/stores/wallet.js';
	import WalletConnection from '$lib/components/WalletConnection.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { Toaster } from 'svelte-hot-french-toast';
	let sidebarOpen=false; let { children } = $props();
	onMount(()=> { walletService.init(); });
	function toggleSidebar(){ sidebarOpen = !sidebarOpen; }
</script>
<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Reactive Portfolio Manager</title>
	<meta name="description" content="Automated Trading Portfolio dApp on Reactive Network" />
</svelte:head>
<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<Toaster position="top-right" />
	<Header {toggleSidebar} />
	<div class="flex">
		<Sidebar bind:open={sidebarOpen} />
		<div class="flex-1 overflow-hidden">
			{#if !$walletConnected}
				<div class="flex items-center justify-center min-h-screen p-4"><WalletConnection /></div>
			{:else if !$networkCorrect}
				<div class="flex items-center justify-center min-h-screen p-4"><div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center"><div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center"><svg class="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Wrong Network</h2><p class="text-gray-600 dark:text-gray-400 mb-4">Please switch to Reactive Network to continue</p><button on:click={()=> walletService.switchToReactiveNetwork()} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">Switch to Reactive Network</button></div></div>
			{:else}
				<main class="p-4 lg:p-6">{@render children?.()}</main>
			{/if}
		</div>
	</div>
</div>
<style>
	:global(html){ scroll-behavior:smooth; }
	:global(body){ background:#0f172a; }
</style>
