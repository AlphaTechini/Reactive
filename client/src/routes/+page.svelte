<script>
	import { onMount } from 'svelte';
	import { walletAddress, walletBalance, walletService } from '$lib/stores/wallet.js';
	import { portfolios, portfoliosLoading, fetchPortfolios } from '$lib/stores/portfolios.js';
	import { goto } from '$app/navigation';
	
	onMount(async () => {
		console.log('🏠 Landing page mounted');
		// Fetch user's portfolios from backend when wallet is connected
		if ($walletAddress) {
			console.log('👛 Wallet connected, fetching portfolios...');
			await fetchPortfolios();
		}
	});
	
	// Watch for wallet connection changes and fetch portfolios
	$effect(() => {
		if ($walletAddress) {
			console.log('👛 Wallet address changed, fetching portfolios...');
			fetchPortfolios();
		}
	});
	
	function createPortfolio() {
		goto('/create-portfolio');
	}
	
	function viewPortfolio(portfolioId) {
		goto(`/portfolio/${portfolioId}`);
	}
	
	function goToDashboard() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Home - Reactive Portfolio Manager</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Hero Section -->
		<div class="text-center mb-12">
			<h1 class="text-5xl font-bold text-gray-900 dark:text-white mb-4">
				Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Reactive Portfolio</span>
			</h1>
			<p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
				Automated portfolio management on the Reactive Network
			</p>
			
			<!-- Wallet Info Card -->
			<div class="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
				<div class="flex items-center justify-between mb-6">
					<div class="text-left">
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Connected Wallet</p>
						<p class="text-lg font-mono font-semibold text-gray-900 dark:text-white">
							{walletService.formatAddress($walletAddress)}
						</p>
					</div>
					<div class="text-right">
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">
							{walletService.formatBalance($walletBalance)} REACT
						</p>
					</div>
				</div>
				
				<!-- Action Buttons -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<button
						onclick={createPortfolio}
						class="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create Portfolio
					</button>
					
					<button
						onclick={() => goto('/portfolios')}
						class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-xl transition-all"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						My Portfolios
					</button>
					
					<button
						onclick={goToDashboard}
						class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-xl transition-all"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						View Dashboard
					</button>
				</div>
			</div>
		</div>
		
		<!-- Portfolios Section -->
		<div class="mb-12">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">Your Portfolios</h2>
				{#if $portfolios.length > 0}
					<div class="flex items-center gap-3">
						<button
							onclick={() => goto('/portfolios')}
							class="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
							</svg>
							View All
						</button>
						<button
							onclick={createPortfolio}
							class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							New Portfolio
						</button>
					</div>
				{/if}
			</div>
			
			{#if $portfoliosLoading}
				<div class="flex items-center justify-center py-12">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			{:else if $portfolios.length === 0}
				<!-- Empty State -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
					<div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
						<svg class="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Portfolios Yet</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
						Create your first portfolio to start automated trading with custom risk management and rebalancing strategies.
					</p>
					<button
						onclick={createPortfolio}
						class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create Your First Portfolio
					</button>
				</div>
			{:else}
				<!-- Portfolio Grid -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each $portfolios as portfolio}
						<button
							onclick={() => viewPortfolio(portfolio.id)}
							class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 text-left"
						>
							<div class="flex items-start justify-between mb-4">
								<div>
									<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
										{portfolio.name}
									</h3>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{portfolio.description || 'No description'}
									</p>
								</div>
								<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
									<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
									</svg>
								</div>
							</div>
							
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-sm text-gray-500 dark:text-gray-400">Balance</span>
									<span class="text-lg font-bold text-gray-900 dark:text-white">
										{portfolio.balance || '0'} REACT
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-sm text-gray-500 dark:text-gray-400">Performance</span>
									<span class="text-sm font-semibold" class:text-green-600={portfolio.performance >= 0} class:text-red-600={portfolio.performance < 0}>
										{portfolio.performance >= 0 ? '+' : ''}{portfolio.performance || 0}%
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-sm text-gray-500 dark:text-gray-400">Assets</span>
									<span class="text-sm font-medium text-gray-900 dark:text-white">
										{portfolio.assetCount || 0} tokens
									</span>
								</div>
							</div>
							
							<div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
								<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
									<span>Created {new Date(portfolio.createdAt).toLocaleDateString()}</span>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
		
		<!-- Features Section -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
				<div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Risk Management</h3>
				<p class="text-gray-600 dark:text-gray-400 text-sm">
					Set stop-loss, take-profit, and auto-buy thresholds to protect your investments
				</p>
			</div>
			
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
				<div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Auto-Rebalancing</h3>
				<p class="text-gray-600 dark:text-gray-400 text-sm">
					Maintain your target allocation automatically with smart rebalancing
				</p>
			</div>
			
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
				<div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Reactive Network</h3>
				<p class="text-gray-600 dark:text-gray-400 text-sm">
					Built on Reactive Network for fast, automated, and decentralized trading
				</p>
			</div>
		</div>
	</div>
</div>
