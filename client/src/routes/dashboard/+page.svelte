<script>
	import { onMount } from 'svelte';
	import { walletAddress, walletBalance } from '$lib/stores/wallet.js';
	import { portfolioBalance, portfolioLoading, refreshPortfolioBalance } from '$lib/stores/portfolio.js';
	import { globalPricesStore, globalRefreshingStore, globalLastUpdatedStore, globalDataSourceStore } from '$lib/stores/globalStorage.js';
	import { globalStorage } from '$lib/stores/globalStorage.js';
	import { formatPrice, formatChange, isValidPrice } from '$lib/utils/priceFormatter.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import { priceService } from '$lib/priceService.js';
	import PriceChart from '$lib/components/PriceChart.svelte';
	import PortfolioOverview from '$lib/components/PortfolioOverview.svelte';
	import ActiveSettings from '$lib/components/ActiveSettings.svelte';
	import QuickActions from '$lib/components/QuickActions.svelte';
	import EventsMonitor from '$lib/EventsMonitor.svelte';
	import StrategyDrawer from '$lib/components/StrategyDrawer.svelte';
	import DepositModal from '$lib/components/DepositModal.svelte';
	import PendingTransactions from '$lib/components/PendingTransactions.svelte';
	import RiskManagementUI from '$lib/components/RiskManagementUI.svelte';
	import AllocationManagementUI from '$lib/components/AllocationManagementUI.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	
	let selectedToken=null; 
	let portfolioChange=5.67; 
	let totalAssets=8; 
	let timeframe='1d';
	let depositOpen=false;
	let isManualRefreshing = false;
	let lastRefreshError = null;
	let showRefreshError = false;
	
	// Reactive token data from price service with null safety
	$: tokenPrice = selectedToken && $globalPricesStore?.[selectedToken.address];
	$: currentPrice = globalStorage.getPriceSafe(selectedToken?.address);
	$: priceChange = tokenPrice?.change24h ?? tokenPrice?.change ?? null;
	$: isPriceLoading = $globalRefreshingStore || !globalStorage.isPriceAvailable(selectedToken?.address);
	
	// Safe formatted values for display
	$: displayPrice = isValidPrice(currentPrice) ? formatPrice(currentPrice) : 'Loading...';
	$: displayChange = isValidPrice(priceChange) ? formatChange(priceChange) : 'N/A';
	
	// Safe portfolio balance formatting
	$: portfolioBalanceValue = parseFloat($portfolioBalance ?? '0');
	$: safePortfolioBalance = isValidPrice(portfolioBalanceValue) ? portfolioBalanceValue : 0;
	
	// Check if price data is stale (older than 5 minutes)
	$: priceAge = selectedToken ? globalStorage.getPriceAge(selectedToken.address) : null;
	$: isPriceStale = selectedToken ? globalStorage.isStale(selectedToken.address, 5 * 60 * 1000) : false;
	$: priceAgeMinutes = priceAge ? Math.floor(priceAge / 60000) : 0;
	
	// Data source indicator
	$: dataSource = $globalDataSourceStore || 'unknown';
	$: isUsingCachedData = dataSource === 'cache' || isPriceStale;
	
	// Manual refresh function with error handling
	async function handleManualRefresh() {
		if (isManualRefreshing || $globalRefreshingStore) {
			console.log('⏳ Refresh already in progress...');
			return;
		}
		
		isManualRefreshing = true;
		lastRefreshError = null;
		showRefreshError = false;
		
		try {
			console.log('🔄 Manual refresh triggered by user');
			await priceService.refreshAllPrices();
			console.log('✅ Manual refresh completed successfully');
		} catch (error) {
			console.error('❌ Manual refresh failed:', error);
			lastRefreshError = error.message || 'Failed to refresh prices';
			showRefreshError = true;
			
			// Auto-hide error after 5 seconds
			setTimeout(() => {
				showRefreshError = false;
			}, 5000);
		} finally {
			isManualRefreshing = false;
		}
	}
	
	// Update selected token when prices become available (avoid circular dependency)
	$: {
		const availablePrices = $globalPricesStore;
		const hasPricesData = availablePrices && Object.keys(availablePrices).length > 0;
		
		// Only set selectedToken if it's null and we have price data
		if (!selectedToken && hasPricesData) {
			const tokensWithPrices = INITIAL_TOKEN_LIST.filter(token => availablePrices[token.address]);
			
			if (tokensWithPrices.length > 0) {
				selectedToken = tokensWithPrices[0];
				console.log('🔄 Set initial token with price data:', selectedToken.symbol, selectedToken.address);
			}
		}
	}
	
	const DASHBOARD_STORAGE_KEY='reactive.dashboard.v1';
	const DASHBOARD_TIMEFRAME_LABELS=[ {key:'1h',label:'1H'},{key:'1d',label:'24H'},{key:'7d',label:'7D'},{key:'30d',label:'30D'} ];
	onMount(async()=>{ 
		try { 
			if(typeof localStorage!=='undefined'){ 
				const raw=localStorage.getItem(DASHBOARD_STORAGE_KEY); 
				if(raw){ 
					const parsed=JSON.parse(raw); 
					if(parsed?.timeframe && ['1h','1d','7d','30d'].includes(parsed.timeframe)) timeframe=parsed.timeframe; 
					if(parsed?.token?.symbol) selectedToken=parsed.token; 
				} 
			} 
		} catch(e){ 
			console.warn('Persisted dashboard state load failed', e);
		} 
		
		// Initialize price service regardless of wallet connection
		try { 
			const { enhancedPriceDisplayService } = await import('$lib/services/EnhancedPriceDisplayService.js'); 
			await enhancedPriceDisplayService.initialize();
			// Fetch initial prices
			await enhancedPriceDisplayService.fetchAllPrices();
			console.log('✅ Price service initialized and prices fetched');
		} catch(e){ 
			console.error('❌ Failed to initialize enhanced price display service:', e); 
		}
		
		const handleTokenSelection = e => { 
			selectedToken = e.detail; 
		}; 
		window.addEventListener('tokenSelected', handleTokenSelection); 
		
		// Set default token to one that has price data (simplified to avoid circular dependency)
		if(!selectedToken){ 
			// Use fallback token initially - the reactive statement will update it when prices load
			selectedToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'ETH') || INITIAL_TOKEN_LIST[0];
			console.log('⚠️ Set initial fallback token:', selectedToken.symbol);
		}
		
		return ()=> window.removeEventListener('tokenSelected', handleTokenSelection); 
	});
	$: (async()=>{ try { if(typeof localStorage!=='undefined'){ localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({ timeframe, token: selectedToken && { symbol:selectedToken.symbol, name:selectedToken.name, address:selectedToken.address, price:selectedToken.price, change:selectedToken.change } })); } } catch { /* ignore persistence errors */ } })();
