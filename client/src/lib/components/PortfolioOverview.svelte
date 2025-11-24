<script>
  import { onMount, onDestroy } from 'svelte';
  import { enhancedPriceDisplayService, enhancedPricesStore } from '../services/EnhancedPriceDisplayService.js';
  import { rebalancingEngine } from '../services/RebalancingEngine.js';
  import { rebalancingAnalysisStore } from '../services/RebalancingEngine.js';
  import { INITIAL_TOKEN_LIST } from '../config/network.js';
  import { formatPrice as utilFormatPrice, formatChange as utilFormatChange, isValidPrice } from '../utils/priceFormatter.js';
  import { globalStorage } from '../stores/globalStorage.js';
  import SafePriceDisplay from './SafePriceDisplay.svelte';
  
  // Portfolio state
  let portfolioAllocation = [];
  let totalValue = 0;
  let isLoading = true;
  let lastRebalanced = null;
  let driftAnalysis = null;
  let rebalancingRecommendations = [];
  
  // Enhanced price display with 18-decimal precision
  let enhancedPrices = {};
  let priceUpdateInterval;
  
  // Subscription cleanup
  let unsubscribePrices;
  let unsubscribeAnalysis;
  
  // Mock portfolio holdings (in a real app, this would come from the blockchain)
  const mockHoldings = {
    '0x1': 2.5,    // ETH
    '0x2': 0.8,    // WBTC  
    '0x3': 150,    // LINK
    '0x4': 45,     // UNI
    '0x5': 12544   // USDC
  };
  
  // Target allocations for drift calculation
  const targetAllocations = {
    '0x1': 0.35,   // ETH: 35%
    '0x2': 0.30,   // WBTC: 30%
    '0x3': 0.15,   // LINK: 15%
    '0x4': 0.10,   // UNI: 10%
    '0x5': 0.10    // USDC: 10%
  };
  
  // Color mapping for tokens
  const tokenColors = {
    'ETH': 'bg-blue-500',
    'WBTC': 'bg-orange-500', 
    'LINK': 'bg-indigo-500',
    'UNI': 'bg-pink-500',
    'USDC': 'bg-green-500'
  };
  
  onMount(async () => {
    try {
      // Initialize enhanced price display service
      await enhancedPriceDisplayService.initialize();
      
      // Initialize rebalancing engine
      await rebalancingEngine.initialize();
      
      // Subscribe to price updates
      unsubscribePrices = enhancedPricesStore.subscribe(prices => {
        enhancedPrices = prices;
        updatePortfolioData();
      });
      
      // Subscribe to rebalancing analysis
      unsubscribeAnalysis = rebalancingAnalysisStore.subscribe(analysis => {
        driftAnalysis = analysis.driftAnalysis;
        rebalancingRecommendations = analysis.recommendations || [];
      });
      
      // Initial data load
      await loadPortfolioData();
      
      // Set up periodic price updates (every 30 seconds)
      priceUpdateInterval = setInterval(async () => {
        try {
          await enhancedPriceDisplayService.fetchAllPrices();
        } catch (error) {
          console.warn('Failed to update prices:', error);
        }
      }, 30000);
      
    } catch (error) {
      console.error('Failed to initialize portfolio overview:', error);
      isLoading = false;
    }
  });
  
  onDestroy(() => {
    if (unsubscribePrices) unsubscribePrices();
    if (unsubscribeAnalysis) unsubscribeAnalysis();
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
  });
  
  async function loadPortfolioData() {
    try {
      isLoading = true;
      
      // Fetch initial prices
      await enhancedPriceDisplayService.fetchAllPrices();
      
      // Update portfolio data
      updatePortfolioData();
      
      // Perform drift analysis
      await performDriftAnalysis();
      
      isLoading = false;
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
      isLoading = false;
    }
  }
  
  function updatePortfolioData() {
    if (!enhancedPrices || Object.keys(enhancedPrices).length === 0) {
      return;
    }
    
    const allocation = [];
    let portfolioTotal = 0;
    
    // Calculate current portfolio values with safe price access (Requirement 1.2, 3.3, 4.2)
    for (const [tokenAddress, balance] of Object.entries(mockHoldings)) {
      // Use safe price accessor (Requirement 4.2)
      const priceData = enhancedPrices[tokenAddress] || globalStorage.getPriceSafe(tokenAddress);
      if (!priceData) continue;
      
      const token = INITIAL_TOKEN_LIST.find(t => t.address === tokenAddress);
      if (!token) continue;
      
      // Safe numeric validation before calculation (Requirement 4.3)
      const price = priceData?.price ?? priceData?.current ?? 0;
      if (!isValidPrice(price) || !isValidPrice(balance)) continue;
      
      const value = balance * price;
      portfolioTotal += value;
      
      allocation.push({
        symbol: token.symbol,
        name: token.name,
        address: tokenAddress,
        balance,
        value,
        // Percentage change with 2-decimal precision (requirement 1.2)
        change: priceData.percentageChange || 0,
        color: tokenColors[token.symbol] || 'bg-gray-500',
        price: priceData.price,
        precisePrice: priceData.precisePrice,
        confidence: priceData.confidence,
        isStale: enhancedPriceDisplayService.isPriceStale(tokenAddress)
      });
    }
    
    // Calculate percentages that sum to exactly 100% (requirement 1.3)
    allocation.forEach(token => {
      token.percentage = portfolioTotal > 0 ? (token.value / portfolioTotal) * 100 : 0;
    });
    
    // Ensure percentages sum to exactly 100%
    const totalPercentage = allocation.reduce((sum, token) => sum + token.percentage, 0);
    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      const adjustment = 100 / totalPercentage;
      allocation.forEach(token => {
        token.percentage *= adjustment;
      });
    }
    
    portfolioAllocation = allocation;
    totalValue = portfolioTotal;
  }
  
  async function performDriftAnalysis() {
    if (!portfolioAllocation.length) return;
    
    try {
      // Calculate current allocations as decimals
      const currentAllocations = {};
      portfolioAllocation.forEach(token => {
        currentAllocations[token.address] = token.percentage / 100;
      });
      
      // Analyze drift using rebalancing engine
      const analysis = rebalancingEngine.analyzeDrift(currentAllocations, targetAllocations);
      driftAnalysis = analysis;
      
    } catch (error) {
      console.error('Failed to perform drift analysis:', error);
    }
  }
  
  // Safe price formatting functions (Requirement 1.2, 4.1, 4.3)
  function formatPrice(price, decimals = 6) {
    return utilFormatPrice(price, { decimals, showCurrency: false, fallback: '0.000000' });
  }
  
  function formatPercentage(percentage, decimals = 2) {
    if (!isValidPrice(percentage)) return '0.00';
    return percentage.toFixed(decimals);
  }
  
  function getStatusColor(drift) {
    if (!drift) return 'text-green-600 dark:text-green-400';
    if (drift.maxDrift < 0.03) return 'text-green-600 dark:text-green-400'; // < 3%
    if (drift.maxDrift < 0.05) return 'text-yellow-600 dark:text-yellow-400'; // < 5%
    return 'text-red-600 dark:text-red-400'; // >= 5%
  }
  
  function getStatusText(drift) {
    if (!drift) return 'Portfolio is balanced';
    if (drift.maxDrift < 0.03) return 'Portfolio is balanced';
    if (drift.maxDrift < 0.05) return 'Minor drift detected';
    return 'Rebalancing recommended';
  }
  
  async function handleRebalanceClick() {
    if (!driftAnalysis?.needsRebalancing) return;
    
    try {
      // This would trigger the rebalancing process
      console.log('Triggering rebalancing...');
      // In a real implementation, this would call the rebalancing engine
      // await rebalancingEngine.executeRebalancing(currentHoldings, targetAllocations, totalValue);
    } catch (error) {
      console.error('Failed to trigger rebalancing:', error);
    }
  }
