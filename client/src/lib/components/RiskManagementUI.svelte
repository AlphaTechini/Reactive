<script>
  import { onMount, onDestroy } from 'svelte';
  import { riskManagementService } from '../services/RiskManagementService.js';
  import { riskManagementStateStore, riskParametersStore, riskTriggersStore } from '../services/RiskManagementService.js';
  import { enhancedPriceDisplayService } from '../services/EnhancedPriceDisplayService.js';
  import { INITIAL_TOKEN_LIST } from '../config/network.js';
  
  // Component props
  export let selectedToken = null;
  export let compact = false;
  
  // Risk management state
  let riskState = {};
  let riskParameters = {};
  let riskTriggers = {};
  let isLoading = true;
  let showPanicConfirm = false;
  let showAdvancedSettings = false;
  
  // Form state for trailing stop-loss
  let trailingStopForm = {
    enabled: false,
    trailPercent: 5,
    stopPercent: 10,
    isValid: true,
    errors: []
  };
  
  // Form state for standard risk parameters
  let riskForm = {
    stopLossPercent: 10,
    takeProfitPercent: 20,
    maxPositionSize: 25,
    riskLevel: 'moderate'
  };
  
  // Panic mode state
  let panicModeState = {
    active: false,
    progress: 0,
    timeRemaining: 0,
    conversions: []
  };
  
  // Risk trigger history
  let triggerHistory = [];
  let showHistory = false;
  
  // Subscription cleanup
  let unsubscribeState;
  let unsubscribeParams;
  let unsubscribeTriggers;
  
  onMount(async () => {
    try {
      // Initialize risk management service
      await riskManagementService.initialize();
      
      // Subscribe to risk management stores
      unsubscribeState = riskManagementStateStore.subscribe(state => {
        riskState = state;
        panicModeState.active = state.panicModeActive;
        updatePanicModeDisplay();
      });
      
      unsubscribeParams = riskParametersStore.subscribe(params => {
        riskParameters = params;
        updateFormFromParameters();
      });
      
      unsubscribeTriggers = riskTriggersStore.subscribe(triggers => {
        riskTriggers = triggers;
        updateTriggerHistory();
      });
      
      // Load initial data
      await loadRiskData();
      
      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize risk management UI:', error);
      isLoading = false;
    }
  });
  
  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (unsubscribeParams) unsubscribeParams();
    if (unsubscribeTriggers) unsubscribeTriggers();
  });
  
  async function loadRiskData() {
    if (!selectedToken) return;
    
    try {
      // Load existing risk parameters for selected token
      const params = riskManagementService.getRiskParameters(selectedToken.address);
      if (params) {
        updateFormFromParameters(params);
      }
      
      // Load trigger history
      const history = riskManagementService.getExecutionHistory(selectedToken.address);
      triggerHistory = history || [];
      
    } catch (error) {
      console.error('Failed to load risk data:', error);
    }
  }
  
  function updateFormFromParameters(params = null) {
    const tokenParams = params || (selectedToken ? riskParameters[selectedToken.address] : null);
    if (!tokenParams) return;
    
    // Update trailing stop form
    if (tokenParams.trailingStop) {
      trailingStopForm.enabled = tokenParams.trailingStop.enabled;
      trailingStopForm.trailPercent = (tokenParams.trailingStop.trailPercent * 100);
      trailingStopForm.stopPercent = (tokenParams.trailingStop.stopPercent * 100);
    }
    
    // Update risk form
    if (tokenParams.stopLoss) {
      riskForm.stopLossPercent = (tokenParams.stopLoss.percent * 100);
    }
    if (tokenParams.takeProfit) {
      riskForm.takeProfitPercent = (tokenParams.takeProfit.percent * 100);
    }
    if (tokenParams.maxPositionSize) {
      riskForm.maxPositionSize = (tokenParams.maxPositionSize * 100);
    }
    if (tokenParams.riskLevel) {
      riskForm.riskLevel = tokenParams.riskLevel;
    }
  }
  
  function updateTriggerHistory() {
    if (!selectedToken) return;
    
    const tokenTriggers = riskTriggers[selectedToken.address];
    if (tokenTriggers) {
      triggerHistory = tokenTriggers.history || [];
    }
  }
  
  function updatePanicModeDisplay() {
    if (riskState.panicModeActive) {
      // Update panic mode progress display
      const panicData = riskManagementService.getPanicModeState();
      if (panicData) {
        panicModeState.progress = panicData.progress;
        panicModeState.timeRemaining = Math.max(0, 60 - Math.floor((Date.now() - panicData.startTime) / 1000));
        panicModeState.conversions = panicData.conversions || [];
      }
    }
  }
  
  function validateTrailingStopForm() {
    const errors = [];
    
    if (trailingStopForm.trailPercent <= 0 || trailingStopForm.trailPercent > 50) {
      errors.push('Trail percentage must be between 0% and 50%');
    }
    
    if (trailingStopForm.stopPercent <= 0 || trailingStopForm.stopPercent > 50) {
      errors.push('Stop percentage must be between 0% and 50%');
    }
    
    if (trailingStopForm.trailPercent >= trailingStopForm.stopPercent) {
      errors.push('Trail percentage must be less than stop percentage');
    }
    
    trailingStopForm.errors = errors;
    trailingStopForm.isValid = errors.length === 0;
    
    return trailingStopForm.isValid;
  }
  
  async function handleTrailingStopSubmit() {
    if (!selectedToken || !validateTrailingStopForm()) return;
    
    try {
      await riskManagementService.setTrailingStopLoss(
        selectedToken.address,
        trailingStopForm.trailPercent / 100,
        trailingStopForm.stopPercent / 100,
        { enabled: trailingStopForm.enabled }
      );
      
      console.log('Trailing stop-loss updated successfully');
    } catch (error) {
      console.error('Failed to update trailing stop-loss:', error);
      trailingStopForm.errors = [error.message];
    }
  }
  
  async function handleRiskParametersSubmit() {
    if (!selectedToken) return;
    
    try {
      const params = {
        stopLoss: {
          enabled: true,
          percent: riskForm.stopLossPercent / 100
        },
        takeProfit: {
          enabled: true,
          percent: riskForm.takeProfitPercent / 100
        },
        maxPositionSize: riskForm.maxPositionSize / 100,
        riskLevel: riskForm.riskLevel
      };
      
      await riskManagementService.updateRiskParameters(selectedToken.address, params);
      
      console.log('Risk parameters updated successfully');
    } catch (error) {
      console.error('Failed to update risk parameters:', error);
    }
  }
  
  async function handlePanicModeActivation() {
    if (!showPanicConfirm) {
      showPanicConfirm = true;
      return;
    }
    
    try {
      await riskManagementService.executePanicMode('user-address'); // In real app, get from wallet
      showPanicConfirm = false;
      console.log('Panic mode activated');
    } catch (error) {
      console.error('Failed to activate panic mode:', error);
      showPanicConfirm = false;
    }
  }
  
  function cancelPanicMode() {
    showPanicConfirm = false;
  }
  
  function formatPercentage(value) {
    return `${value.toFixed(2)}%`;
  }
  
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }
  
  function getRiskLevelColor(level) {
    switch (level) {
      case 'conservative': return 'text-green-600 dark:text-green-400';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'aggressive': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }
  
  function getTriggerStatusColor(status) {
    switch (status) {
      case 'executed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }
  
  // Reactive statements
  $: if (selectedToken) {
    loadRiskData();
  }
  
  $: validateTrailingStopForm();
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Risk Management</h3>
    <div class="flex items-center space-x-2">
      {#if riskState.isActive}
        <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>
      {:else}
        <span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Inactive</span>
      {/if}
      
      {#if panicModeState.active}
        <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full animate-pulse">
          PANIC MODE
        </span>
      {/if}
    </div>
  </div>

  {#if isLoading}
    <div class="animate-pulse space-y-4">
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  {:else if !selectedToken}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p>Select a token to configure risk management</p>
    </div>
  {:else}
    <!-- Trailing Stop-Loss Configuration -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-md font-medium text-gray-900 dark:text-white">Trailing Stop-Loss</h4>
        <label class="flex items-center">
          <input 
            type="checkbox" 
            bind:checked={trailingStopForm.enabled}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable</span>
        </label>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trail Percentage
          </label>
          <div class="relative">
            <input 
              type="number" 
              bind:value={trailingStopForm.trailPercent}
              min="0.1" 
              max="50" 
              step="0.1"
              disabled={!trailingStopForm.enabled}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700"
            />
            <span class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stop Percentage
          </label>
          <div class="relative">
            <input 
              type="number" 
              bind:value={trailingStopForm.stopPercent}
              min="0.1" 
              max="50" 
              step="0.1"
              disabled={!trailingStopForm.enabled}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700"
            />
            <span class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>
      </div>
      
      {#if trailingStopForm.errors.length > 0}
        <div class="mt-2 text-sm text-red-600 dark:text-red-400">
          {#each trailingStopForm.errors as error}
            <p>{error}</p>
          {/each}
        </div>
      {/if}
      
      <button 
        class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={!trailingStopForm.isValid || !trailingStopForm.enabled}
        on:click={handleTrailingStopSubmit}
      >
        Update Trailing Stop
      </button>
    </div>

    <!-- Standard Risk Parameters -->
    <div class="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Risk Parameters</h4>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stop Loss
          </label>
          <div class="relative">
            <input 
              type="number" 
              bind:value={riskForm.stopLossPercent}
              min="1" 
              max="50" 
              step="0.5"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Take Profit
          </label>
          <div class="relative">
            <input 
              type="number" 
              bind:value={riskForm.takeProfitPercent}
              min="1" 
              max="100" 
              step="0.5"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Position Size
          </label>
          <div class="relative">
            <input 
              type="number" 
              bind:value={riskForm.maxPositionSize}
              min="1" 
              max="100" 
              step="1"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Risk Level
          </label>
          <select 
            bind:value={riskForm.riskLevel}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
      </div>
      
      <button 
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        on:click={handleRiskParametersSubmit}
      >
        Update Risk Parameters
      </button>
    </div>

    <!-- Panic Mode Controls -->
    <div class="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-md font-medium text-gray-900 dark:text-white">Emergency Controls</h4>
        {#if panicModeState.active}
          <div class="text-sm text-red-600 dark:text-red-400">
            <span class="font-medium">Time remaining: {panicModeState.timeRemaining}s</span>
            <div class="w-32 bg-gray-200 rounded-full h-2 mt-1">
              <div 
                class="bg-red-600 h-2 rounded-full transition-all duration-1000" 
                style="width: {panicModeState.progress}%"
              ></div>
            </div>
          </div>
        {/if}
      </div>
      
      {#if !panicModeState.active}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h5 class="text-sm font-medium text-red-800 dark:text-red-200">Panic Mode</h5>
              <p class="mt-1 text-sm text-red-700 dark:text-red-300">
                Immediately convert all non-stablecoin positions to USDC within 60 seconds.
                This action cannot be undone.
              </p>
              
              {#if !showPanicConfirm}
                <button 
                  class="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                  on:click={handlePanicModeActivation}
                >
                  Activate Panic Mode
                </button>
              {:else}
                <div class="mt-3 flex space-x-3">
                  <button 
                    class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    on:click={handlePanicModeActivation}
                  >
                    Confirm - Execute Now
                  </button>
                  <button 
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    on:click={cancelPanicMode}
                  >
                    Cancel
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <div class="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <h5 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Panic Mode Active - Converting Positions
          </h5>
          <div class="space-y-2">
            {#each panicModeState.conversions as conversion}
              <div class="flex justify-between text-sm">
                <span class="text-red-700 dark:text-red-300">{conversion.token}</span>
                <span class={getTriggerStatusColor(conversion.status)}>
                  {conversion.status}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Risk Trigger Status and History -->
    <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-md font-medium text-gray-900 dark:text-white">Trigger Status</h4>
        <button 
          class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          on:click={() => showHistory = !showHistory}
        >
          {showHistory ? 'Hide' : 'Show'} History
        </button>
      </div>
      
      {#if riskState.activeTriggers.length > 0}
        <div class="space-y-2 mb-4">
          {#each riskState.activeTriggers as trigger}
            <div class="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {trigger.type} - {trigger.tokenSymbol}
              </span>
              <span class="text-xs text-yellow-600 dark:text-yellow-400">
                {formatTimestamp(trigger.timestamp)}
              </span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">No active triggers</p>
      {/if}
      
      {#if showHistory && triggerHistory.length > 0}
        <div class="space-y-2 max-h-40 overflow-y-auto">
          {#each triggerHistory as trigger}
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
              <div>
                <span class="font-medium">{trigger.type}</span>
                <span class="text-gray-500 dark:text-gray-400">- {trigger.details}</span>
              </div>
              <div class="text-right">
                <div class={getTriggerStatusColor(trigger.status)}>
                  {trigger.status}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimestamp(trigger.timestamp)}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if showHistory}
        <p class="text-sm text-gray-500 dark:text-gray-400">No trigger history</p>
      {/if}
    </div>
  {/if}
</div>