<script>
	import { onMount } from 'svelte';
	import { 
		simulationBalance, 
		simulationPortfolios, 
		totalPortfolioValue,
		overallProfitLoss,
		portfolioCount,
		updatePortfolioPrices,
		startPriceUpdates
	} from '$lib/stores/simulation';
	import { globalPricesStore } from '$lib/stores/globalStorage.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import priceService from '$lib/priceService.js';

	// Initialize price updates on mount
	onMount(async () => {
		// Ensure price service is initialized
		if (!priceService.isInitialized) {
			await priceService.initialize();
		}
		
		// Start price updates for all portfolios
		startPriceUpdates();
	});

	// Update simulation prices when global prices change
	$: if ($globalPricesStore) {
		// Convert price store format to simulation format
		const prices = {};
		for (const [address, data] of Object.entries($globalPricesStore)) {
			const token = INITIAL_TOKEN_LIST.find(t => t.address === address);
			if (token) {
				prices[token.symbol] = data.price;
			}
		}
		// Update portfolio prices
		if (Object.keys(prices).length > 0) {
			updatePortfolioPrices(prices);
		}
	}

	// Convert portfolios object to array for easier iteration
	$: portfolioList = Object.values($simulationPortfolios || {});
	
	// Format currency
	function formatCurrency(value) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}
	
	// Format date
	function formatDate(timestamp) {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Dashboard - Simulation Mode</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
		<!-- Account Summary -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-2xl">
			<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
				<span class="text-2xl">📊</span>
				Account Summary
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div class="group p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:scale-105 hover:shadow-lg">
					<span class="block text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">Available Balance</span>
					<span class="block text-2xl font-bold text-blue-900 dark:text-blue-100 transition-colors">{formatCurrency($simulationBalance)}</span>
				</div>
				<div class="group p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 transition-all duration-200 hover:scale-105 hover:shadow-lg">
					<span class="block text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-2">Total Portfolio Value</span>
					<span class="block text-2xl font-bold text-purple-900 dark:text-purple-100 transition-colors">{formatCurrency($totalPortfolioValue)}</span>
				</div>
				<div class="group p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all duration-200 hover:scale-105 hover:shadow-lg">
					<span class="block text-xs font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">Total Account Value</span>
					<span class="block text-2xl font-bold text-indigo-900 dark:text-indigo-100 transition-colors">{formatCurrency($simulationBalance + $totalPortfolioValue)}</span>
				</div>
				<div class="group p-4 bg-gradient-to-br from-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-50 to-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-100 dark:from-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-900/20 dark:to-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-800/20 rounded-xl border border-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-200 dark:border-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-800 transition-all duration-200 hover:scale-105 hover:shadow-lg">
					<span class="block text-xs font-medium text-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-700 dark:text-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-300 uppercase tracking-wider mb-2">Overall P/L</span>
					<span class="block text-2xl font-bold text-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-900 dark:text-{$overallProfitLoss.absolute >= 0 ? 'green' : 'red'}-100 transition-colors">
						{$overallProfitLoss.absolute >= 0 ? '+' : ''}{formatCurrency($overallProfitLoss.absolute)}
						<span class="block text-sm opacity-80">({$overallProfitLoss.percentage.toFixed(2)}%)</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Portfolios Section -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-2xl">
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
					<span class="text-2xl">💼</span>
					My Portfolios ({$portfolioCount})
				</h2>
				<a 
					href="/simulated/create-portfolio" 
					class="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
					title="Create a new portfolio"
				>
					<span class="text-xl transition-transform duration-200 group-hover:rotate-90">➕</span>
					<span>Create Portfolio</span>
				</a>
			</div>

			{#if portfolioList.length === 0}
				<div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
					<div class="text-6xl mb-4 opacity-50 animate-pulse">📂</div>
					<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Portfolios Yet</h3>
					<p class="text-gray-600 dark:text-gray-300 mb-6 max-w-md">Create your first portfolio to start managing your investments in simulation mode</p>
					<a 
						href="/simulated/create-portfolio" 
						class="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
					>
						Create Portfolio
					</a>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each portfolioList as portfolio}
						<a 
							href="/simulated/portfolio/{encodeURIComponent(portfolio.name)}" 
							class="group flex flex-col p-6 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 transform hover:-translate-y-2 hover:shadow-2xl"
						>
							<div class="flex justify-between items-start mb-3 gap-3">
								<h3 class="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words flex-1">
									{portfolio.name}
								</h3>
								<span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
									{formatDate(portfolio.createdAt)}
								</span>
							</div>
							
							{#if portfolio.description}
								<p class="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
									{portfolio.description}
								</p>
							{/if}
							
							<div class="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Current Value</span>
									<span class="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(portfolio.currentValue)}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Initial Deposit</span>
									<span class="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(portfolio.initialDeposit)}</span>
								</div>
							</div>
							
							<div class="flex justify-between items-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600/50 dark:to-gray-500/50 rounded-lg mb-3">
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Profit/Loss</span>
								<span class="flex items-center gap-2 text-lg font-bold {portfolio.profitLoss.absolute >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
									{portfolio.profitLoss.absolute >= 0 ? '+' : ''}{formatCurrency(portfolio.profitLoss.absolute)}
									<span class="text-sm opacity-80">({portfolio.profitLoss.percentage.toFixed(2)}%)</span>
								</span>
							</div>
							
							<div class="flex justify-end">
								<span class="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-full">
									{Object.keys(portfolio.holdings).length} {Object.keys(portfolio.holdings).length === 1 ? 'Token' : 'Tokens'}
								</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>


