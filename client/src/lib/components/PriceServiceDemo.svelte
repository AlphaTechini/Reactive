<!-- Test component to demonstrate enhanced features -->
<script>
  import { onMount } from 'svelte';
  import { enhancedPriceService, pricesStore, priceLoadingStore, lastUpdatedStore } from '$lib/priceService.js';
  import { appMode } from '$lib/stores/appMode.js';
  
  let priceData = {};
  
  onMount(() => {
    const unsubscribe = pricesStore.subscribe(prices => {
      priceData = prices;
    });
    
    return unsubscribe;
  });
  
  async function manualRefresh() {
    await enhancedPriceService.refreshAllPrices();
  }
</script>

<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
      Enhanced Price Service Demo
    </h3>
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Mode: <span class="font-medium">{$appMode}</span>
      </span>
      <button 
        on:click={manualRefresh} 
        disabled={$priceLoadingStore}
        class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {$priceLoadingStore ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each Object.entries(priceData) as [address, data]}
      <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-gray-900 dark:text-white">
            {data.symbol}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-lg font-bold text-gray-900 dark:text-white">
            {enhancedPriceService.formatPrice(data.price)}
          </span>
          <span class="text-sm" class:text-green-500={data.change >= 0} class:text-red-500={data.change < 0}>
            {enhancedPriceService.formatChange(data.change)}
          </span>
        </div>
      </div>
    {/each}
  </div>

  {#if $lastUpdatedStore}
    <div class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
      Last updated: {new Date($lastUpdatedStore).toLocaleString()}
    </div>
  {/if}

  {#if $priceLoadingStore}
    <div class="mt-4 flex items-center justify-center">
      <svg class="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading prices...</span>
    </div>
  {/if}
</div>