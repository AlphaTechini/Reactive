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

<div class="min-h-screen bg-[#f7f7f5] dark:bg-[#0b0b0b]">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
		<!-- Account Summary -->
		<div class="bg-white dark:bg-[#111111] rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 transition-all duration-200">
			<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
				<span class="text-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">📊</span>
				Account Summary
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- Available Balance -->
				<div class="group p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:border-[#D4AF37]/50">
					<span class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Available Balance</span>
					<span class="block text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency($simulationBalance)}</span>
				</div>
				<!-- Total Portfolio Value -->
				<div class="group p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:border-[#D4AF37]/50">
					<span class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Total Portfolio Value</span>
					<span class="block text-2xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">{formatCurrency($totalPortfolioValue)}</span>
				</div>
				<!-- Total Account Value -->
				<div class="group p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:border-[#D4AF37]/50">
					<span class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Total Account Value</span>
					<span class="block text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency($simulationBalance + $totalPortfolioValue)}</span>
				</div>
				<!-- Overall P/L -->
				<div class="group p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:border-[#D4AF37]/50">
					<span class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Overall P/L</span>
					<span class="block text-2xl font-bold {$overallProfitLoss.absolute >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
						{$overallProfitLoss.absolute >= 0 ? '+' : ''}{formatCurrency($overallProfitLoss.absolute)}
						<span class="block text-sm opacity-80">({$overallProfitLoss.percentage.toFixed(2)}%)</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Portfolios Section -->
		<div class="bg-white dark:bg-[#111111] rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 transition-all duration-200">
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
					<span class="text-2xl">💼</span>
					My Portfolios ({$portfolioCount})
				</h2>
				<a 
					href="/simulated/create-portfolio" 
					class="group flex items-center gap-2 px-6 py-3 btn-gold font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
					title="Create a new portfolio"
				>
					<span class="text-xl transition-transform duration-200 group-hover:rotate-90">➕</span>
					<span>Create Portfolio</span>
				</a>
			</div>

			{#if portfolioList.length === 0}
				<div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
					<div class="text-6xl mb-4 opacity-50">📂</div>
					<h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Portfolios Yet</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md">Create your first portfolio to start managing your investments in simulation mode</p>
					<a 
						href="/simulated/create-portfolio" 
						class="px-8 py-3 btn-gold font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
					>
						Create Portfolio
					</a>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each portfolioList as portfolio}
						<a 
							href="/simulated/portfolio/{encodeURIComponent(portfolio.name)}" 
							class="group flex flex-col p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl hover:border-[#D4AF37] dark:hover:border-[#D4AF37] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl"
						>
							<div class="flex justify-between items-start mb-3 gap-3">
								<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#F4D03F] group-hover:bg-clip-text group-hover:text-transparent transition-colors break-words flex-1">
									{portfolio.name}
								</h3>
								<span class="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
									{formatDate(portfolio.createdAt)}
								</span>
							</div>
							
							{#if portfolio.description}
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
									{portfolio.description}
								</p>
							{/if}
							
							<div class="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500 dark:text-gray-500">Current Value</span>
									<span class="text-lg font-bold bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">{formatCurrency(portfolio.currentValue)}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-medium text-gray-500 dark:text-gray-500">Initial Deposit</span>
									<span class="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(portfolio.initialDeposit)}</span>
								</div>
							</div>
							
							<div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#0b0b0b] rounded-lg mb-3">
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Profit/Loss</span>
								<span class="flex items-center gap-2 text-lg font-bold {portfolio.profitLoss.absolute >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
									{portfolio.profitLoss.absolute >= 0 ? '+' : ''}{formatCurrency(portfolio.profitLoss.absolute)}
									<span class="text-sm opacity-80">({portfolio.profitLoss.percentage.toFixed(2)}%)</span>
								</span>
							</div>
							
							<div class="flex justify-end">
								<span class="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full">
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


