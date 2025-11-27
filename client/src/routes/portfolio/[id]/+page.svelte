<script>
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { walletAddress } from '$lib/stores/wallet.js';
	import { getPortfolio, updatePortfolio, currentPortfolio } from '$lib/stores/portfolios.js';
	import { portfolioContractService } from '$lib/services/PortfolioContractService.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import { notify } from '$lib/notify.js';
	import { uniswapSwapService } from '$lib/services/UniswapSwapService.js';
	import SwapProgressModal from '$lib/components/SwapProgressModal.svelte';
	import PortfolioSettings from '$lib/components/PortfolioSettings.svelte';
	import { portfolioSettingsService } from '$lib/services/PortfolioSettingsService.js';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import RouteGuard from '$lib/components/RouteGuard.svelte';
	import TradeModal from '$lib/components/TradeModal.svelte';
	import { manualTradingIntegrationService } from '$lib/services/ManualTradingIntegrationService.js';
	import { globalPricesStore, globalStorage } from '$lib/stores/globalStorage.js';
	import { formatPrice as utilFormatPrice, formatChange as utilFormatChange, isValidPrice } from '$lib/utils/priceFormatter.js';
	import SafePriceDisplay from '$lib/components/SafePriceDisplay.svelte';
	
	// Get portfolio ID from URL params
	let portfolioId = $state($page.params.id);
	
	// Portfolio state
	let portfolio = $state(null);
	let loading = $state(true);
	let error = $state(null);
	
	// Token selection and allocation state
	let availableTokens = $state([]);
	let selectedTokens = $state([]);
	let allocations = $state({}); // { tokenAddress: percentage }
	let totalAllocation = $state(0);
	let allocationError = $state('');
	
	// Swap execution state
	let isSwapping = $state(false);
	let showSwapModal = $state(false);
	let swapProgress = $state([]);
	let swapTotalProgress = $state(0);
	let hasExecutedSwaps = $state(false);
	
	// Blockchain integration state
	let isSyncingWithBlockchain = $state(false);
	let onChainAllocations = $state([]);
	let hasOnChainPortfolio = $state(false);
	let unsubscribeEvents = null;
	
	// Manual trading state
	let showTradeModal = $state(false);
	let tradeModalDefaultTokenIn = $state(null);
	let tradeModalDefaultTokenOut = $state(null);
	let isManualTradingInitialized = $state(false);
	
	// Price formatting helpers
	function formatPrice(price) {
		if (!price || price === null) return '$0.00';
		return `$${Number(price).toFixed(2)}`;
	}
	
	function formatChange(change) {
		if (!change) return '+0.00%';
		const sign = change >= 0 ? '+' : '';
		return `${sign}${Number(change).toFixed(2)}%`;
	}
	
	// Safe price access helper - uses globalStorage safe accessors (Requirement 4.2)
	function getTokenPrice(tokenAddress) {
		// Use safe accessor from globalStorage (Requirement 3.3, 4.2)
		const priceData = globalStorage.getPriceSafe(tokenAddress);
		return {
			price: priceData?.price ?? priceData?.current ?? null,
			change: priceData?.change ?? priceData?.change24h ?? null,
			isAvailable: globalStorage.isPriceAvailable(tokenAddress),
			isStale: globalStorage.isStale(tokenAddress, 5 * 60 * 1000)
		};
	}
	
	// Load portfolio data
	onMount(async () => {
		if (!$walletAddress) {
			notify.error('Please connect your wallet first');
			goto('/');
			return;
		}
		
		portfolioId = $page.params.id;
		await loadPortfolio();
		initializeTokenSelection();
		
		// Load on-chain portfolio data
		await loadOnChainPortfolio();
		
		// Subscribe to contract events
		subscribeToContractEvents();
		
		// Initialize manual trading service
		await initializeManualTrading();
	});
	
	onDestroy(() => {
		// Unsubscribe from contract events
		if (unsubscribeEvents) {
			unsubscribeEvents();
		}
	});
	
	async function loadPortfolio() {
		loading = true;
		error = null;
		
		try {
			portfolio = await getPortfolio(portfolioId);
			
			// Initialize allocations from existing portfolio data
			if (portfolio.allocations && portfolio.allocations.length > 0) {
				const newAllocations = {};
				const newSelectedTokens = [];
				
				portfolio.allocations.forEach(alloc => {
					newAllocations[alloc.tokenAddress] = alloc.percentage;
					
					// Mark token as selected
					const token = INITIAL_TOKEN_LIST.find(t => t.address === alloc.tokenAddress);
					if (token && !newSelectedTokens.find(t => t.address === token.address)) {
						newSelectedTokens.push(token);
					}
				});
				
				allocations = newAllocations;
				selectedTokens = newSelectedTokens;
			}
			
			calculateTotalAllocation();
			
			// Apply portfolio settings to risk management and rebalancing services
			try {
				await portfolioSettingsService.applyAllSettings(portfolioId, portfolio);
			} catch (settingsError) {
				console.warn('Failed to apply portfolio settings:', settingsError);
				// Don't fail the whole load if settings fail
			}
		} catch (err) {
			console.error('Error loading portfolio:', err);
			error = err.message;
			notify.error(`Failed to load portfolio: ${err.message}`);
		} finally {
			loading = false;
		}
	}
	
	function initializeTokenSelection() {
		// Initialize available tokens from INITIAL_TOKEN_LIST
		availableTokens = INITIAL_TOKEN_LIST.map(token => ({
			...token,
			selected: selectedTokens.some(t => t.address === token.address)
		}));
	}
	
	function toggleTokenSelection(token) {
		const index = selectedTokens.findIndex(t => t.address === token.address);
		
		if (index >= 0) {
			// Remove token
			selectedTokens = selectedTokens.filter(t => t.address !== token.address);
			const newAllocations = { ...allocations };
			delete newAllocations[token.address];
			allocations = newAllocations;
		} else {
			// Add token
			selectedTokens = [...selectedTokens, token];
			allocations = { ...allocations, [token.address]: 0 };
		}
		
		calculateTotalAllocation();
	}
	
	function updateAllocation(tokenAddress, value) {
		const percentage = parseFloat(value) || 0;
		allocations = { ...allocations, [tokenAddress]: percentage };
		calculateTotalAllocation();
	}
	
	function calculateTotalAllocation() {
		totalAllocation = Object.values(allocations).reduce((sum, val) => sum + val, 0);
		
		// Validate total allocation
		if (totalAllocation > 100) {
			allocationError = 'Total allocation cannot exceed 100%';
		} else if (selectedTokens.length > 0 && totalAllocation < 100) {
			allocationError = 'Total allocation must equal 100%';
		} else {
			allocationError = '';
		}
	}
	
	function autoDistribute() {
		if (selectedTokens.length === 0) {
			notify.warning('Please select at least one token first');
			return;
		}
		
		const equalPercentage = 100 / selectedTokens.length;
		const newAllocations = {};
		
		selectedTokens.forEach(token => {
			newAllocations[token.address] = parseFloat(equalPercentage.toFixed(2));
		});
		
		// Adjust last token to ensure exactly 100%
		const lastToken = selectedTokens[selectedTokens.length - 1];
		const currentTotal = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);
		newAllocations[lastToken.address] = parseFloat((newAllocations[lastToken.address] + (100 - currentTotal)).toFixed(2));
		
		allocations = newAllocations;
		calculateTotalAllocation();
		notify.success('Allocations distributed equally');
	}
	
	async function saveAllocations() {
		if (allocationError) {
			notify.error(allocationError);
			return;
		}
		
		if (selectedTokens.length === 0) {
			notify.error('Please select at least one token');
			return;
		}
		
		if (totalAllocation !== 100) {
			notify.error('Total allocation must equal 100%');
			return;
		}
		
		try {
			const allocationData = selectedTokens.map(token => ({
				tokenAddress: token.address,
				tokenSymbol: token.symbol,
				tokenName: token.name,
				percentage: allocations[token.address]
			}));
			
			await updatePortfolio(portfolioId, {
				allocations: allocationData,
				assetCount: selectedTokens.length
			});
			
			notify.success('Portfolio allocations saved successfully!');
			hasExecutedSwaps = false; // Reset swap flag when allocations change
		} catch (err) {
			console.error('Error saving allocations:', err);
			notify.error(`Failed to save allocations: ${err.message}`);
		}
	}
	
	async function executeSwaps() {
		if (!portfolio || !portfolio.balance) {
			notify.error('No balance available for swaps');
			return;
		}
		
		if (selectedTokens.length === 0) {
			notify.error('Please select tokens and save allocations first');
			return;
		}
		
		if (totalAllocation !== 100) {
			notify.error('Total allocation must equal 100%');
			return;
		}
		
		try {
			isSwapping = true;
			showSwapModal = true;
			
			// Initialize swap progress
			swapProgress = selectedTokens.map(token => ({
				token: token.symbol,
				tokenAddress: token.address,
				allocation: allocations[token.address],
				status: 'pending',
				message: 'Waiting to start...',
				transactionHash: null,
				error: null
			}));
			swapTotalProgress = 0;
			
			// Prepare allocations for swap service
			const allocationData = selectedTokens.map(token => ({
				tokenAddress: token.address,
				tokenSymbol: token.symbol,
				tokenName: token.name,
				percentage: allocations[token.address]
			}));
			
			// Execute swaps with progress callback
			const result = await uniswapSwapService.executePortfolioSwaps(
				portfolio.balance,
				allocationData,
				1, // 1% slippage
				(progress) => {
					// Update progress for specific token
					const tokenIndex = swapProgress.findIndex(s => s.token === progress.token);
					if (tokenIndex >= 0) {
						swapProgress[tokenIndex] = {
							...swapProgress[tokenIndex],
							status: progress.status,
							message: progress.message,
							transactionHash: progress.transactionHash || swapProgress[tokenIndex].transactionHash,
							error: progress.error || null
						};
						swapProgress = [...swapProgress]; // Trigger reactivity
					}
					swapTotalProgress = progress.progress;
				}
			);
			
			if (result.success) {
				notify.success('All token swaps completed successfully!');
				hasExecutedSwaps = true;
				
				// Update portfolio with swap results
				await updatePortfolio(portfolioId, {
					swapsExecuted: true,
					lastSwapDate: new Date().toISOString()
				});
			} else {
				notify.warning(`Swaps completed with ${result.failed} error(s)`);
				hasExecutedSwaps = true;
			}
			
		} catch (err) {
			console.error('Error executing swaps:', err);
			notify.error(`Failed to execute swaps: ${err.message}`);
			
			// Mark all pending swaps as error
			swapProgress = swapProgress.map(s => 
				s.status === 'pending' || s.status === 'swapping' 
					? { ...s, status: 'error', error: err.message }
					: s
			);
		} finally {
			isSwapping = false;
		}
	}
	
	function closeSwapModal() {
		showSwapModal = false;
		// Reload portfolio to get updated balances
		loadPortfolio();
	}
	
	function goBack() {
		goto('/');
	}
	
	// ========== BLOCKCHAIN INTEGRATION FUNCTIONS ==========
	
	/**
	 * Load portfolio allocation from blockchain
	 */
	async function loadOnChainPortfolio() {
		if (!$walletAddress) return;
		
		try {
			// Get on-chain allocations
			const allocations = await portfolioContractService.getPortfolioAllocation($walletAddress);
			
			if (allocations && allocations.length > 0) {
				onChainAllocations = allocations;
				hasOnChainPortfolio = true;
				
				console.log('✅ Loaded on-chain portfolio:', allocations);
				
				// Optionally sync with local state if not already set
				if (selectedTokens.length === 0) {
					syncFromBlockchain();
				}
			} else {
				hasOnChainPortfolio = false;
				console.log('ℹ️ No on-chain portfolio found for this wallet');
			}
		} catch (error) {
			console.error('Error loading on-chain portfolio:', error);
			// Don't show error to user - it's okay if there's no on-chain portfolio yet
		}
	}
	
	/**
	 * Sync local portfolio state from blockchain data
	 */
	function syncFromBlockchain() {
		if (!onChainAllocations || onChainAllocations.length === 0) {
			notify.info('No on-chain portfolio data to sync');
			return;
		}
		
		const newAllocations = {};
		const newSelectedTokens = [];
		
		onChainAllocations.forEach(alloc => {
			// Find token in available tokens list
			const token = INITIAL_TOKEN_LIST.find(t => 
				t.address.toLowerCase() === alloc.address.toLowerCase()
			);
			
			if (token) {
				newAllocations[token.address] = alloc.allocation;
				newSelectedTokens.push(token);
			}
		});
		
		allocations = newAllocations;
		selectedTokens = newSelectedTokens;
		calculateTotalAllocation();
		
		notify.success('Portfolio synced from blockchain');
	}
	
	/**
	 * Save allocations to blockchain
	 */
	async function saveToBlockchain() {
		if (allocationError) {
			notify.error(allocationError);
			return;
		}
		
		if (selectedTokens.length === 0) {
			notify.error('Please select at least one token');
			return;
		}
		
		if (totalAllocation !== 100) {
			notify.error('Total allocation must equal 100%');
			return;
		}
		
		isSyncingWithBlockchain = true;
		
		try {
			// Prepare allocation data for contract
			const tokenAllocations = selectedTokens.map(token => ({
				address: token.address,
				allocation: allocations[token.address]
			}));
			
			// Create or update portfolio on blockchain
			let result;
			if (hasOnChainPortfolio) {
				notify.info('Updating portfolio on blockchain...');
				result = await portfolioContractService.updatePortfolioAllocation(tokenAllocations);
			} else {
				notify.info('Creating portfolio on blockchain...');
				result = await portfolioContractService.createPortfolio(tokenAllocations);
			}
			
			if (result.success) {
				notify.success('Portfolio saved to blockchain successfully!');
				
				// Update local portfolio with blockchain data
				await updatePortfolio(portfolioId, {
					onChain: true,
					transactionHash: result.transactionHash,
					blockNumber: result.blockNumber,
					lastBlockchainSync: new Date().toISOString()
				});
				
				// Reload on-chain data
				await loadOnChainPortfolio();
			}
		} catch (error) {
			console.error('Error saving to blockchain:', error);
			notify.error(`Failed to save to blockchain: ${error.message}`);
		} finally {
			isSyncingWithBlockchain = false;
		}
	}
	
	/**
	 * Subscribe to contract events for real-time updates
	 */
	function subscribeToContractEvents() {
		try {
			unsubscribeEvents = portfolioContractService.subscribeToEvents({
				onAllocationUpdated: (event) => {
					console.log('📡 Portfolio allocation updated on-chain:', event);
					notify.info('Portfolio updated on blockchain');
					
					// Reload on-chain data
					loadOnChainPortfolio();
				},
				onRiskParametersSet: (event) => {
					console.log('📡 Risk parameters updated on-chain:', event);
					notify.info(`${event.type} updated on blockchain`);
				}
			});
		} catch (error) {
			console.error('Error subscribing to contract events:', error);
			// Don't fail if event subscription fails
		}
	}
	
	/**
	 * Combined save function - saves to both backend and blockchain
	 */
	async function saveAllocationsComplete() {
		// First save to backend (fast)
		await saveAllocations();
		
		// Then save to blockchain (slower, requires transaction)
		await saveToBlockchain();
	}
	
	// ========== MANUAL TRADING FUNCTIONS ==========
	
	/**
	 * Initialize manual trading integration service
	 */
	async function initializeManualTrading() {
		try {
			if (!manualTradingIntegrationService.isInitialized) {
				await manualTradingIntegrationService.initialize({
					confirmationTimeout: 30000,
					overrideCooldown: 60000
				});
			}
			isManualTradingInitialized = true;
			console.log('✅ Manual trading service initialized');
		} catch (error) {
			console.error('Failed to initialize manual trading service:', error);
			// Don't fail the whole page if manual trading fails to initialize
		}
	}
	
	/**
	 * Open manual buy modal for a specific token
	 */
	function openBuyModal(token = null) {
		if (!isManualTradingInitialized) {
			notify.warning('Manual trading is not available yet. Please wait...');
			return;
		}
		
		// Set default tokens for buy operation
		// Buy means: sell REACT (or stablecoin) to get the target token
		tradeModalDefaultTokenIn = INITIAL_TOKEN_LIST.find(t => t.symbol === 'USDC')?.address || null;
		tradeModalDefaultTokenOut = token?.address || null;
		
		showTradeModal = true;
		notify.info('Manual buy - this will override automation for this trade');
	}
	
	/**
	 * Open manual sell modal for a specific token
	 */
	function openSellModal(token = null) {
		if (!isManualTradingInitialized) {
			notify.warning('Manual trading is not available yet. Please wait...');
			return;
		}
		
		// Set default tokens for sell operation
		// Sell means: sell the target token to get REACT (or stablecoin)
		tradeModalDefaultTokenIn = token?.address || null;
		tradeModalDefaultTokenOut = INITIAL_TOKEN_LIST.find(t => t.symbol === 'USDC')?.address || null;
		
		showTradeModal = true;
		notify.info('Manual sell - this will override automation for this trade');
	}
	
	/**
	 * Handle successful manual trade
	 */
	function handleManualTradeComplete() {
		showTradeModal = false;
		notify.success('Manual trade completed successfully!');
		
		// Reload portfolio to reflect changes
		loadPortfolio();
		loadOnChainPortfolio();
	}
	
	/**
	 * Close trade modal
	 */
	function closeTradeModal() {
		showTradeModal = false;
		tradeModalDefaultTokenIn = null;
		tradeModalDefaultTokenOut = null;
	}
	
	// Derived state
	let isValid = $derived(selectedTokens.length > 0 && totalAllocation === 100 && !allocationError);
	let allocationColor = $derived(totalAllocation === 100 ? 'text-green-600' : totalAllocation > 100 ? 'text-red-600' : totalAllocation > 0 ? 'text-yellow-600' : 'text-gray-400');
	let progressColor = $derived(totalAllocation === 100 ? 'bg-green-500' : totalAllocation > 100 ? 'bg-red-500' : 'bg-yellow-500');