</script>
<svelte:head><title>Dashboard - Reactive Portfolio Manager</title></svelte:head>
<Breadcrumb />
<div class="space-y-6" role="main" aria-label="Dashboard">
	<div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold mb-2">Portfolio Dashboard</h1>
				<p class="text-blue-100">Address: <span class="font-mono">{$walletAddress ?? 'Not connected'}</span></p>
			</div>
			<div class="text-right">
				<div class="text-3xl font-bold">
					{#if $portfolioLoading}
						<span class="animate-pulse">Loading...</span>
					{:else}
						{formatPrice(safePortfolioBalance, { decimals: 4, showCurrency: false })} REACT
					{/if}
				</div>
				<div class="flex items-center justify-end mt-1 gap-2">
					<span class="text-sm">Portfolio Balance</span>
					<button class="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors" on:click={()=> depositOpen=true}>
						Deposit
					</button>
				</div>
			</div>
		</div>
		
		<!-- Price refresh controls and status -->
		<div class="mt-4 pt-4 border-t border-blue-400/30 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Manual refresh button -->
				<button 
					class="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={handleManualRefresh}
					disabled={isManualRefreshing || $globalRefreshingStore}
					title="Manually refresh price data"
				>
					<svg 
						class="w-4 h-4" 
						class:animate-spin={isManualRefreshing || $globalRefreshingStore}
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					<span class="text-sm">
						{#if isManualRefreshing || $globalRefreshingStore}
							Refreshing...
						{:else}
							Refresh Prices
						{/if}
					</span>
				</button>
				
				<!-- Staleness indicator -->
				{#if isUsingCachedData && !$globalRefreshingStore}
					<div class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 rounded-lg" title="Using cached data">
						<svg class="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-xs text-yellow-100">
							{#if isPriceStale}
								Cached ({priceAgeMinutes}m old)
							{:else}
								Using cached data
							{/if}
						</span>
					</div>
				{/if}
				
				<!-- Error indicator -->
				{#if showRefreshError && lastRefreshError}
					<div class="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 rounded-lg" title={lastRefreshError}>
						<svg class="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-xs text-red-100">Refresh failed</span>
					</div>
				{/if}
			</div>
			
			<!-- Last updated timestamp -->
			<div class="text-xs text-blue-200">
				{#if $globalLastUpdatedStore}
					Last updated: {new Date($globalLastUpdatedStore).toLocaleTimeString()}
				{:else}
					No price data yet
				{/if}
			</div>
		</div>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"><div class="flex items-center"><div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg></div><div class="ml-4"><p class="text-sm font-medium text-gray-500 dark:text-gray-400">Portfolio Balance</p><p class="text-2xl font-bold text-gray-900 dark:text-white">{#if $portfolioLoading}<span class="animate-pulse text-sm">Loading...</span>{:else}{formatPrice(safePortfolioBalance, { decimals: 4, showCurrency: false })} REACT{/if}</p><button class="mt-1 text-xs text-blue-600 hover:underline" on:click={refreshPortfolioBalance} disabled={$portfolioLoading}>Refresh</button></div></div></div>
		<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"><div class="flex items-center"><div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div><div class="ml-4"><p class="text-sm font-medium text-gray-500 dark:text-gray-400">Active Assets</p><p class="text-2xl font-bold text-gray-900 dark:text-white">{totalAssets}</p></div></div></div>
		<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"><div class="flex items-center"><div class="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div><div class="ml-4"><p class="text-sm font-medium text-gray-500 dark:text-gray-400">24h Change</p><p class="text-2xl font-bold" class:text-green-600={portfolioChange>=0} class:text-red-600={portfolioChange<0}>{portfolioChange>=0?'+':''}{portfolioChange}%</p></div></div></div>
	</div>
	<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
		<div class="xl:col-span-2"><div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"><div class="flex items-center justify-between mb-4">				<div><h2 class="text-lg font-semibold text-gray-900 dark:text-white">{selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : 'Select a token'}</h2>{#if selectedToken}<div class="flex items-center mt-1">{#if isPriceLoading}<span class="text-2xl font-bold text-gray-500 dark:text-gray-400 animate-pulse">Loading...</span>{:else}<span class="text-2xl font-bold text-gray-900 dark:text-white">{displayPrice}</span>{#if priceChange !== null}<span class="ml-2 text-sm font-medium px-2 py-1 rounded-full" class:bg-green-100={priceChange>=0} class:text-green-800={priceChange>=0} class:bg-red-100={priceChange<0} class:text-red-800={priceChange<0}>{displayChange}</span>{/if}{/if}</div>					<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{#if $globalRefreshingStore}Fetching live price...{:else if $globalLastUpdatedStore}Last updated: {new Date($globalLastUpdatedStore).toLocaleTimeString()}{:else}Price from global storage{/if}</div>{/if}</div><div class="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 p-1" role="radiogroup" aria-label="Timeframe selector">{#each DASHBOARD_TIMEFRAME_LABELS as tf (tf.key)}<button type="button" on:click={()=> timeframe=tf.key} role="radio" aria-checked={timeframe===tf.key} aria-label={`${tf.label} timeframe`} class="px-3 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" class:bg-white={timeframe===tf.key} class:text-gray-900={timeframe===tf.key} class:dark:bg-gray-900={timeframe===tf.key} class:dark:text-white={timeframe===tf.key} class:text-gray-500={timeframe!==tf.key} class:hover:text-gray-700={timeframe!==tf.key} class:dark:text-gray-300={timeframe!==tf.key} class:dark:hover:text-gray-100={timeframe!==tf.key}>{tf.label}</button>{/each}</div></div><div class="h-80"><PriceChart {selectedToken} {timeframe} /></div></div></div>
		<div class="space-y-6"><PendingTransactions /><ActiveSettings /><QuickActions /><RiskManagementUI {selectedToken} compact={true} /><AllocationManagementUI currentPortfolioValue={safePortfolioBalance} compact={true} /><StrategyDrawer {selectedToken} automationAddress={null} /></div>
	</div>
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><PortfolioOverview /><div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"><h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3><div class="space-y-4"><div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><div class="flex items-center"><div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3"><svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg></div><div><p class="text-sm font-medium text-gray-900 dark:text-white">Stop-loss Updated</p><p class="text-xs text-gray-500 dark:text-gray-400">Set to 15% for ETH</p></div></div><span class="text-xs text-gray-500 dark:text-gray-400">2 min ago</span></div><div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"><div class="flex items-center"><div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3"><svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg></div><div><p class="text-sm font-medium text-gray-900 dark:text-white">Portfolio Rebalanced</p><p class="text-xs text-gray-500 dark:text-gray-400">ETH: 60%, BTC: 40%</p></div></div><span class="text-xs text-gray-500 dark:text-gray-400">1 hour ago</span></div><div class="flex items-center justify-between py-2"><div class="flex items-center"><div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mr-3"><svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></div><div><p class="text-sm font-medium text-gray-900 dark:text-white">Take-profit Set</p><p class="text-xs text-gray-500 dark:text-gray-400">25% for LINK position</p></div></div><span class="text-xs text-gray-500 dark:text-gray-400">3 hours ago</span></div></div></div></div>
	<div class="mt-8"><EventsMonitor maxEvents={10} /></div>
</div>
{#if depositOpen}
	<DepositModal bind:isOpen={depositOpen} on:deposited={()=> { refreshPortfolioBalance(); }} />
{/if}
