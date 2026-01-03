<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { 
		simulationPortfolios, 
		simulationBalance,
		updatePortfolioAllocations,
		startPriceUpdates,
		stopPriceUpdates,
		refreshPortfolioPrices,
		depositToPortfolio,
		withdrawFromPortfolio,
		getPortfolioTransactions
	} from '$lib/stores/simulation.js';
	import { simulationTradingService } from '$lib/services/SimulationTradingService.js';
	import priceService from '$lib/priceService.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import { formatPrice } from '$lib/utils/priceFormatter.js';

	// Get portfolio name from URL
	$: portfolioName = $page.params.name;
	$: portfolio = $simulationPortfolios[portfolioName];
	
	// Get transactions for this portfolio
	$: transactions = portfolioName ? getPortfolioTransactions(portfolioName) : [];

	// Token list organized by category
	const tokensByCategory = {
		core: INITIAL_TOKEN_LIST.filter(t => t.category === 'core'),
		stable: INITIAL_TOKEN_LIST.filter(t => t.category === 'stable'),
		alt: INITIAL_TOKEN_LIST.filter(t => t.category === 'alt'),
		meme: INITIAL_TOKEN_LIST.filter(t => t.category === 'meme')
	};

	// State
	let allocations = {}; // { symbol: percentage }
	let prices = {}; // { symbol: price }
	let loadingPrices = true;
	let refreshingPrices = false;
	let error = '';
	let success = '';
	let isExecuting = false;
	let pricesFetchAttempts = 0;
	let lastPriceFetchTime = null;

	// Modal states
	let showDepositModal = false;
	let showWithdrawModal = false;
	let depositAmount = '';
	let withdrawAmount = '';
	let modalError = '';
	let modalProcessing = false;

	// Calculated values
	$: totalPercentage = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
	$: remainingPercentage = 100 - totalPercentage;
	$: isValid = Math.abs(totalPercentage - 100) < 0.01;
	$: selectedTokens = Object.keys(allocations).filter(symbol => allocations[symbol] > 0);

	// Calculate token amounts in real-time
	$: tokenAmounts = calculateTokenAmounts();

	// Calculate category metrics for dashboard view
	$: categoryMetrics = calculateCategoryMetrics();

	// Check if prices are stale (older than 5 minutes)
	$: pricesAreStale = lastPriceFetchTime && (Date.now() - lastPriceFetchTime) > 5 * 60 * 1000;

	function calculateTokenAmounts() {
		if (!portfolio) return {};
		
		const amounts = {};
		for (const [symbol, percentage] of Object.entries(allocations)) {
			const price = prices[symbol];
			if (price && percentage > 0) {
				const usdValue = (portfolio.currentValue * percentage) / 100;
				const amount = usdValue / price;
				amounts[symbol] = {
					amount,
					usdValue,
					percentage
				};
			}
		}
		return amounts;
	}

	function calculateCategoryMetrics() {
		if (!portfolio || !portfolio.holdings || Object.keys(portfolio.holdings).length === 0) {
			return {
				core: { value: 0, percentage: 0, count: 0, profitLoss: 0, profitLossPercent: 0 },
				stable: { value: 0, percentage: 0, count: 0, profitLoss: 0, profitLossPercent: 0 },
				alt: { value: 0, percentage: 0, count: 0, profitLoss: 0, profitLossPercent: 0 },
				meme: { value: 0, percentage: 0, count: 0, profitLoss: 0, profitLossPercent: 0 }
			};
		}

		const categories = {
			core: { value: 0, count: 0, initialValue: 0 },
			stable: { value: 0, count: 0, initialValue: 0 },
			alt: { value: 0, count: 0, initialValue: 0 },
			meme: { value: 0, count: 0, initialValue: 0 }
		};

		// Calculate values for each category
		for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
			const token = INITIAL_TOKEN_LIST.find(t => t.symbol === symbol);
			if (!token || !categories[token.category]) continue;

			const currentValue = holding.amount * holding.currentPrice;
			const initialValue = holding.amount * holding.initialPrice;

			categories[token.category].value += currentValue;
			categories[token.category].initialValue += initialValue;
			categories[token.category].count += 1;
		}

		// Calculate percentages and P/L for each category
		const result = {};
		for (const [category, data] of Object.entries(categories)) {
			const percentage = portfolio.currentValue > 0 ? (data.value / portfolio.currentValue) * 100 : 0;
			const profitLoss = data.value - data.initialValue;
			const profitLossPercent = data.initialValue > 0 ? (profitLoss / data.initialValue) * 100 : 0;

			result[category] = {
				value: data.value,
				percentage,
				count: data.count,
				profitLoss,
				profitLossPercent
			};
		}

		return result;
	}

	// View mode: 'configure' or 'dashboard'
	let viewMode = 'configure';

	// Initialize prices and allocations
	onMount(async () => {
		if (!portfolio) {
			error = 'Portfolio not found. It may have been deleted or the name is incorrect.';
			return;
		}

		// Check if portfolio already has holdings (already configured)
		if (portfolio.holdings && Object.keys(portfolio.holdings).length > 0) {
			// Portfolio already configured, show dashboard view
			viewMode = 'dashboard';
			loadingPrices = false;
			
			// Start price updates for real-time portfolio value tracking
			startPriceUpdates();
			
			// Fetch current prices for dashboard
			try {
				if (!priceService.isInitialized) {
					await priceService.initialize();
				}
				await fetchPrices();
			} catch (err) {
				console.error('Failed to load prices:', err);
				// Don't block dashboard view if prices fail
			}
			return;
		}

		// Portfolio not configured yet, show configuration view
		viewMode = 'configure';
		
		try {
			// Initialize price service if needed
			if (!priceService.isInitialized) {
				console.log('🔄 Initializing price service...');
				await priceService.initialize();
			}

			// Fetch current prices
			await fetchPrices();
		} catch (err) {
			console.error('❌ Failed to initialize:', err);
			error = 'Failed to load token prices. Please refresh the page or try again later.';
		} finally {
			loadingPrices = false;
		}
	});

	// Cleanup on component destroy
	onDestroy(() => {
		// Note: We don't stop price updates here because other components might need them
		// Price updates are managed globally by the simulation store
	});

	async function fetchPrices() {
		const maxAttempts = 3;
		pricesFetchAttempts++;
		
		try {
			loadingPrices = true;
			error = '';

			console.log(`📊 Fetching prices (attempt ${pricesFetchAttempts})...`);

			// Get all prices from price service
			const allPrices = priceService.globalStorage.getAllPrices();
			
			// Validate we have price data
			if (!allPrices || Object.keys(allPrices).length === 0) {
				throw new Error('No price data available. The price service may be unavailable.');
			}
			
			// Extract prices for our tokens
			const newPrices = {};
			const missingPrices = [];
			
			for (const token of INITIAL_TOKEN_LIST) {
				// Find price by symbol
				const priceEntry = Object.values(allPrices).find(p => p.symbol === token.symbol);
				if (priceEntry && priceEntry.price && priceEntry.price > 0) {
					newPrices[token.symbol] = priceEntry.price;
				} else {
					missingPrices.push(token.symbol);
				}
			}

			// Check if we have enough prices
			if (Object.keys(newPrices).length === 0) {
				throw new Error('No valid token prices found. Please try again.');
			}

			prices = newPrices;
			lastPriceFetchTime = Date.now();
			pricesFetchAttempts = 0; // Reset on success
			
			console.log(`✅ Loaded ${Object.keys(newPrices).length} token prices`);
			
			if (missingPrices.length > 0) {
				console.warn(`⚠️ Missing prices for: ${missingPrices.join(', ')}`);
			}
		} catch (err) {
			console.error(`❌ Failed to fetch prices (attempt ${pricesFetchAttempts}):`, err);
			
			if (pricesFetchAttempts < maxAttempts) {
				// Retry with exponential backoff
				const delay = Math.pow(2, pricesFetchAttempts - 1) * 1000;
				console.log(`⏳ Retrying in ${delay}ms...`);
				
				error = `Loading prices... (attempt ${pricesFetchAttempts}/${maxAttempts})`;
				
				await new Promise(resolve => setTimeout(resolve, delay));
				return fetchPrices(); // Recursive retry
			} else {
				error = 'Failed to fetch token prices after multiple attempts. Please refresh the page or try again later.';
			}
		} finally {
			loadingPrices = false;
			refreshingPrices = false;
		}
	}

	async function handleRefreshPrices() {
		if (refreshingPrices || loadingPrices) {
			return;
		}
		
		refreshingPrices = true;
		pricesFetchAttempts = 0; // Reset attempts for manual refresh
		
		try {
			await fetchPrices();
			success = 'Prices refreshed successfully';
			setTimeout(() => success = '', 3000);
		} catch (err) {
			console.error('Failed to refresh prices:', err);
		}
	}

	function handlePercentageChange(symbol, value) {
		const numValue = parseFloat(value) || 0;
		if (numValue < 0) return;
		if (numValue > 100) return; // Prevent single token > 100%
		
		allocations = {
			...allocations,
			[symbol]: numValue
		};
	}

	function autoDistribute() {
		if (selectedTokens.length === 0) {
			error = 'Please select at least one token first by entering a percentage';
			setTimeout(() => error = '', 3000);
			return;
		}

		const percentage = 100 / selectedTokens.length;
		const newAllocations = {};
		
		for (const symbol of selectedTokens) {
			newAllocations[symbol] = percentage;
		}

		allocations = newAllocations;
		success = `Auto-distributed ${percentage.toFixed(2)}% to each of ${selectedTokens.length} tokens`;
		setTimeout(() => success = '', 3000);
	}

	function selectAll() {
		const newAllocations = {};
		for (const token of INITIAL_TOKEN_LIST) {
			newAllocations[token.symbol] = 0;
		}
		allocations = newAllocations;
		success = 'All tokens selected. Use Auto Distribute to assign percentages.';
		setTimeout(() => success = '', 3000);
	}

	function clearAll() {
		allocations = {};
		success = 'All selections cleared';
		setTimeout(() => success = '', 3000);
	}

	async function confirmAndCreate() {
		if (!isValid) {
			error = 'Total allocation must equal 100%';
			return;
		}

		if (selectedTokens.length === 0) {
			error = 'Please select at least one token';
			return;
		}

		// Check if we have prices for all selected tokens
		const missingPrices = selectedTokens.filter(symbol => !prices[symbol]);
		if (missingPrices.length > 0) {
			error = `Missing prices for: ${missingPrices.join(', ')}. Please refresh prices and try again.`;
			return;
		}

		isExecuting = true;
		error = '';
		success = '';

		try {
			console.log('🚀 Starting portfolio execution...');
			
			// Step 1: Validate allocations
			const validation = simulationTradingService.validateAllocations(allocations);
			if (!validation.valid) {
				throw new Error(`Invalid allocations: ${validation.errors.join(', ')}`);
			}
			console.log('✅ Allocations validated');

			// Step 2: Fetch current prices for all selected tokens (with retry logic)
			console.log('📊 Fetching current prices for selected tokens...');
			const currentPrices = await simulationTradingService.fetchCurrentPrices(selectedTokens);
			
			// Verify we have prices for all selected tokens
			const stillMissingPrices = selectedTokens.filter(symbol => !currentPrices[symbol]);
			if (stillMissingPrices.length > 0) {
				throw new Error(`Unable to fetch prices for: ${stillMissingPrices.join(', ')}. Please try again.`);
			}
			console.log('✅ Current prices fetched for all tokens');

			// Step 3: Calculate final token amounts
			console.log('🧮 Calculating token amounts...');
			const holdings = simulationTradingService.calculateTokenAmounts(
				allocations,
				portfolio.currentValue,
				currentPrices
			);
			console.log('✅ Token amounts calculated:', Object.keys(holdings).length, 'tokens');

			// Step 4: Store initial prices for P/L tracking
			// The holdings object already contains initialPrice and currentPrice
			// Both are set to the current price at creation time
			console.log('💾 Initial prices stored for P/L tracking');

			// Step 5: Execute portfolio creation - update simulation store with new portfolio
			// This will update the portfolio with holdings and recalculate values
			updatePortfolioAllocations(portfolioName, holdings);
			console.log('✅ Portfolio updated in simulation store');

			// Step 6: Balance deduction already happened during portfolio creation
			// The createPortfolio function in the store already deducted the deposit amount
			console.log('💰 Deposit amount already deducted from available balance');

			// Log success
			console.log(`✅ Portfolio "${portfolioName}" successfully configured with ${Object.keys(holdings).length} tokens`);
			console.log('📈 Holdings:', holdings);

			// Show success message briefly before redirect
			success = 'Portfolio created successfully! Redirecting...';
			
			// Redirect to main dashboard after a short delay
			setTimeout(() => {
				goto(`/simulated/dashboard`);
			}, 1000);
		} catch (err) {
			console.error('❌ Failed to create portfolio:', err);
			error = err.message || 'Failed to create portfolio. Please try again.';
		} finally {
			isExecuting = false;
		}
	}

	function getCategoryName(category) {
		const names = {
			core: 'Core Assets',
			stable: 'Stablecoins',
			alt: 'Altcoins',
			meme: 'Memecoins'
		};
		return names[category] || category;
	}

	// ============================================
	// Deposit and Withdraw Functions
	// ============================================

	function openDepositModal() {
		depositAmount = '';
		modalError = '';
		showDepositModal = true;
	}

	function closeDepositModal() {
		showDepositModal = false;
		depositAmount = '';
		modalError = '';
	}

	function openWithdrawModal() {
		withdrawAmount = '';
		modalError = '';
		showWithdrawModal = true;
	}

	function closeWithdrawModal() {
		showWithdrawModal = false;
		withdrawAmount = '';
		modalError = '';
	}

	async function handleDeposit() {
		const amount = parseFloat(depositAmount);
		
		// Validation
		if (isNaN(amount) || amount <= 0) {
			modalError = 'Please enter a valid amount';
			return;
		}
		
		if (amount > $simulationBalance) {
			modalError = `Insufficient balance. Available: $${$simulationBalance.toFixed(2)}`;
			return;
		}
		
		modalProcessing = true;
		modalError = '';
		
		try {
			console.log('💰 Processing deposit:', amount);
			
			// Fetch current prices
			await fetchPrices();
			
			// Get current holdings to calculate percentages
			const currentHoldings = portfolio.holdings;
			
			if (!currentHoldings || Object.keys(currentHoldings).length === 0) {
				modalError = 'Portfolio has no holdings. Please configure portfolio first.';
				return;
			}
			
			// Calculate current percentages based on current values
			const totalValue = portfolio.currentValue;
			const percentages = {};
			
			for (const [symbol, holding] of Object.entries(currentHoldings)) {
				const holdingValue = holding.amount * holding.currentPrice;
				percentages[symbol] = (holdingValue / totalValue) * 100;
			}
			
			console.log('📊 Current percentages:', percentages);
			
			// Calculate how much of each token to buy with the deposit
			const newHoldings = {};
			for (const [symbol, percentage] of Object.entries(percentages)) {
				const currentPrice = prices[symbol] || currentHoldings[symbol].currentPrice;
				const usdValue = (amount * percentage) / 100;
				const tokenAmount = usdValue / currentPrice;
				
				// Add to existing holdings
				newHoldings[symbol] = {
					amount: currentHoldings[symbol].amount + tokenAmount,
					initialPrice: currentHoldings[symbol].initialPrice, // Keep original initial price
					currentPrice: currentPrice,
					percentage: percentage // Keep same percentage
				};
			}
			
			console.log('🔄 Updated holdings:', newHoldings);
			
			// Update portfolio in store
			depositToPortfolio(portfolioName, amount, percentages);
			
			// Update holdings with new token amounts
			updatePortfolioAllocations(portfolioName, newHoldings);
			
			console.log('✅ Deposit successful');
			
			// Close modal and show success
			closeDepositModal();
			success = `Successfully deposited $${amount.toFixed(2)}`;
			setTimeout(() => success = '', 3000);
		} catch (err) {
			console.error('❌ Deposit failed:', err);
			modalError = err.message || 'Failed to process deposit';
		} finally {
			modalProcessing = false;
		}
	}

	async function handleWithdraw() {
		const amount = parseFloat(withdrawAmount);
		
		// Validation
		if (isNaN(amount) || amount <= 0) {
			modalError = 'Please enter a valid amount';
			return;
		}
		
		if (amount > portfolio.currentValue) {
			modalError = `Insufficient portfolio value. Available: $${portfolio.currentValue.toFixed(2)}`;
			return;
		}
		
		modalProcessing = true;
		modalError = '';
		
		try {
			console.log('💸 Processing withdrawal:', amount);
			
			// Fetch current prices
			await fetchPrices();
			
			// Get current holdings
			const currentHoldings = portfolio.holdings;
			
			if (!currentHoldings || Object.keys(currentHoldings).length === 0) {
				modalError = 'Portfolio has no holdings';
				return;
			}
			
			// Calculate withdrawal percentage (how much of the portfolio to withdraw)
			const withdrawalPercentage = (amount / portfolio.currentValue) * 100;
			
			console.log(`📊 Withdrawing ${withdrawalPercentage.toFixed(2)}% of portfolio`);
			
			// Reduce each holding proportionally
			const newHoldings = {};
			for (const [symbol, holding] of Object.entries(currentHoldings)) {
				const currentPrice = prices[symbol] || holding.currentPrice;
				const reductionFactor = 1 - (withdrawalPercentage / 100);
				
				// Calculate new amount (reduce proportionally)
				const newAmount = holding.amount * reductionFactor;
				
				// Only keep holdings with non-zero amounts
				if (newAmount > 0.000001) { // Small threshold to avoid floating point issues
					newHoldings[symbol] = {
						amount: newAmount,
						initialPrice: holding.initialPrice, // Keep original initial price
						currentPrice: currentPrice,
						percentage: holding.percentage // Keep same percentage
					};
				}
			}
			
			console.log('🔄 Updated holdings after withdrawal:', newHoldings);
			
			// Update portfolio in store
			withdrawFromPortfolio(portfolioName, amount);
			
			// Update holdings with reduced amounts
			updatePortfolioAllocations(portfolioName, newHoldings);
			
			console.log('✅ Withdrawal successful');
			
			// Close modal and show success
			closeWithdrawModal();
			success = `Successfully withdrew $${amount.toFixed(2)}`;
			setTimeout(() => success = '', 3000);
		} catch (err) {
			console.error('❌ Withdrawal failed:', err);
			modalError = err.message || 'Failed to process withdrawal';
		} finally {
			modalProcessing = false;
		}
	}
