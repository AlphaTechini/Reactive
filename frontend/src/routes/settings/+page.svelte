<script>
  import { onMount } from 'svelte';
  import toast from 'svelte-french-toast';
  import { contractService } from '../lib/contractService.js';
  import { walletStore } from '../lib/walletService.js';
  
  let settings = {
    stopLoss: 15,
    takeProfit: 25,
    panicMode: false,
    autoRebalance: true,
    rebalanceThreshold: 5,
    maxSlippage: 1
  };
  
  let portfolioAllocation = [
    { symbol: 'ETH', name: 'Ethereum', allocation: 35, target: 35 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', allocation: 30, target: 30 },
    { symbol: 'LINK', name: 'Chainlink', allocation: 15, target: 15 },
    { symbol: 'UNI', name: 'Uniswap', allocation: 10, target: 10 },
    { symbol: 'USDC', name: 'USD Coin', allocation: 10, target: 10 }
  ];
  
  let isLoading = false;
  let activeTab = 'risk-management';
  let isLoadingSettings = false;
  
  function validateAllocations() {
    const total = portfolioAllocation.reduce((sum, token) => sum + token.allocation, 0);
    return Math.abs(total - 100) < 0.01;
  }
  
  async function loadCurrentSettings() {
    const wallet = $walletStore;
    if (!wallet.isConnected) return;
    
    isLoadingSettings = true;
    try {
      await contractService.initialize();
      
      // Load current settings from contract
      const [stopLoss, takeProfit, panicMode] = await Promise.all([
        contractService.getStopLoss(),
        contractService.getTakeProfit(), 
        contractService.isPanicMode()
      ]);
      
      settings.stopLoss = stopLoss;
      settings.takeProfit = takeProfit;
      settings.panicMode = panicMode;
      
      console.log('Loaded settings from contract:', { stopLoss, takeProfit, panicMode });
    } catch (error) {
      console.error('Failed to load current settings:', error);
      toast.error('Failed to load current settings from contract');
    } finally {
      isLoadingSettings = false;
    }
  }
  
  async function saveSettings() {
    if (!validateAllocations()) {
      toast.error('Portfolio allocations must sum to 100%');
      return;
    }
    
    const wallet = $walletStore;
    if (!wallet.isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    isLoading = true;
    try {
      await contractService.initialize();
      
      // Save settings based on active tab
      if (activeTab === 'risk-management') {
        // Save stop loss
        if (settings.stopLoss > 0) {
          await contractService.setStopLoss(settings.stopLoss);
          toast.success(`Stop loss set to ${settings.stopLoss}%`);
        }
        
        // Save take profit
        if (settings.takeProfit > 0) {
          await contractService.setTakeProfit(settings.takeProfit);
          toast.success(`Take profit set to ${settings.takeProfit}%`);
        }
        
        // Handle panic mode
        const currentPanicMode = await contractService.isPanicMode();
        if (settings.panicMode !== currentPanicMode) {
          if (settings.panicMode) {
            await contractService.activatePanicMode();
            toast.success('Panic mode activated');
          } else {
            await contractService.deactivatePanicMode();
            toast.success('Panic mode deactivated');
          }
        }
        
      } else if (activeTab === 'portfolio') {
        // Save portfolio allocation
        const tokens = portfolioAllocation.map(token => token.symbol);
        const allocations = portfolioAllocation.map(token => token.allocation);
        
        await contractService.rebalancePortfolio(tokens, allocations);
        toast.success('Portfolio allocation saved and rebalanced');
        
      } else if (activeTab === 'automation') {
        // Save automation settings (these would be stored locally or in a separate contract)
        localStorage.setItem('automationSettings', JSON.stringify({
          autoRebalance: settings.autoRebalance,
          rebalanceThreshold: settings.rebalanceThreshold,
          maxSlippage: settings.maxSlippage
        }));
        toast.success('Automation settings saved');
      }
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      const errorMessage = contractService.formatContractError(error);
      toast.error(`Failed to save settings: ${errorMessage}`);
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    // Load saved automation settings from localStorage
    const savedAutomationSettings = localStorage.getItem('automationSettings');
    if (savedAutomationSettings) {
      const automationSettings = JSON.parse(savedAutomationSettings);
      settings.autoRebalance = automationSettings.autoRebalance;
      settings.rebalanceThreshold = automationSettings.rebalanceThreshold;
      settings.maxSlippage = automationSettings.maxSlippage;
    }
    
    // Subscribe to wallet changes and load settings when connected
    const unsubscribe = walletStore.subscribe((wallet) => {
      if (wallet.isConnected) {
        loadCurrentSettings();
      }
    });
    
    return unsubscribe;
  });
  
  function addToken() {
    portfolioAllocation = [...portfolioAllocation, {
      symbol: 'NEW',
      name: 'New Token',
      allocation: 0,
      target: 0
    }];
  }
  
  function removeToken(index) {
    portfolioAllocation = portfolioAllocation.filter((_, i) => i !== index);
  }
  
  function normalizeAllocations() {
    const total = portfolioAllocation.reduce((sum, token) => sum + token.allocation, 0);
    if (total > 0) {
      portfolioAllocation.forEach(token => {
        token.allocation = (token.allocation / total) * 100;
      });
      portfolioAllocation = [...portfolioAllocation]; // Trigger reactivity
    }
  }
  
  $: allocationTotal = portfolioAllocation.reduce((sum, token) => sum + token.allocation, 0);
</script>

<svelte:head>
  <title>Settings - Reactive Portfolio Manager</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-2">Portfolio Settings</h1>
        <p class="text-purple-100">Configure your automated trading strategies and risk management</p>
      </div>
      {#if isLoadingSettings}
        <div class="flex items-center text-purple-200">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Loading...
        </div>
      {/if}
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex space-x-8 px-6" aria-label="Tabs">
        <button
          on:click={() => activeTab = 'risk-management'}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
          class:border-blue-500={activeTab === 'risk-management'}
          class:text-blue-600={activeTab === 'risk-management'}
          class:border-transparent={activeTab !== 'risk-management'}
          class:text-gray-500={activeTab !== 'risk-management'}
        >
          Risk Management
        </button>
        <button
          on:click={() => activeTab = 'portfolio'}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
          class:border-blue-500={activeTab === 'portfolio'}
          class:text-blue-600={activeTab === 'portfolio'}
          class:border-transparent={activeTab !== 'portfolio'}
          class:text-gray-500={activeTab !== 'portfolio'}
        >
          Portfolio Allocation
        </button>
        <button
          on:click={() => activeTab = 'automation'}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
          class:border-blue-500={activeTab === 'automation'}
          class:text-blue-600={activeTab === 'automation'}
          class:border-transparent={activeTab !== 'automation'}
          class:text-gray-500={activeTab !== 'automation'}
        >
          Automation
        </button>
      </nav>
    </div>

    <div class="p-6">
      {#if activeTab === 'risk-management'}
        <!-- Risk Management Tab -->
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Risk Management Settings</h3>
          
          <!-- Stop Loss -->
          <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <h4 class="text-lg font-medium text-gray-900 dark:text-white">Stop Loss</h4>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Automatically sell positions when they drop by this percentage to limit losses.
            </p>
            <div class="flex items-center space-x-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stop Loss Percentage
                </label>
                <div class="relative">
                  <input
                    type="number"
                    bind:value={settings.stopLoss}
                    min="1"
                    max="50"
                    step="1"
                    class="block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Max: 50%
              </div>
            </div>
          </div>

          <!-- Take Profit -->
          <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div class="flex items-center mb-3">
              <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 class="text-lg font-medium text-gray-900 dark:text-white">Take Profit</h4>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Automatically sell positions when they gain by this percentage to secure profits.
            </p>
            <div class="flex items-center space-x-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Take Profit Percentage
                </label>
                <div class="relative">
                  <input
                    type="number"
                    bind:value={settings.takeProfit}
                    min="1"
                    max="500"
                    step="1"
                    class="block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Max: 500%
              </div>
            </div>
          </div>

          <!-- Panic Mode -->
          <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mr-3">
                  <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-white">Panic Mode</h4>
              </div>
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={settings.panicMode}
                  class="sr-only"
                />
                <div class="relative">
                  <div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors duration-300" class:bg-red-500={settings.panicMode}></div>
                  <div class="dot absolute w-4 h-4 bg-white rounded-full shadow -left-1 -top-1 transition-transform duration-300" class:translate-x-full={settings.panicMode}></div>
                </div>
              </label>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {#if settings.panicMode}
                <span class="text-red-600 dark:text-red-400 font-medium">ACTIVE:</span> All positions will be converted to stablecoins in emergency scenarios.
              {:else}
                Emergency mode will convert all positions to stablecoins during market crashes.
              {/if}
            </p>
          </div>
        </div>
      
      {:else if activeTab === 'portfolio'}
        <!-- Portfolio Allocation Tab -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Allocation</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Define target percentages for each asset in your portfolio
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500 dark:text-gray-400">Total Allocation</p>
              <p class="text-2xl font-bold" class:text-green-600={Math.abs(allocationTotal - 100) < 0.01} class:text-red-600={Math.abs(allocationTotal - 100) >= 0.01}>
                {allocationTotal.toFixed(1)}%
              </p>
            </div>
          </div>

          <!-- Allocation List -->
          <div class="space-y-3">
            {#each portfolioAllocation as token, index}
              <div class="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex-1">
                  <input
                    type="text"
                    bind:value={token.symbol}
                    placeholder="Token Symbol"
                    class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                  />
                </div>
                <div class="flex-2">
                  <input
                    type="text"
                    bind:value={token.name}
                    placeholder="Token Name"
                    class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div class="flex-1">
                  <div class="relative">
                    <input
                      type="number"
                      bind:value={token.allocation}
                      min="0"
                      max="100"
                      step="0.1"
                      class="block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>
                <button
                  on:click={() => removeToken(index)}
                  class="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  disabled={portfolioAllocation.length <= 1}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button
              on:click={addToken}
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Token
            </button>
            <button
              on:click={normalizeAllocations}
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Normalize to 100%
            </button>
          </div>

          {#if Math.abs(allocationTotal - 100) >= 0.01}
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div class="flex">
                <svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Allocation Error</h3>
                  <p class="mt-1 text-sm text-red-700 dark:text-red-300">
                    Total allocation must equal 100%. Current total: {allocationTotal.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </div>

      {:else if activeTab === 'automation'}
        <!-- Automation Tab -->
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Automation Settings</h3>

          <!-- Auto Rebalancing -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                  <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-white">Auto Rebalancing</h4>
              </div>
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={settings.autoRebalance}
                  class="sr-only"
                />
                <div class="relative">
                  <div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors duration-300" class:bg-blue-500={settings.autoRebalance}></div>
                  <div class="dot absolute w-4 h-4 bg-white rounded-full shadow -left-1 -top-1 transition-transform duration-300" class:translate-x-full={settings.autoRebalance}></div>
                </div>
              </label>
            </div>
            
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Automatically rebalance your portfolio when allocations deviate from targets.
            </p>
            
            {#if settings.autoRebalance}
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rebalance Threshold
                  </label>
                  <div class="flex items-center space-x-4">
                    <div class="flex-1">
                      <div class="relative">
                        <input
                          type="number"
                          bind:value={settings.rebalanceThreshold}
                          min="1"
                          max="20"
                          step="1"
                          class="block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      deviation from target
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Slippage Settings -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Trading Settings</h4>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Slippage
              </label>
              <div class="flex items-center space-x-4">
                <div class="flex-1">
                  <div class="relative">
                    <input
                      type="number"
                      bind:value={settings.maxSlippage}
                      min="0.1"
                      max="5"
                      step="0.1"
                      class="block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Max: 5%
                </div>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum price impact allowed for trades
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Save Button -->
  <div class="flex justify-end">
    <button
      on:click={saveSettings}
      disabled={isLoading || (activeTab === 'portfolio' && Math.abs(allocationTotal - 100) >= 0.01)}
      class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isLoading}
        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        Saving...
      {:else}
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Save Settings
      {/if}
    </button>
  </div>
</div>