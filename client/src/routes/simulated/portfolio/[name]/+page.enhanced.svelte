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
		refreshPortfolioPrices
	} from '$lib/stores/simulation.js';
	import { simulationTradingService } from '$lib/services/SimulationTradingService.js';
	import priceService from '$lib/priceService.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import { formatPrice } from '$lib/utils/priceFormatter.js';

	// Get portfolio name from URL
	$: portfolioName = $page.params.name;
	$: portfolio = $simulationPortfolios[portfolioName];

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

	// Calculated values
	$: totalPercentage = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
	$: remainingPercentage = 100 - totalPercentage;
	$: isValid = Math.abs(totalPercentage - 100) < 0.01;
	$: selectedTokens = Object.keys(allocations).filter(symbol => allocations[symbol] > 0);

	// Calculate token amounts in real-time
	$: tokenAmounts = calculateTokenAmounts();

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

	// Check if prices are stale (older than 5 minutes)
	$: pricesAreStale = lastPriceFetchTime && (Date.now() - lastPriceFetchTime) > 5 * 60 * 1000;
</script>