</script>
<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
  <!-- Header with enhanced total value display -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Allocation</h3>
    <div class="text-right">
      <p class="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
      {#if isLoading}
        <p class="text-xl font-bold text-gray-900 dark:text-white animate-pulse">Loading...</p>
      {:else}
        <p class="text-xl font-bold text-gray-900 dark:text-white">${formatPrice(totalValue, 2)}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {portfolioAllocation.length} assets • Updated {new Date().toLocaleTimeString()}
        </p>
      {/if}
    </div>
  </div>

  <!-- Enhanced allocation visualization bar -->
  <div class="mb-6">
    <div class="flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
      {#each portfolioAllocation as token (token.symbol)}
        <div 
          class={token.color} 
          style={`width:${formatPercentage(token.percentage)}%`} 
          title={`${token.symbol}: ${formatPercentage(token.percentage)}% (${token.isStale ? 'Stale price' : 'Live price'})`}
        ></div>
      {/each}
    </div>
  </div>

  <!-- Enhanced token list with precise values -->
  <div class="space-y-3">
    {#each portfolioAllocation as token (token.symbol)}
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div class="flex items-center">
          <div class={`w-3 h-3 ${token.color} rounded-full mr-3`}></div>
          <div>
            <div class="flex items-center">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{token.symbol}</p>
              {#if token.isStale}
                <span class="ml-2 px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Stale</span>
              {/if}
              {#if token.confidence < 0.8}
                <span class="ml-1 px-1 py-0.5 text-xs bg-orange-100 text-orange-800 rounded">Low Confidence</span>
              {/if}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">{token.name}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">
              {token.balance} tokens @ ${formatPrice(token.price, 6)}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-gray-900 dark:text-white">
            {formatPercentage(token.percentage)}%
          </p>
          <div class="flex items-center">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
              ${formatPrice(token.value, 2)}
            </span>
            <span 
              class="ml-1 text-xs font-medium" 
              class:text-green-500={token.change >= 0} 
              class:text-red-500={token.change < 0}
            >
              {token.change >= 0 ? '+' : ''}{formatPercentage(token.change)}%
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Enhanced rebalancing status and drift visualization -->
  <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500 dark:text-gray-400">Last Rebalanced</span>
      <span class="text-gray-900 dark:text-white">
        {lastRebalanced ? new Date(lastRebalanced).toLocaleDateString() : '2 days ago'}
      </span>
    </div>
    <div class="flex items-center justify-between text-sm mt-1">
      <span class="text-gray-500 dark:text-gray-400">Drift Threshold</span>
      <span class="text-gray-900 dark:text-white">±5%</span>
    </div>
    
    {#if driftAnalysis}
      <div class="flex items-center justify-between text-sm mt-1">
        <span class="text-gray-500 dark:text-gray-400">Max Drift</span>
        <span class="text-gray-900 dark:text-white">
          {formatPercentage(driftAnalysis.maxDrift * 100)}%
        </span>
      </div>
    {/if}

    <!-- Status indicator with rebalancing suggestions -->
    <div class="mt-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center text-sm">
          <div class={`w-2 h-2 rounded-full mr-2 ${driftAnalysis?.needsRebalancing ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <span class={`font-medium ${getStatusColor(driftAnalysis)}`}>
            {getStatusText(driftAnalysis)}
          </span>
        </div>
        
        {#if driftAnalysis?.needsRebalancing}
          <button 
            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            on:click={handleRebalanceClick}
          >
            Rebalance
          </button>
        {/if}
      </div>
      
      <!-- Drift details for tokens that need rebalancing -->
      {#if driftAnalysis?.tokens}
        <div class="mt-2 space-y-1">
          {#each Object.entries(driftAnalysis.tokens) as [address, tokenDrift]}
            {#if tokenDrift.needsRebalancing}
              {@const token = portfolioAllocation.find(t => t.address === address)}
              {#if token}
                <div class="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                  <span>{token.symbol} drift:</span>
                  <span class="font-medium">
                    {formatPercentage(tokenDrift.current * 100)}% → {formatPercentage(tokenDrift.target * 100)}%
                  </span>
                </div>
              {/if}
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>