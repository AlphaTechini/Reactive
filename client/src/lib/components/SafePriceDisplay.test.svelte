<!--
  SafePriceDisplay Visual Test Page
  
  This page demonstrates the SafePriceDisplay component in various states
  for visual testing and verification.
-->
<script>
  import SafePriceDisplay from './SafePriceDisplay.svelte';
  import { globalPricesStore, globalRefreshingStore, globalStorage } from '$lib/stores/globalStorage.js';
  import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
  
  // Test scenarios
  let testToken = INITIAL_TOKEN_LIST[0]; // ETH
  let invalidToken = { address: '0xINVALID', symbol: 'INVALID' };
  let emptyToken = { address: '', symbol: 'EMPTY' };
  
  // Simulate loading state
  function simulateLoading() {
    globalRefreshingStore.set(true);
    setTimeout(() => {
      globalRefreshingStore.set(false);
    }, 2000);
  }
  
  // Add test price data
  function addTestPrice() {
    globalStorage.storePrices({
      [testToken.address]: {
        price: 1234.56,
        change: 5.67,
        timestamp: Date.now(),
        symbol: testToken.symbol
      }
    }, { source: 'test' });
  }
  
  // Add stale price data
  function addStalePrice() {
    globalStorage.storePrices({
      [testToken.address]: {
        price: 1234.56,
        change: 5.67,
        timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago
        symbol: testToken.symbol
      }
    }, { source: 'test' });
  }
  
  // Clear price data
  function clearPrices() {
    globalStorage.clear();
  }
</script>

<div class="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
      SafePriceDisplay Component Tests
    </h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      Visual testing for all component states and configurations
    </p>
    
    <!-- Control Panel -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
      <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Test Controls</h2>
      <div class="flex flex-wrap gap-3">
        <button 
          on:click={simulateLoading}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Simulate Loading
        </button>
        <button 
          on:click={addTestPrice}
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Test Price
        </button>
        <button 
          on:click={addStalePrice}
          class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Add Stale Price
        </button>
        <button 
          on:click={clearPrices}
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear Prices
        </button>
      </div>
    </div>
    
    <!-- Test Cases -->
    <div class="space-y-6">
      
      <!-- Test 1: Basic Usage -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 1: Basic Usage
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Default configuration with all features enabled
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay tokenAddress={testToken.address} />
        </div>
      </div>
      
      <!-- Test 2: Without Change -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 2: Without Change Indicator
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Price only, no 24h change percentage
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay 
            tokenAddress={testToken.address} 
            showChange={false} 
          />
        </div>
      </div>
      
      <!-- Test 3: Custom Fallback -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 3: Custom Fallback Text
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Using invalid token address to show fallback
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay 
            tokenAddress={invalidToken.address} 
            fallbackText="No price data available for this token" 
          />
        </div>
      </div>
      
      <!-- Test 4: Fixed Decimals -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 4: Fixed Decimal Places
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Always show 4 decimal places
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay 
            tokenAddress={testToken.address} 
            decimals={4} 
          />
        </div>
      </div>
      
      <!-- Test 5: No Loading Indicator -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 5: Without Loading Indicator
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Shows fallback immediately instead of loading spinner
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay 
            tokenAddress={testToken.address} 
            showLoading={false} 
          />
        </div>
      </div>
      
      <!-- Test 6: Custom Styling -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 6: Custom Styling
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Large, bold, colored text
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay 
            tokenAddress={testToken.address} 
            className="text-2xl font-bold text-blue-600 dark:text-blue-400" 
          />
        </div>
      </div>
      
      <!-- Test 7: Empty Token Address -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 7: Empty Token Address
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Handles empty/null token address gracefully
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
          <SafePriceDisplay 
            tokenAddress={emptyToken.address} 
          />
        </div>
      </div>
      
      <!-- Test 8: Multiple Instances -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Test 8: Multiple Instances
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Multiple components for different tokens
        </p>
        <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded space-y-2">
          {#each INITIAL_TOKEN_LIST.slice(0, 5) as token}
            <div class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
              <span class="font-medium text-gray-900 dark:text-white">
                {token.symbol}
              </span>
              <SafePriceDisplay tokenAddress={token.address} />
            </div>
          {/each}
        </div>
      </div>
      
    </div>
    
    <!-- Store State Debug -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mt-8">
      <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Store State (Debug)</h2>
      <div class="space-y-2 text-sm font-mono">
        <div class="text-gray-600 dark:text-gray-400">
          <strong>Refreshing:</strong> {$globalRefreshingStore}
        </div>
        <div class="text-gray-600 dark:text-gray-400">
          <strong>Prices Count:</strong> {Object.keys($globalPricesStore).length}
        </div>
        <div class="text-gray-600 dark:text-gray-400">
          <strong>Test Token Price:</strong> 
          {JSON.stringify($globalPricesStore[testToken.address] || 'null', null, 2)}
        </div>
      </div>
    </div>
    
  </div>
</div>

<style>
  /* Additional test page styles if needed */
</style>