</script>

<svelte:head>
	<title>{viewMode === 'dashboard' ? 'Portfolio Dashboard' : 'Configure Portfolio'} - {portfolioName}</title>
</svelte:head>

<div class="min-h-screen bg-[#f7f7f5] dark:bg-[#0b0b0b]">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
						{viewMode === 'dashboard' ? 'Portfolio Dashboard' : 'Configure Portfolio'}
					</h1>
					<p class="text-gray-600 dark:text-gray-300">
						{portfolioName}
					</p>
				</div>
				<button
					onclick={() => goto('/simulated/dashboard')}
					class="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					← Back to Dashboard
				</button>
			</div>

			{#if portfolio && viewMode === 'configure'}
				<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-blue-800 dark:text-blue-200">Portfolio Value</p>
							<p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
								${portfolio.currentValue.toFixed(2)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-sm text-blue-800 dark:text-blue-200">Available Balance</p>
							<p class="text-xl font-semibold text-blue-900 dark:text-blue-100">
								${$simulationBalance.toFixed(2)}
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if !portfolio}
			<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
				<p class="text-red-800 dark:text-red-200">Portfolio not found</p>
			</div>
		{:else if viewMode === 'dashboard'}
			<!-- Portfolio Dashboard View -->
			<div class="space-y-6">
				<!-- Portfolio Overview -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
					<div class="flex items-start justify-between mb-6">
						<div>
							<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
								{portfolio.name}
							</h2>
							{#if portfolio.description}
								<p class="text-gray-600 dark:text-gray-300">{portfolio.description}</p>
							{/if}
							<p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
								Created {new Date(portfolio.createdAt).toLocaleDateString()}
							</p>
						</div>
						<button
							onclick={() => goto(`/simulated/portfolio/${portfolioName}/settings`)}
							class="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
							title="Portfolio Settings"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</button>
					</div>

					<!-- Key Metrics Grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<!-- Portfolio Value -->
						<div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
							<p class="text-sm text-blue-800 dark:text-blue-200 mb-1">Portfolio Value</p>
							<p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
								${portfolio.currentValue.toFixed(2)}
							</p>
						</div>

						<!-- Number of Currencies -->
						<div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
							<p class="text-sm text-purple-800 dark:text-purple-200 mb-1">No. of Currencies</p>
							<p class="text-2xl font-bold text-purple-900 dark:text-purple-100">
								{Object.keys(portfolio.holdings).length}
							</p>
						</div>

						<!-- Profit/Loss -->
						<div class="bg-gradient-to-br from-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-50 to-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-100 dark:from-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-900/20 dark:to-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-800/20 rounded-xl p-4">
							<p class="text-sm text-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-800 dark:text-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-200 mb-1">
								{portfolio.profitLoss.absolute >= 0 ? 'Profit' : 'Loss'}
							</p>
							<p class="text-2xl font-bold text-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-900 dark:text-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-100">
								{portfolio.profitLoss.absolute >= 0 ? '+' : ''}{portfolio.profitLoss.percentage.toFixed(2)}%
							</p>
							<p class="text-sm text-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-700 dark:text-{portfolio.profitLoss.absolute >= 0 ? 'green' : 'red'}-300">
								${portfolio.profitLoss.absolute >= 0 ? '+' : ''}{portfolio.profitLoss.absolute.toFixed(2)}
							</p>
						</div>

						<!-- Initial Deposit -->
						<div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-600/20 rounded-xl p-4">
							<p class="text-sm text-gray-800 dark:text-gray-200 mb-1">Initial Deposit</p>
							<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
								${portfolio.initialDeposit.toFixed(2)}
							</p>
						</div>
					</div>
				</div>

				<!-- Category Breakdown -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
					<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
					<div class="grid grid-cols-2 gap-4">
						{#each [
							{ key: 'core', label: 'Core Assets', color: 'blue' },
							{ key: 'stable', label: 'Stablecoins', color: 'green' },
							{ key: 'alt', label: 'Altcoins', color: 'purple' },
							{ key: 'meme', label: 'Memecoins', color: 'orange' }
						] as { key: category, label, color }}
							{@const metrics = categoryMetrics[category]}
							
							<div class="bg-gradient-to-br from-{color}-50 to-{color}-100 dark:from-{color}-900/20 dark:to-{color}-800/20 rounded-xl p-4 border border-{color}-200 dark:border-{color}-800">
								<div class="flex items-center justify-between mb-2">
									<p class="text-sm font-medium text-{color}-800 dark:text-{color}-200">
										{label}
									</p>
									{#if metrics.count > 0}
										<span class="text-xs bg-{color}-200 dark:bg-{color}-700 text-{color}-800 dark:text-{color}-200 px-2 py-1 rounded-full">
											{metrics.count} {metrics.count === 1 ? 'token' : 'tokens'}
										</span>
									{/if}
								</div>
								<p class="text-2xl font-bold text-{color}-900 dark:text-{color}-100 mb-1">
									{metrics.percentage.toFixed(1)}%
								</p>
								<p class="text-sm text-{color}-700 dark:text-{color}-300 mb-2">
									${metrics.value.toFixed(2)}
								</p>
								{#if metrics.count > 0 && metrics.value > 0}
									<div class="flex items-center gap-1 text-xs">
										<span class="{metrics.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
											{metrics.profitLoss >= 0 ? '↑' : '↓'} {metrics.profitLoss >= 0 ? '+' : ''}{metrics.profitLossPercent.toFixed(2)}%
										</span>
										<span class="text-{color}-600 dark:text-{color}-400">
											({metrics.profitLoss >= 0 ? '+' : ''}${metrics.profitLoss.toFixed(2)})
										</span>
									</div>
								{:else}
									<p class="text-xs text-{color}-500 dark:text-{color}-400 italic">
										No holdings
									</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Holdings List -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
					<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Holdings</h3>
					
					<div class="space-y-3">
						{#each Object.entries(portfolio.holdings) as [symbol, holding]}
							{@const token = INITIAL_TOKEN_LIST.find(t => t.symbol === symbol)}
							{@const currentValue = holding.amount * holding.currentPrice}
							{@const initialValue = holding.amount * holding.initialPrice}
							{@const holdingPL = currentValue - initialValue}
							{@const holdingPLPercent = initialValue > 0 ? (holdingPL / initialValue) * 100 : 0}
							{@const priceChange = holding.initialPrice > 0 ? ((holding.currentPrice - holding.initialPrice) / holding.initialPrice) * 100 : 0}
							{@const tokenSettings = portfolio.settings?.tokenSettings?.[symbol]}
							{@const hasAutomation = tokenSettings && tokenSettings.enabled}
							{@const lastActionPrice = holding.lastActionPrice || holding.initialPrice}
							{@const priceChangeFromLastAction = lastActionPrice > 0 ? ((holding.currentPrice - lastActionPrice) / lastActionPrice) * 100 : 0}
							
							<div class="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-l-4 {hasAutomation ? 'border-blue-500' : 'border-transparent'}">
								<!-- Token Info -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-bold text-gray-900 dark:text-white text-lg">
											{symbol}
										</span>
										{#if token}
											<span class="text-sm text-gray-500 dark:text-gray-400 truncate">
												{token.name}
											</span>
										{/if}
										{#if hasAutomation}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full" title="Automation enabled">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
												</svg>
												Auto
											</span>
										{/if}
									</div>
									
									<!-- Token Quantity Display: "{quantity} {symbol}" format -->
									<div class="space-y-1 mb-2">
										<div class="flex items-center gap-2 text-sm">
											<span class="font-mono text-gray-900 dark:text-white font-semibold">
												{holding.amount.toFixed(6)} {symbol}
											</span>
										</div>
										<div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
											<span>
												Price: ${formatPrice(holding.currentPrice)}
											</span>
											<span>•</span>
											<span>
												Value: ${currentValue.toFixed(2)}
											</span>
										</div>
									</div>

									<!-- Per-Token Metrics -->
									<div class="grid grid-cols-2 gap-2 text-xs">
										<!-- Per-Token P/L -->
										<div class="bg-white dark:bg-gray-800 rounded-lg p-2">
											<p class="text-gray-500 dark:text-gray-400 mb-0.5">Token P/L</p>
											<p class="font-semibold {holdingPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
												{holdingPL >= 0 ? '+' : ''}{holdingPLPercent.toFixed(2)}%
											</p>
											<p class="text-xs {holdingPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
												{holdingPL >= 0 ? '+' : ''}${holdingPL.toFixed(2)}
											</p>
										</div>

										<!-- Price Change -->
										<div class="bg-white dark:bg-gray-800 rounded-lg p-2">
											<p class="text-gray-500 dark:text-gray-400 mb-0.5">Price Change</p>
											<p class="font-semibold {priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
												{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
											</p>
											<p class="text-xs text-gray-500 dark:text-gray-400">
												from ${formatPrice(holding.initialPrice)}
											</p>
										</div>

										<!-- Last Action Price (if automation enabled) -->
										{#if hasAutomation && holding.lastActionPrice}
											<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
												<p class="text-blue-700 dark:text-blue-300 mb-0.5">Last Action</p>
												<p class="font-semibold text-blue-900 dark:text-blue-100">
													${formatPrice(lastActionPrice)}
												</p>
												<p class="text-xs {priceChangeFromLastAction >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
													{priceChangeFromLastAction >= 0 ? '+' : ''}{priceChangeFromLastAction.toFixed(2)}%
												</p>
											</div>
										{/if}

										<!-- Token Settings Status (if automation enabled) -->
										{#if hasAutomation && tokenSettings}
											<div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
												<p class="text-purple-700 dark:text-purple-300 mb-0.5">Settings</p>
												<div class="space-y-0.5">
													{#if tokenSettings.sellPercent}
														<p class="text-xs text-purple-900 dark:text-purple-100">
															Sell: +{tokenSettings.sellPercent}%
														</p>
													{/if}
													{#if tokenSettings.buyPercent}
														<p class="text-xs text-purple-900 dark:text-purple-100">
															Buy: -{tokenSettings.buyPercent}%
														</p>
													{/if}
													{#if tokenSettings.stopLossPercent}
														<p class="text-xs text-purple-900 dark:text-purple-100">
															Stop: -{tokenSettings.stopLossPercent}%
														</p>
													{/if}
												</div>
											</div>
										{/if}
									</div>

									<!-- Automation Indicators -->
									{#if hasAutomation && tokenSettings}
										<div class="mt-2 flex items-center gap-2 flex-wrap">
											<!-- Sell Trigger Indicator -->
											{#if tokenSettings.sellPercent && priceChangeFromLastAction >= tokenSettings.sellPercent}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full animate-pulse">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
													</svg>
													Sell Trigger
												</span>
											{/if}

											<!-- Buy Trigger Indicator -->
											{#if tokenSettings.buyPercent && priceChangeFromLastAction <= -tokenSettings.buyPercent}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full animate-pulse">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
													</svg>
													Buy Trigger
												</span>
											{/if}

											<!-- Stop Loss Trigger Indicator -->
											{#if tokenSettings.stopLossPercent && priceChangeFromLastAction <= -tokenSettings.stopLossPercent}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full animate-pulse">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
													</svg>
													Stop Loss
												</span>
											{/if}
										</div>
									{/if}
								</div>

								<!-- Percentage of Portfolio -->
								<div class="text-right flex-shrink-0 w-20">
									<p class="text-sm text-gray-600 dark:text-gray-300">
										{holding.percentage.toFixed(1)}%
									</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">
										of portfolio
									</p>
									{#if tokenSettings?.targetPercentage}
										<p class="text-xs text-blue-600 dark:text-blue-400 mt-1">
											Target: {tokenSettings.targetPercentage.toFixed(1)}%
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Transaction History -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
					<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Transaction History</h3>
					
					{#if transactions.length === 0}
						<div class="text-center py-8">
							<p class="text-gray-500 dark:text-gray-400">No transactions yet</p>
						</div>
					{:else}
						<div class="space-y-2 max-h-96 overflow-y-auto">
							{#each transactions as tx}
								<div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
									<!-- Transaction Icon & Type -->
									<div class="flex-shrink-0">
										{#if tx.type === 'create'}
											<div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
												<span class="text-xl">🎯</span>
											</div>
										{:else if tx.type === 'buy'}
											<div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
												<span class="text-xl">📈</span>
											</div>
										{:else if tx.type === 'sell'}
											<div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
												<span class="text-xl">📉</span>
											</div>
										{:else if tx.type === 'deposit'}
											<div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
												<span class="text-xl">💰</span>
											</div>
										{:else if tx.type === 'withdraw'}
											<div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
												<span class="text-xl">💸</span>
											</div>
										{/if}
									</div>

									<!-- Transaction Details -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1">
											<span class="font-semibold text-gray-900 dark:text-white capitalize">
												{tx.type}
											</span>
											{#if tx.details.symbol}
												<span class="text-sm text-gray-600 dark:text-gray-300">
													{tx.details.symbol}
												</span>
											{/if}
										</div>
										
										<div class="text-sm text-gray-600 dark:text-gray-300">
											{#if tx.type === 'create'}
												Portfolio created with ${tx.details.value.toFixed(2)}
											{:else if tx.type === 'buy'}
												Bought {tx.details.tokenAmount.toFixed(6)} tokens for ${tx.details.usdAmount.toFixed(2)}
												<span class="text-xs text-gray-500 dark:text-gray-400">
													@ ${formatPrice(tx.details.price)}
												</span>
											{:else if tx.type === 'sell'}
												Sold {tx.details.tokenAmount.toFixed(6)} tokens for ${tx.details.usdAmount.toFixed(2)}
												<span class="text-xs {tx.details.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
													({tx.details.profitLoss >= 0 ? '+' : ''}${tx.details.profitLoss.toFixed(2)})
												</span>
											{:else if tx.type === 'deposit'}
												Deposited ${tx.details.value.toFixed(2)}
											{:else if tx.type === 'withdraw'}
												Withdrew ${tx.details.value.toFixed(2)}
											{/if}
										</div>
									</div>

									<!-- Timestamp -->
									<div class="text-right flex-shrink-0">
										<p class="text-xs text-gray-500 dark:text-gray-400">
											{new Date(tx.timestamp).toLocaleDateString()}
										</p>
										<p class="text-xs text-gray-500 dark:text-gray-400">
											{new Date(tx.timestamp).toLocaleTimeString()}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Action Buttons -->
				<div class="flex gap-4">
					<button
						onclick={openDepositModal}
						class="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						💰 Deposit
					</button>
					<button
						onclick={openWithdrawModal}
						class="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						💸 Withdraw
					</button>
				</div>
			</div>
		{:else if loadingPrices}
			<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
				<div class="relative w-16 h-16 mx-auto mb-6">
					<div class="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
					<div class="absolute inset-0 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin"></div>
				</div>
				<p class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading token prices...</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Fetching real-time market data</p>
				<div class="mt-6 flex justify-center gap-2">
					<div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
					<div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
					<div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
				</div>
			</div>
		{:else}
			<!-- Main Content -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Token Selection (Left - 2 columns) -->
				<div class="lg:col-span-2 space-y-6">
					<!-- Action Buttons -->
					<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
						<!-- Running Total Display -->
						<div class="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocation Progress</p>
									<div class="flex items-baseline gap-3">
										<span class="text-2xl font-bold {isValid ? 'text-green-600 dark:text-green-400' : totalPercentage > 100 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}">
											{totalPercentage.toFixed(2)}%
										</span>
										<span class="text-sm text-gray-600 dark:text-gray-400">of 100%</span>
									</div>
								</div>
								<div class="text-right">
									<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remaining</p>
									<span class="text-2xl font-bold {remainingPercentage >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}">
										{remainingPercentage >= 0 ? remainingPercentage.toFixed(2) : '0.00'}%
									</span>
								</div>
							</div>
							<!-- Progress bar -->
							<div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
								<div 
									class="h-full transition-all duration-500 {isValid ? 'bg-gradient-to-r from-green-500 to-green-600' : totalPercentage > 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}"
									style="width: {Math.min(totalPercentage, 100)}%"
								></div>
							</div>
						</div>
						
						<div class="flex flex-wrap gap-3">
							<button
								onclick={selectAll}
								class="group px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105 hover:shadow-md"
								title="Select all available tokens"
							>
								<span class="flex items-center gap-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Select All
								</span>
							</button>
							<button
								onclick={clearAll}
								class="group px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105 hover:shadow-md"
								title="Clear all selections"
							>
								<span class="flex items-center gap-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
									Clear All
								</span>
							</button>
							<button
								onclick={autoDistribute}
								disabled={selectedTokens.length === 0}
								class="group px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
								title={selectedTokens.length === 0 ? 'Select tokens first' : 'Distribute percentages equally'}
							>
								<span class="flex items-center gap-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									Auto Distribute
								</span>
							</button>
							<button
								onclick={handleRefreshPrices}
								disabled={loadingPrices || refreshingPrices}
								class="ml-auto px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
								title="Refresh token prices"
							>
								<span class="flex items-center gap-2">
									<svg class="w-4 h-4 {loadingPrices || refreshingPrices ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									{loadingPrices || refreshingPrices ? 'Refreshing...' : 'Refresh Prices'}
								</span>
							</button>
							{#if pricesAreStale}
								<div class="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-xs text-orange-700 dark:text-orange-300 animate-pulse">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									Prices may be stale
								</div>
							{/if}
						</div>
					</div>

					<!-- Token Categories -->
					{#each Object.entries(tokensByCategory) as [category, tokens]}
						{@const categoryTotal = tokens.reduce((sum, t) => sum + (parseFloat(allocations[t.symbol]) || 0), 0)}
						<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
							<div class="flex items-center justify-between mb-4">
								<h2 class="text-xl font-bold text-gray-900 dark:text-white">
									{getCategoryName(category)}
								</h2>
								<!-- Running Total for this category -->
								{#if categoryTotal > 0}
									<span class="text-sm font-medium px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
										{categoryTotal.toFixed(2)}% allocated
									</span>
								{/if}
							</div>
							
							<div class="space-y-3">
								{#each tokens as token}
									<div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
										<!-- Token Info -->
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="font-semibold text-gray-900 dark:text-white">
													{token.symbol}
												</span>
												<span class="text-sm text-gray-500 dark:text-gray-400 truncate">
													{token.name}
												</span>
											</div>
											<div class="text-sm text-gray-600 dark:text-gray-300 mt-1">
												{#if prices[token.symbol]}
													${formatPrice(prices[token.symbol])}
												{:else}
													<span class="text-gray-400">Price unavailable</span>
												{/if}
											</div>
										</div>

										<!-- Percentage Input with Quick Fill -->
										<div class="flex items-center gap-2">
											<div class="relative">
												<input
													type="number"
													value={allocations[token.symbol] || ''}
													oninput={(e) => handlePercentageChange(token.symbol, e.target.value)}
													placeholder="0"
													min="0"
													max="100"
													step="0.01"
													class="w-24 px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
												/>
												<!-- Quick fill remaining button -->
												{#if remainingPercentage > 0 && remainingPercentage < 100}
													<button
														type="button"
														onclick={() => handlePercentageChange(token.symbol, remainingPercentage.toFixed(2))}
														class="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
														title={`Fill remaining ${remainingPercentage.toFixed(2)}%`}
													>
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
														</svg>
													</button>
												{/if}
											</div>
											<span class="text-gray-600 dark:text-gray-300">%</span>
										</div>

										<!-- Token Amount -->
										<div class="w-32 text-right">
											{#if tokenAmounts[token.symbol]}
												<div class="text-sm font-medium text-gray-900 dark:text-white">
													{tokenAmounts[token.symbol].amount.toFixed(6)}
												</div>
												<div class="text-xs text-gray-500 dark:text-gray-400">
													${tokenAmounts[token.symbol].usdValue.toFixed(2)}
												</div>
											{:else}
												<span class="text-sm text-gray-400">-</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<!-- Summary Panel (Right - 1 column) -->
				<div class="lg:col-span-1">
					<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sticky top-8 border border-gray-200 dark:border-gray-700">
						<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
							<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							Allocation Summary
						</h2>

						<!-- Total Percentage -->
						<div class="mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl border border-gray-200 dark:border-gray-600">
							<div class="flex items-center justify-between mb-3">
								<span class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Allocated</span>
								<span class="text-3xl font-bold {isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} transition-colors duration-300">
									{totalPercentage.toFixed(2)}%
								</span>
							</div>
							
							<!-- Remaining Percentage Display -->
							{#if !isValid && remainingPercentage !== 0}
								<div class="mb-3 p-3 bg-{remainingPercentage > 0 ? 'blue' : 'red'}-50 dark:bg-{remainingPercentage > 0 ? 'blue' : 'red'}-900/20 border border-{remainingPercentage > 0 ? 'blue' : 'red'}-200 dark:border-{remainingPercentage > 0 ? 'blue' : 'red'}-800 rounded-lg">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium text-{remainingPercentage > 0 ? 'blue' : 'red'}-700 dark:text-{remainingPercentage > 0 ? 'blue' : 'red'}-300">
											{remainingPercentage > 0 ? 'Remaining' : 'Over Limit'}
										</span>
										<span class="text-2xl font-bold text-{remainingPercentage > 0 ? 'blue' : 'red'}-700 dark:text-{remainingPercentage > 0 ? 'blue' : 'red'}-300">
											{Math.abs(remainingPercentage).toFixed(2)}%
										</span>
									</div>
									{#if remainingPercentage > 0}
										<p class="text-xs text-{remainingPercentage > 0 ? 'blue' : 'red'}-600 dark:text-{remainingPercentage > 0 ? 'blue' : 'red'}-400 mt-2">
											💡 Tip: Hover over any token input to quickly fill the remaining percentage
										</p>
									{/if}
								</div>
							{/if}
							
							<!-- Progress Bar -->
							<div class="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
								<div 
									class="h-full transition-all duration-500 ease-out {isValid ? 'bg-gradient-to-r from-green-500 to-green-600' : totalPercentage > 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}"
									style="width: {Math.min(totalPercentage, 100)}%"
								></div>
								{#if totalPercentage > 0}
									<div class="absolute inset-0 flex items-center justify-center">
										<span class="text-xs font-bold text-white drop-shadow-lg">
											{Math.min(totalPercentage, 100).toFixed(0)}%
										</span>
									</div>
								{/if}
							</div>

							{#if !isValid}
								<div class="mt-3 flex items-center gap-2 text-sm {remainingPercentage > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									{remainingPercentage > 0 ? `${remainingPercentage.toFixed(2)}% remaining` : `${Math.abs(remainingPercentage).toFixed(2)}% over limit`}
								</div>
							{:else}
								<div class="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-pulse">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Ready to create
								</div>
							{/if}
						</div>

						<!-- Selected Tokens -->
						<div class="mb-6">
							<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
								Selected Tokens ({selectedTokens.length})
							</h3>
							
							{#if selectedTokens.length > 0}
								<div class="space-y-2 max-h-64 overflow-y-auto">
									{#each selectedTokens as symbol}
										<div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
											<span class="font-medium text-gray-900 dark:text-white">{symbol}</span>
											<span class="text-sm text-gray-600 dark:text-gray-300">
												{allocations[symbol].toFixed(2)}%
											</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-gray-500 dark:text-gray-400 italic">
									No tokens selected
								</p>
							{/if}
						</div>

						<!-- Portfolio Value Breakdown -->
						<div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<h3 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
								Portfolio Value
							</h3>
							<p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
								${portfolio.currentValue.toFixed(2)}
							</p>
						</div>

						<!-- Error Message -->
						{#if error}
							<div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
								<p class="text-sm text-red-800 dark:text-red-200">{error}</p>
							</div>
						{/if}

						<!-- Success Message -->
						{#if success}
							<div class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
								<p class="text-sm text-green-800 dark:text-green-200">{success}</p>
							</div>
						{/if}

						<!-- Action Buttons -->
						<div class="space-y-3">
							<button
								onclick={confirmAndCreate}
								disabled={!isValid || selectedTokens.length === 0 || isExecuting}
								class="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								{isExecuting ? 'Creating Portfolio...' : 'Confirm & Create Portfolio'}
							</button>
							
							<button
								onclick={() => goto('/simulated/dashboard')}
								disabled={isExecuting}
								class="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Deposit Modal -->
{#if showDepositModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onclick={closeDepositModal}>
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 animate-slideUp" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
					💰 Deposit Funds
				</h2>
				<button
					onclick={closeDepositModal}
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="mb-6">
				<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
					Deposit funds will be automatically distributed across your existing holdings based on their current percentages.
				</p>
				
				<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
					<p class="text-sm text-blue-800 dark:text-blue-200">
						Available Balance: <span class="font-bold">${$simulationBalance.toFixed(2)}</span>
					</p>
				</div>

				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Deposit Amount (USD)
				</label>
				<input
					type="number"
					bind:value={depositAmount}
					placeholder="0.00"
					min="0"
					max={$simulationBalance}
					step="0.01"
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
					disabled={modalProcessing}
				/>
			</div>

			{#if modalError}
				<div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p class="text-sm text-red-800 dark:text-red-200">{modalError}</p>
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					onclick={closeDepositModal}
					disabled={modalProcessing}
					class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleDeposit}
					disabled={modalProcessing || !depositAmount || parseFloat(depositAmount) <= 0}
					class="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{modalProcessing ? 'Processing...' : 'Confirm Deposit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Withdraw Modal -->
{#if showWithdrawModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onclick={closeWithdrawModal}>
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 animate-slideUp" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
					💸 Withdraw Funds
				</h2>
				<button
					onclick={closeWithdrawModal}
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="mb-6">
				<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
					Withdraw funds by proportionally reducing all holdings. The percentage distribution will remain the same.
				</p>
				
				<div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
					<p class="text-sm text-orange-800 dark:text-orange-200">
						Portfolio Value: <span class="font-bold">${portfolio?.currentValue.toFixed(2)}</span>
					</p>
				</div>

				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Withdraw Amount (USD)
				</label>
				<input
					type="number"
					bind:value={withdrawAmount}
					placeholder="0.00"
					min="0"
					max={portfolio?.currentValue}
					step="0.01"
					class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
					disabled={modalProcessing}
				/>
			</div>

			{#if modalError}
				<div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p class="text-sm text-red-800 dark:text-red-200">{modalError}</p>
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					onclick={closeWithdrawModal}
					disabled={modalProcessing}
					class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleWithdraw}
					disabled={modalProcessing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
					class="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{modalProcessing ? 'Processing...' : 'Confirm Withdrawal'}
				</button>
			</div>
		</div>
	</div>
{/if}


<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.2s ease-out;
	}

	.animate-slideUp {
		animation: slideUp 0.3s ease-out;
	}
</style>
