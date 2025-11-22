<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { walletService, walletConnected, networkCorrect } from '$lib/stores/wallet.js';
	import { appMode } from '$lib/stores/appMode.js';
	import { priceService } from '$lib/priceService.js';
	import { globalRefreshingStore } from '$lib/stores/globalStorage.js';
	import WalletConnection from '$lib/components/WalletConnection.svelte';
	import NavigationSidebar from '$lib/components/NavigationSidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { Toaster } from 'svelte-hot-french-toast';
	import { notify } from '$lib/notify.js';
	
	let sidebarOpen = $state(false); let { children } = $props();
	let lastMode = $appMode;
	let initializingServices = $state(true);
	let autoSwitchAttempted = $state(false); // Track if we've already tried auto-switching
	
	onMount(async () => {
		console.log('🚀 Initializing app services (parallel)...');

		// Start wallet and price initialization in parallel to avoid blocking UI
		const walletPromise = walletService.init();
		const pricePromise = priceService.initialize();

		// Short timeout to avoid long blocking if wallet provider is slow or not present
		const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

		// Wait for price service to finish and wait a short time for wallet init (e.g. 4s)
		try {
			await Promise.race([
				Promise.allSettled([pricePromise, walletPromise]),
				timeout(4000)
			]);
		} catch (e) {
			console.warn('Service initialization race encountered an error:', e);
		}

		// Do NOT await pricePromise here so UI becomes interactive immediately.
		// Price service will continue initializing in background and update stores when ready.
		initializingServices = false;
		console.log('✅ App services initialization started (UI now interactive)');
	});
	
	// Handle mode changes with network auto-switching and service reinitialization
	$effect(() => {
		if ($appMode !== lastMode && lastMode) {
			const previousMode = lastMode;
			lastMode = $appMode;
			
			console.log(`🔄 Mode changed from ${previousMode} to ${$appMode}`);
			
			// Reset auto-switch attempt tracking when switching modes
			autoSwitchAttempted = false;
			
			// Always check network status after mode change
			if ($walletConnected) {
				walletService.checkNetwork();
			}
		}
	});
	
	// Auto-switch to Reactive Network when entering live mode (only once)
	$effect(() => {
		if ($appMode === 'live' && $walletConnected && !$networkCorrect && !autoSwitchAttempted) {
			autoSwitchAttempted = true;
			console.log('🔗 Auto-switching to Reactive Network for live mode...');
			
			walletService.switchToReactiveNetwork().then(success => {
				if (success) {
					notify.success('Connected to Reactive Network for live trading');
				} else {
					console.log('Auto-switch failed, user will see manual option');
				}
			});
		}
	});
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
		<NavigationSidebar bind:open={sidebarOpen} />
		<div class="flex-1 overflow-hidden">
			{#if initializingServices}
				<div class="flex items-center justify-center min-h-screen p-4">
					<div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
						<div class="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
							<svg class="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
						<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Initializing Services</h2>
						<p class="text-gray-600 dark:text-gray-400 mb-4">Loading wallet and price services...</p>
						{#if $globalRefreshingStore}
							<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
								<div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 60%"></div>
							</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Fetching latest prices...</p>
						{/if}
					</div>
				</div>
			{:else if !$networkCorrect && $appMode === 'live' && autoSwitchAttempted && $walletConnected}
				<div class="flex items-center justify-center min-h-screen p-4"><div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center"><div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center"><svg class="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Manual Network Switch Required</h2><p class="text-gray-600 dark:text-gray-400 mb-4">Automatic switch to Reactive Network failed. Please switch manually to continue.</p><button onclick={()=> walletService.switchToReactiveNetwork()} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-2">Switch to Reactive Network</button><p class="text-xs text-gray-500 dark:text-gray-400">Or switch to Simulation mode to use any network</p></div></div>
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
