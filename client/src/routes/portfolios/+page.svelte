<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletAddress, walletBalance, walletService } from '$lib/stores/wallet.js';
	import { portfolios, portfoliosLoading, portfoliosError, fetchPortfolios } from '$lib/stores/portfolios.js';
	import { globalPricesStore } from '$lib/stores/globalStorage.js';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import RouteGuard from '$lib/components/RouteGuard.svelte';
	
	let searchQuery = $state('');
	let sortBy = $state('recent'); // recent, name, balance, performance
	
	onMount(async () => {
		console.log('📊 Portfolio list page mounted');
		
		// Redirect if wallet not connected
		if (!$walletAddress) {
			goto('/');
			return;
		}
		
		// Fetch portfolios
		await fetchPortfolios();
		
		// Initialize price service for portfolio value calculations
		try {
			const { enhancedPriceDisplayService } = await import('$lib/services/EnhancedPriceDisplayService.js');
			await enhancedPriceDisplayService.initialize();
			await enhancedPriceDisplayService.fetchAllPrices();
		} catch (e) {
			console.error('Failed to initialize price service:', e);
		}
	});
	
	// Watch for wallet changes
	$effect(() => {
		if ($walletAddress) {
			fetchPortfolios();
		}
	});
	
	function createPortfolio() {
		goto('/create-portfolio');
	}
	
	function viewPortfolio(portfolioId) {
		goto(`/portfolio/${portfolioId}`);
	}
	
	// Filter and sort portfolios
	let filteredPortfolios = $derived(() => {
		let result = [...$portfolios];
		
		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(p => 
				p.name.toLowerCase().includes(query) ||
				(p.description && p.description.toLowerCase().includes(query))
			);
		}
		
		// Apply sorting
		switch (sortBy) {
			case 'name':
				result.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'balance':
				result.sort((a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0));
				break;
			case 'performance':
				result.sort((a, b) => (b.performance || 0) - (a.performance || 0));
				break;
			case 'recent':
			default:
				result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
				break;
		}
		
		return result;
	});
	
	// Calculate total portfolio value across all portfolios
	let totalValue = $derived(() => {
		return $portfolios.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);
	});
	
	// Calculate average performance
	let avgPerformance = $derived(() => {
		if ($portfolios.length === 0) return 0;
		const total = $portfolios.reduce((sum, p) => sum + (p.performance || 0), 0);
		return total / $portfolios.length;
	});
	
	function formatCurrency(value) {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 4
		}).format(value);
	}
	
	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
	
	function getPerformanceColor(performance) {
		if (performance > 0) return 'text-green-600 dark:text-green-400';
		if (performance < 0) return 'text-red-600 dark:text-red-400';
		return 'text-gray-600 dark:text-gray-400';
	}
	
	function getPerformanceBgColor(performance) {
		if (performance > 0) return 'bg-green-100 dark:bg-green-900/20';
		if (performance < 0) return 'bg-red-100 dark:bg-red-900/20';
		return 'bg-gray-100 dark:bg-gray-700/20';
	}
</script>

<svelte:head>
	<title>My Portfolios - Reactive Portfolio Manager</title>
</svelte:head>

