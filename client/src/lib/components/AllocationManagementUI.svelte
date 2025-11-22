<script>
  import { onMount, onDestroy } from 'svelte';
  import { allocationManagementService } from '../services/AllocationManagementService.js';
  import { allocationStateStore, allocationAnalysisStore } from '../services/AllocationManagementService.js';
  import { rebalancingEngine } from '../services/RebalancingEngine.js';
  import { enhancedPriceDisplayService } from '../services/EnhancedPriceDisplayService.js';
  import { INITIAL_TOKEN_LIST } from '../config/network.js';
  
  // Component props
  export let currentPortfolioValue = 0;
  export let compact = false;
  
  // Allocation state
  let allocationState = {};
  let allocationAnalysis = {};
  let isLoading = true;
  let showAdvanced = false;
  
  // Auto-distribute mode
  let autoDistributeMode = false;
  let selectedTokens = [];
  let autoDistributionResult = {};
  
  // Custom allocation mode
  let customAllocations = {};
  let allocationErrors = {};
  let totalAllocation = 0;
  let isValidAllocation = false;
  
  // Rebalancing preview
  let rebalancingPreview = null;
  let showRebalancingPreview = false;
  let estimatedGasCost = 0;
  let estimatedSlippage = 0;
  
  // Liquidity analysis
  let liquidityWarnings = [];
  let liquidityChecking = false;
  
  // Available tokens for selection
  let availableTokens = [];
  
  // Subscription cleanup
  let unsubscribeState;
  let unsubscribeAnalysis;
  
  onMount(async () => {
    try {
      // Initialize allocation management service
      await allocationManagementService.initialize();
      
      // Subscribe to allocation stores
      unsubscribeState = allocationStateStore.subscribe(state => {
        allocationState = state;
        if (state.autoDistributeMode !== autoDistributeMode) {
          autoDistributeMode = state.autoDistributeMode;
        }
        updateCustomAllocationsFromState();
      });
      
      unsubscribeAnalysis = allocationAnalysisStore.subscribe(analysis => {
        allocationAnalysis = analysis;
        updateLiquidityWarnings();
        updateValidationResults();
      });
      
      // Load available tokens
      availableTokens = INITIAL_TOKEN_LIST.map(token => ({
        ...token,
        selected: false,
        allocation: 0
      }));
      
      // Initialize with current allocations if available
      await loadCurrentAllocations();
      
      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize allocation management UI:', error);
      isLoading = false;
    }
  });
  
  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (unsubscribeAnalysis) unsubscribeAnalysis();
  });
  
  async function loadCurrentAllocations() {
    try {
      // In a real app, this would load from the blockchain or user preferences
      // For now, use mock data
      const mockCurrentAllocations = {
        '0x1': 35, // ETH: 35%
        '0x2': 30, // WBTC: 30%
        '0x3': 15, // LINK: 15%
        '0x4': 10, // UNI: 10%
        '0x5': 10  // USDC: 10%
      };
      
      // Update custom allocations form
      customAllocations = { ...mockCurrentAllocations };
      calculateTotalAllocation();
      
      // Update selected tokens for auto-distribute
      selectedTokens = Object.keys(mockCurrentAllocations);
      updateTokenSelection();
      
    } catch (error) {
      console.error('Failed to load current allocations:', error);
    }
  }
  
  function updateCustomAllocationsFromState() {
    if (allocationState.targetAllocations) {
      const allocations = {};
      for (const [address, percent] of Object.entries(allocationState.targetAllocations)) {
        allocations[address] = percent * 100; // Convert from decimal to percentage
      }
      customAllocations = allocations;
      calculateTotalAllocation();
    }
  }
  
  function updateLiquidityWarnings() {
    if (allocationAnalysis.liquidityAnalysis) {
      liquidityWarnings = allocationAnalysis.liquidityAnalysis.warnings || [];
    }
  }
  
  function updateValidationResults() {
    if (allocationAnalysis.validationResults) {
      allocationErrors = allocationAnalysis.validationResults.errors || {};
      isValidAllocation = allocationAnalysis.validationResults.isValid || false;
    }
  }
  
  function updateTokenSelection() {
    availableTokens = availableTokens.map(token => ({
      ...token,
      selected: selectedTokens.includes(token.address)
    }));
  }
  
  function handleTokenSelection(tokenAddress, selected) {
    if (selected) {
      if (!selectedTokens.includes(tokenAddress)) {
        selectedTokens = [...selectedTokens, tokenAddress];
      }
    } else {
      selectedTokens = selectedTokens.filter(addr => addr !== tokenAddress);
    }
    
    updateTokenSelection();
    
    if (autoDistributeMode) {
      calculateAutoDistribution();
    }
  }
  
  async function calculateAutoDistribution() {
    if (selectedTokens.length === 0) {
      autoDistributionResult = {};
      return;
    }
    
    try {
      const result = allocationManagementService.calculateAutoDistribution(selectedTokens);
      autoDistributionResult = result;
      
      // Update custom allocations to match auto-distribution
      customAllocations = {};
      for (const [address, percent] of Object.entries(result.allocations)) {
        customAllocations[address] = percent * 100; // Convert to percentage
      }
      
      calculateTotalAllocation();
      
    } catch (error) {
      console.error('Failed to calculate auto-distribution:', error);
    }
  }
  
  function calculateTotalAllocation() {
    totalAllocation = Object.values(customAllocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    validateAllocations();
  }
  
  function validateAllocations() {
    allocationErrors = {};
    
    // Check total allocation
    if (Math.abs(totalAllocation - 100) > 0.01) {
      allocationErrors.total = `Total allocation must equal 100% (currently ${totalAllocation.toFixed(2)}%)`;
    }
    
    // Check individual allocations
    for (const [address, percent] of Object.entries(customAllocations)) {
      const value = parseFloat(percent);
      if (isNaN(value) || value < 0) {
        allocationErrors[address] = 'Allocation must be a positive number';
      } else if (value > 100) {
        allocationErrors[address] = 'Allocation cannot exceed 100%';
      } else if (value > 0 && value < 0.01) {
        allocationErrors[address] = 'Minimum allocation is 0.01%';
      }
    }
    
    isValidAllocation = Object.keys(allocationErrors).length === 0 && Math.abs(totalAllocation - 100) <= 0.01;
  }
  
  async function handleAutoDistributeToggle() {
    autoDistributeMode = !autoDistributeMode;
    
    if (autoDistributeMode) {
      await calculateAutoDistribution();
    }
    
    // Update service state
    try {
      await allocationManagementService.setAutoDistributeMode(autoDistributeMode);
    } catch (error) {
      console.error('Failed to update auto-distribute mode:', error);
    }
  }
  
  async function handleCustomAllocationChange(tokenAddress, value) {
    customAllocations[tokenAddress] = parseFloat(value) || 0;
    calculateTotalAllocation();
    
    // Disable auto-distribute mode when manually editing
    if (autoDistributeMode) {
      autoDistributeMode = false;
    }
  }
  
  async function handleSaveAllocations() {
    if (!isValidAllocation) return;
    
    try {
      // Convert percentages to decimals
      const allocations = {};
      for (const [address, percent] of Object.entries(customAllocations)) {
        if (percent > 0) {
          allocations[address] = percent / 100;
        }
      }
      
      // Check liquidity before saving
      liquidityChecking = true;
      await checkLiquidityForAllocations(allocations);
      
      // Save allocations
      await allocationManagementService.setCustomAllocations(allocations);
      
      console.log('Allocations saved successfully');
      
      // Generate rebalancing preview
      await generateRebalancingPreview(allocations);
      
    } catch (error) {
      console.error('Failed to save allocations:', error);
    } finally {
      liquidityChecking = false;
    }
  }
  
  async function checkLiquidityForAllocations(allocations) {
    try {
      const liquidityAnalysis = await allocationManagementService.checkLiquidityForAllocations(
        allocations, 
        currentPortfolioValue
      );
      
      liquidityWarnings = liquidityAnalysis.warnings || [];
      
    } catch (error) {
      console.error('Failed to check liquidity:', error);
      liquidityWarnings = [{ message: 'Unable to verify liquidity', severity: 'warning' }];
    }
  }
  
  async function generateRebalancingPreview(targetAllocations) {
    try {
      // Mock current holdings (in a real app, this would come from the blockchain)
      const currentHoldings = {
        '0x1': 2.5,    // ETH
        '0x2': 0.8,    // WBTC  
        '0x3': 150,    // LINK
        '0x4': 45,     // UNI
        '0x5': 12544   // USDC
      };
      
      // Calculate rebalancing trades
      const trades = await rebalancingEngine.calculateOptimalTrades(
        currentHoldings,
        targetAllocations,
        currentPortfolioValue
      );
      
      // Estimate gas costs
      const gasEstimation = await rebalancingEngine.estimateGasCosts(trades);
      
      rebalancingPreview = {
        trades,
        gasEstimation,
        totalTrades: trades.length,
        estimatedTime: trades.length * 30 // 30 seconds per trade estimate
      };
      
      estimatedGasCost = gasEstimation.totalCostUSD || 0;
      estimatedSlippage = gasEstimation.estimatedSlippage || 0;
      showRebalancingPreview = true;
      
    } catch (error) {
      console.error('Failed to generate rebalancing preview:', error);
    }
  }
  
  function normalizeAllocations() {
    if (totalAllocation === 0) return;
    
    const factor = 100 / totalAllocation;
    for (const address of Object.keys(customAllocations)) {
      customAllocations[address] = (customAllocations[address] * factor);
    }
    
    calculateTotalAllocation();
  }
  
  function clearAllocations() {
    customAllocations = {};
    selectedTokens = [];
    updateTokenSelection();
    calculateTotalAllocation();
  }
  
  function getTokenByAddress(address) {
    return availableTokens.find(token => token.address === address);
  }
  
  function formatPercentage(value, decimals = 2) {
    return parseFloat(value || 0).toFixed(decimals);
  }
  
  function formatCurrency(value, decimals = 2) {
    return parseFloat(value || 0).toFixed(decimals);
  }
  
  function getSeverityColor(severity) {
    switch (severity) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }
  
  // Reactive statements
  $: if (selectedTokens.length > 0 && autoDistributeMode) {
    calculateAutoDistribution();
  }
  
  $: calculateTotalAllocation();
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Allocation Management</h3>
    <div class="flex items-center space-x-2">
      <button 
        class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        on:click={() => showAdvanced = !showAdvanced}
      >
        {showAdvanced ? 'Simple' : 'Advanced'}
      </button>
    </div>
  </div>

  {#if isLoading}
    <div class="animate-pulse space-y-4">
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  {:else}
    <!-- Auto-Distribute Toggle -->
    <div class="mb-6">
      <div class="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div>
          <h4 class="text-md font-medium text-blue-900 dark:text-blue-100">Auto-Distribute Mode</h4>
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Automatically calculate equal percentages for selected tokens
          </p>
        </div>
        <label class="flex items-center">
          <input 
            type="checkbox" 
            bind:checked={autoDistributeMode}
            on:change={handleAutoDistributeToggle}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="ml-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            {autoDistributeMode ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>
    </div>

    <!-- Token Selection (for auto-distribute) -->
    {#if autoDistributeMode}
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Select Tokens</h4>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {#each availableTokens as token}
            <label class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={token.selected}
                on:change={(e) => handleTokenSelection(token.address, e.target.checked)}
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div class="ml-3">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{token.symbol}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div>
              </div>
            </label>
          {/each}
        </div>
        
        {#if autoDistributionResult.allocations}
          <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div class="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Auto-Distribution Result: {formatPercentage(100 / selectedTokens.length)}% each
            </div>
            <div class="text-xs text-green-600 dark:text-green-400">
              {selectedTokens.length} tokens selected
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Custom Allocation Input -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-md font-medium text-gray-900 dark:text-white">
          {autoDistributeMode ? 'Generated Allocations' : 'Custom Allocations'}
        </h4>
        <div class="text-sm">
          <span class="text-gray-500 dark:text-gray-400">Total: </span>
          <span 
            class="font-medium"
            class:text-green-600={Math.abs(totalAllocation - 100) <= 0.01}
            class:text-red-600={Math.abs(totalAllocation - 100) > 0.01}
            class:dark:text-green-400={Math.abs(totalAllocation - 100) <= 0.01}
            class:dark:text-red-400={Math.abs(totalAllocation - 100) > 0.01}
          >
            {formatPercentage(totalAllocation)}%
          </span>
        </div>
      </div>
      
      <div class="space-y-3">
        {#each availableTokens as token}
          {#if autoDistributeMode ? token.selected : true}
            <div class="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div class="flex-1">
                <div class="flex items-center">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{token.symbol}</span>
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">{token.name}</span>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <div class="relative">
                  <input 
                    type="number" 
                    bind:value={customAllocations[token.address]}
                    on:input={(e) => handleCustomAllocationChange(token.address, e.target.value)}
                    min="0" 
                    max="100" 
                    step="0.01"
                    disabled={autoDistributeMode}
                    class="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700"
                    class:border-red-300={allocationErrors[token.address]}
                    class:dark:border-red-600={allocationErrors[token.address]}
                  />
                  <span class="absolute right-2 top-1 text-xs text-gray-500">%</span>
                </div>
                
                {#if currentPortfolioValue > 0}
                  <div class="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                    ${formatCurrency((customAllocations[token.address] || 0) * currentPortfolioValue / 100)}
                  </div>
                {/if}
              </div>
            </div>
            
            {#if allocationErrors[token.address]}
              <div class="text-sm text-red-600 dark:text-red-400 ml-3">
                {allocationErrors[token.address]}
              </div>
            {/if}
          {/if}
        {/each}
      </div>
      
      {#if allocationErrors.total}
        <div class="mt-3 text-sm text-red-600 dark:text-red-400">
          {allocationErrors.total}
        </div>
      {/if}
    </div>

    <!-- Allocation Actions -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button 
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={!isValidAllocation || liquidityChecking}
        on:click={handleSaveAllocations}
      >
        {liquidityChecking ? 'Checking...' : 'Save Allocations'}
      </button>
      
      {#if !autoDistributeMode}
        <button 
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          on:click={normalizeAllocations}
          disabled={totalAllocation === 0}
        >
          Normalize to 100%
        </button>
      {/if}
      
      <button 
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        on:click={clearAllocations}
      >
        Clear All
      </button>
    </div>

    <!-- Liquidity Warnings -->
    {#if liquidityWarnings.length > 0}
      <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h5 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Liquidity Warnings
        </h5>
        <div class="space-y-1">
          {#each liquidityWarnings as warning}
            <div class="text-sm {getSeverityColor(warning.severity)}">
              {warning.message}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Rebalancing Preview -->
    {#if showRebalancingPreview && rebalancingPreview}
      <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h5 class="text-sm font-medium text-blue-800 dark:text-blue-200">
            Rebalancing Preview
          </h5>
          <button 
            class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
            on:click={() => showRebalancingPreview = false}
          >
            Hide
          </button>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="text-blue-600 dark:text-blue-400 font-medium">Trades Required</div>
            <div class="text-blue-800 dark:text-blue-200">{rebalancingPreview.totalTrades}</div>
          </div>
          <div>
            <div class="text-blue-600 dark:text-blue-400 font-medium">Est. Gas Cost</div>
            <div class="text-blue-800 dark:text-blue-200">${formatCurrency(estimatedGasCost)}</div>
          </div>
          <div>
            <div class="text-blue-600 dark:text-blue-400 font-medium">Est. Slippage</div>
            <div class="text-blue-800 dark:text-blue-200">{formatPercentage(estimatedSlippage)}%</div>
          </div>
          <div>
            <div class="text-blue-600 dark:text-blue-400 font-medium">Est. Time</div>
            <div class="text-blue-800 dark:text-blue-200">{Math.ceil(rebalancingPreview.estimatedTime / 60)}m</div>
          </div>
        </div>
        
        {#if showAdvanced && rebalancingPreview.trades.length > 0}
          <div class="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
            <div class="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">Trade Details:</div>
            <div class="space-y-1 max-h-32 overflow-y-auto">
              {#each rebalancingPreview.trades as trade}
                <div class="text-xs text-blue-700 dark:text-blue-300 flex justify-between">
                  <span>{trade.type}: {trade.tokenSymbol}</span>
                  <span>${formatCurrency(trade.valueUSD)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Advanced Settings -->
    {#if showAdvanced}
      <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Advanced Settings</h4>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Min Allocation</label>
            <div class="text-gray-600 dark:text-gray-400">0.01%</div>
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Min Liquidity</label>
            <div class="text-gray-600 dark:text-gray-400">$1,000</div>
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Drift Threshold</label>
            <div class="text-gray-600 dark:text-gray-400">5%</div>
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Portfolio Value</label>
            <div class="text-gray-600 dark:text-gray-400">${formatCurrency(currentPortfolioValue)}</div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>