</script>

<svelte:head>
	<title>{portfolio?.name || 'Portfolio'} - Reactive Portfolio Manager</title>
</svelte:head>

<RouteGuard requireWallet={true} message="Please connect your wallet to view portfolios">
<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<Breadcrumb />
		{#if loading}
			<div class="flex items-center justify-center py-20">
				<div class="text-center">
					<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p class="text-gray-600 dark:text-gray-400">Loading portfolio...</p>
				</div>
			</div>
		{:else if error}
			<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
				<svg class="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Portfolio</h2>
				<p class="text-red-600 dark:text-red-400 mb-6">{error}</p>
				<button
					onclick={goBack}
					class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
				>
					Back to Home
				</button>
			</div>
		{:else if portfolio}
			<!-- Header -->
			<div class="mb-8">
				<div class="flex items-center gap-3 mb-4">
					<button
						onclick={goBack}
						class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
						Back to Home
					</button>
					<span class="text-gray-400">|</span>
					<button
						onclick={() => goto('/portfolios')}
						class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
						</svg>
						All Portfolios
					</button>
				</div>
				
				<div class="flex items-start justify-between">
					<div>
						<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
							{portfolio.name}
						</h1>
						{#if portfolio.description}
							<p class="text-gray-600 dark:text-gray-400">
								{portfolio.description}
							</p>
						{/if}
					</div>
					
					<div class="text-right">
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Portfolio Balance</p>
						<p class="text-3xl font-bold text-gray-900 dark:text-white">
							{portfolio.balance || '0'} REACT
						</p>
					</div>
				</div>
			</div>
			
			<!-- Main Content Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Token Selection Panel -->
				<div class="lg:col-span-2 space-y-8">
					<!-- Manual Trading Quick Actions -->
					<div class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl shadow-lg p-6 border border-purple-200 dark:border-purple-800">
						<div class="flex items-center justify-between mb-4">
							<div>
								<h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
									<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									Manual Trading
								</h2>
								<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
									Override automation and execute trades manually
								</p>
							</div>
							<div class="flex items-center gap-2">
								<span class="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
									Manual Control
								</span>
							</div>
						</div>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<!-- Quick Buy Button -->
							<button
								onclick={() => openBuyModal()}
								class="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
							>
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								<span>Quick Buy</span>
							</button>
							
							<!-- Quick Sell Button -->
							<button
								onclick={() => openSellModal()}
								class="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
							>
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
								</svg>
								<span>Quick Sell</span>
							</button>
						</div>
						
						<!-- Info Box -->
						<div class="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-200 dark:border-purple-800">
							<div class="flex gap-2">
								<svg class="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p class="text-xs text-gray-700 dark:text-gray-300">
									Manual trades override automation temporarily. Your portfolio settings remain active after the trade completes.
								</p>
							</div>
						</div>
					</div>
					<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
						<div class="flex items-center justify-between mb-6">
							<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
								Token Selection & Allocation
							</h2>
							<button
								onclick={autoDistribute}
								class="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={selectedTokens.length === 0}
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Auto-Distribute
							</button>
						</div>
						
						<!-- Token Categories -->
						<div class="space-y-6">
							{#each ['core', 'stable', 'alt', 'meme', 'reactive'] as category}
								{@const categoryTokens = INITIAL_TOKEN_LIST.filter(t => t.category === category)}
								{#if categoryTokens.length > 0}
									<div>
										<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
											{category === 'core' ? 'Core Assets' : 
											 category === 'stable' ? 'Stablecoins' : 
											 category === 'alt' ? 'Altcoins' : 
											 category === 'meme' ? 'Memecoins' : 
											 'Reactive Network'}
										</h3>
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{#each categoryTokens as token}
												{@const isSelected = selectedTokens.some(t => t.address === token.address)}
												{@const borderClass = isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
												{@const priceData = getTokenPrice(token.address)}
												<div class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all {borderClass}">
													<input
														type="checkbox"
														id="token-{token.address}"
														checked={isSelected}
														onchange={() => toggleTokenSelection(token)}
														class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
													/>
													<label for="token-{token.address}" class="flex-1 cursor-pointer">
														<div class="flex items-center justify-between gap-3">
															<div class="flex-shrink-0">
																<p class="font-semibold text-gray-900 dark:text-white">
																	{token.symbol}
																</p>
																<p class="text-xs text-gray-500 dark:text-gray-400">
																	{token.name}
																</p>
															</div>
															<div class="flex items-center gap-3">
																<!-- Price Info -->
																<div class="text-right">
																	<p class="text-sm font-medium text-gray-900 dark:text-white">
																		{formatPrice(priceData.price)}
																	</p>
																	<p class="text-xs font-medium"
																	   class:text-green-600={priceData.change >= 0}
																	   class:dark:text-green-400={priceData.change >= 0}
																	   class:text-red-600={priceData.change < 0}
																	   class:dark:text-red-400={priceData.change < 0}>
																		{formatChange(priceData.change)}
																	</p>
																</div>
																<!-- Allocation Input -->
																{#if isSelected}
																	<div class="flex items-center gap-2">
																		<input
																			type="number"
																			min="0"
																			max="100"
																			step="0.01"
																			value={allocations[token.address] || 0}
																			oninput={(e) => updateAllocation(token.address, e.target.value)}
																			class="w-20 px-2 py-1 text-sm text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
																			onclick={(e) => e.stopPropagation()}
																		/>
																		<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
																	</div>
																{/if}
															</div>
														</div>
													</label>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Portfolio Settings Panel -->
				<PortfolioSettings 
					portfolioId={portfolioId}
					onSave={async (settings) => {
						console.log('Settings saved:', settings);
						// Reapply settings to services
						try {
							await portfolioSettingsService.applyAllSettings(portfolioId, portfolio);
							notify.success('Portfolio settings applied successfully');
						} catch (err) {
							console.error('Failed to apply settings:', err);
							notify.warning('Settings saved but failed to apply to services');
						}
					}}
				/>
				
				<!-- Summary Panel -->
				<div class="lg:col-span-1">
					<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sticky top-8">
						<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6">
							Allocation Summary
						</h2>
						
						<!-- Selected Tokens Count -->
						<div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm text-gray-600 dark:text-gray-400">Selected Tokens</span>
								<span class="text-2xl font-bold text-gray-900 dark:text-white">
									{selectedTokens.length}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">Total Allocation</span>
								<span class="text-2xl font-bold {allocationColor}">
									{totalAllocation.toFixed(2)}%
								</span>
							</div>
						</div>
						
						<!-- Allocation Progress Bar -->
						<div class="mb-6">
							<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div 
									class="h-full transition-all duration-300 {progressColor}"
									style="width: {Math.min(totalAllocation, 100)}%"
								></div>
							</div>
							{#if allocationError}
								<p class="mt-2 text-sm text-red-600 dark:text-red-400">
									{allocationError}
								</p>
							{:else if totalAllocation === 100}
								<p class="mt-2 text-sm text-green-600 dark:text-green-400">
									✓ Allocation complete
								</p>
							{:else if totalAllocation > 0}
								<p class="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
									{(100 - totalAllocation).toFixed(2)}% remaining
								</p>
							{/if}
						</div>
						
						<!-- Selected Tokens List -->
						{#if selectedTokens.length > 0}
							<div class="mb-6">
								<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
									Selected Tokens
								</h3>
								<div class="space-y-2 max-h-64 overflow-y-auto">
									{#each selectedTokens as token}
										<div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
											<div class="flex items-center gap-2 flex-1">
												<span class="font-medium text-gray-900 dark:text-white">
													{token.symbol}
												</span>
												<span class="font-semibold text-blue-600 dark:text-blue-400">
													{allocations[token.address]?.toFixed(2) || 0}%
												</span>
											</div>
											<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button
													onclick={() => openBuyModal(token)}
													class="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
													title="Buy {token.symbol}"
													aria-label="Buy {token.symbol}"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
													</svg>
												</button>
												<button
													onclick={() => openSellModal(token)}
													class="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
													title="Sell {token.symbol}"
													aria-label="Sell {token.symbol}"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
													</svg>
												</button>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
								<svg class="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								</svg>
								<p class="text-sm text-gray-600 dark:text-gray-400">
									No tokens selected yet
								</p>
							</div>
						{/if}
						
						<!-- Action Buttons -->
						<div class="space-y-3">
							{#if isValid}
								<button
									onclick={saveAllocations}
									disabled={false}
									class="w-full px-6 py-3 rounded-lg font-semibold transition-all transform bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:scale-105"
								>
									Save Allocations
								</button>
							{:else}
								<button
									onclick={saveAllocations}
									disabled={true}
									class="w-full px-6 py-3 rounded-lg font-semibold transition-all transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gray-300 dark:bg-gray-700 text-gray-500"
								>
									Complete Allocation to Save
								</button>
							{/if}
							
							{#if portfolio?.allocations && portfolio.allocations.length > 0 && !hasExecutedSwaps}
								<button
									onclick={executeSwaps}
									disabled={isSwapping || !isValid}
									class="w-full px-6 py-3 rounded-lg font-semibold transition-all transform bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
								>
									{#if isSwapping}
										<span class="flex items-center justify-center gap-2">
											<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Executing Swaps...
										</span>
									{:else}
										Execute Token Swaps
									{/if}
								</button>
							{/if}
							
							{#if hasExecutedSwaps}
								<div class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
									<svg class="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<p class="text-sm font-medium text-green-900 dark:text-green-100">
										Swaps Executed
									</p>
								</div>
							{/if}
						</div>
						
						<!-- Info Box -->
						<div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
							<div class="flex gap-2">
								<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div class="text-xs text-blue-900 dark:text-blue-100">
									<p class="font-medium mb-1">Next Steps:</p>
									<ul class="space-y-1 text-blue-700 dark:text-blue-300">
										<li>• Select tokens from the list</li>
										<li>• Set allocation percentages</li>
										<li>• Ensure total equals 100%</li>
										<li>• Save to update portfolio</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
</RouteGuard>

<!-- Swap Progress Modal -->
<SwapProgressModal 
	isOpen={showSwapModal}
	swaps={swapProgress}
	totalProgress={swapTotalProgress}
	onClose={closeSwapModal}
/>

<!-- Manual Trade Modal -->
<TradeModal 
	isOpen={showTradeModal}
	defaultTokenIn={tradeModalDefaultTokenIn}
	defaultTokenOut={tradeModalDefaultTokenOut}
	on:swapped={handleManualTradeComplete}
	on:close={closeTradeModal}
/>