<RouteGuard requireWallet={true} message="Please connect your wallet to view portfolios">
<div class="min-h-screen bg-[#f7f7f5] dark:bg-[#0b0b0b] py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<Breadcrumb />
		<!-- Header Section -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
						My Portfolios
					</h1>
					<p class="text-gray-600 dark:text-gray-400">
						Manage and monitor all your investment portfolios
					</p>
				</div>
				<button
					onclick={createPortfolio}
					class="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Create New Portfolio
				</button>
			</div>
			
			<!-- Stats Overview -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Portfolios</p>
							<p class="text-3xl font-bold text-gray-900 dark:text-white">
								{$portfolios.length}
							</p>
						</div>
						<div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
					</div>
				</div>
				
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Value</p>
							<p class="text-3xl font-bold text-gray-900 dark:text-white">
								{formatCurrency(totalValue())}
							</p>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">REACT</p>
						</div>
						<div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
							</svg>
						</div>
					</div>
				</div>
				
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Performance</p>
							<p class="text-3xl font-bold {getPerformanceColor(avgPerformance())}">
								{avgPerformance() >= 0 ? '+' : ''}{avgPerformance().toFixed(2)}%
							</p>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">24h change</p>
						</div>
						<div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
							</svg>
						</div>
					</div>
				</div>
				
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Wallet Balance</p>
							<p class="text-3xl font-bold text-gray-900 dark:text-white">
								{walletService.formatBalance($walletBalance)}
							</p>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">REACT</p>
						</div>
						<div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
							</svg>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Search and Filter Bar -->
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
				<div class="flex flex-col sm:flex-row gap-4">
					<!-- Search Input -->
					<div class="flex-1 relative">
						<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search portfolios..."
							class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
					<!-- Sort Dropdown -->
					<div class="flex items-center gap-2">
						<label for="sort" class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
							Sort by:
						</label>
						<select
							id="sort"
							bind:value={sortBy}
							class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="recent">Most Recent</option>
							<option value="name">Name (A-Z)</option>
							<option value="balance">Balance (High-Low)</option>
							<option value="performance">Performance</option>
						</select>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Portfolio Grid -->
		{#if $portfoliosLoading}
			<div class="flex items-center justify-center py-20">
				<div class="text-center">
					<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p class="text-gray-600 dark:text-gray-400">Loading portfolios...</p>
				</div>
			</div>
		{:else if $portfoliosError}
			<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
				<svg class="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Portfolios</h2>
				<p class="text-red-600 dark:text-red-400 mb-6">{$portfoliosError}</p>
				<button
					onclick={() => fetchPortfolios()}
					class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
				>
					Try Again
				</button>
			</div>
		{:else if filteredPortfolios().length === 0}
			<!-- Empty State -->
			<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
				<div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
					<svg class="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
					{searchQuery ? 'No Portfolios Found' : 'No Portfolios Yet'}
				</h3>
				<p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
					{searchQuery 
						? `No portfolios match "${searchQuery}". Try a different search term.`
						: 'Create your first portfolio to start automated trading with custom risk management and rebalancing strategies.'
					}
				</p>
				{#if !searchQuery}
					<button
						onclick={createPortfolio}
						class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create Your First Portfolio
					</button>
				{/if}
			</div>
		{:else}
			<!-- Portfolio Cards Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredPortfolios() as portfolio (portfolio.id)}
					<button
						onclick={() => viewPortfolio(portfolio.id)}
						class="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 text-left overflow-hidden group"
					>
						<!-- Portfolio Header -->
						<div class="p-6 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h3 class="text-xl font-bold mb-1 truncate">
										{portfolio.name}
									</h3>
									<p class="text-sm text-blue-100 line-clamp-2">
										{portfolio.description || 'No description'}
									</p>
								</div>
								<div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
									<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
									</svg>
								</div>
							</div>
							
							<!-- Balance -->
							<div class="mt-4">
								<p class="text-sm text-blue-100 mb-1">Portfolio Balance</p>
								<p class="text-2xl font-bold">
									{formatCurrency(parseFloat(portfolio.balance) || 0)} REACT
								</p>
							</div>
						</div>
						
						<!-- Portfolio Metrics -->
						<div class="p-6 space-y-3">
							<!-- Performance -->
							<div class="flex items-center justify-between p-3 {getPerformanceBgColor(portfolio.performance || 0)} rounded-lg">
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5 {getPerformanceColor(portfolio.performance || 0)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										{#if (portfolio.performance || 0) >= 0}
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										{:else}
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
										{/if}
									</svg>
									<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
								</div>
								<span class="text-lg font-bold {getPerformanceColor(portfolio.performance || 0)}">
									{(portfolio.performance || 0) >= 0 ? '+' : ''}{(portfolio.performance || 0).toFixed(2)}%
								</span>
							</div>
							
							<!-- Assets Count -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
									</svg>
									<span class="text-sm text-gray-600 dark:text-gray-400">Assets</span>
								</div>
								<span class="text-sm font-semibold text-gray-900 dark:text-white">
									{portfolio.assetCount || 0} tokens
								</span>
							</div>
							
							<!-- Allocation Status -->
							{#if portfolio.allocations && portfolio.allocations.length > 0}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm text-gray-600 dark:text-gray-400">Allocation</span>
									</div>
									<span class="text-sm font-semibold text-green-600 dark:text-green-400">
										Configured
									</span>
								</div>
							{:else}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm text-gray-600 dark:text-gray-400">Allocation</span>
									</div>
									<span class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
										Pending
									</span>
								</div>
							{/if}
							
							<!-- Created Date -->
							<div class="pt-3 border-t border-gray-200 dark:border-gray-700">
								<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
									<span>Created {formatDate(portfolio.createdAt)}</span>
									<svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
</RouteGuard>
