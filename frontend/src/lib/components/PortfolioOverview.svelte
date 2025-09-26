<script>
  let portfolioAllocation = [
    { symbol: 'ETH', name: 'Ethereum', percentage: 35, value: 43920.62, change: 2.34, color: 'bg-blue-500' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', percentage: 30, value: 37632.18, change: -1.23, color: 'bg-orange-500' },
    { symbol: 'LINK', name: 'Chainlink', percentage: 15, value: 18816.09, change: 4.67, color: 'bg-indigo-500' },
    { symbol: 'UNI', name: 'Uniswap', percentage: 10, value: 12544.06, change: -0.89, color: 'bg-pink-500' },
    { symbol: 'USDC', name: 'USD Coin', percentage: 10, value: 12544.06, change: 0.01, color: 'bg-green-500' }
  ];
  
  let totalValue = portfolioAllocation.reduce((sum, token) => sum + token.value, 0);
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Allocation</h3>
    <div class="text-right">
      <p class="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
      <p class="text-xl font-bold text-gray-900 dark:text-white">${totalValue.toLocaleString()}</p>
    </div>
  </div>

  <!-- Allocation Chart (Simplified pie chart representation) -->
  <div class="mb-6">
    <div class="flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
      {#each portfolioAllocation as token}
        <div 
          class="{token.color}" 
          style="width: {token.percentage}%"
          title="{token.symbol}: {token.percentage}%"
        ></div>
      {/each}
    </div>
  </div>

  <!-- Token List -->
  <div class="space-y-3">
    {#each portfolioAllocation as token}
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div class="flex items-center">
          <div class="w-3 h-3 {token.color} rounded-full mr-3"></div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{token.symbol}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{token.name}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-gray-900 dark:text-white">{token.percentage}%</p>
          <div class="flex items-center">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
              ${token.value.toLocaleString()}
            </span>
            <span class="ml-1 text-xs" class:text-green-500={token.change >= 0} class:text-red-500={token.change < 0}>
              {token.change >= 0 ? '+' : ''}{token.change}%
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Rebalance Info -->
  <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500 dark:text-gray-400">Last Rebalanced</span>
      <span class="text-gray-900 dark:text-white">2 days ago</span>
    </div>
    <div class="flex items-center justify-between text-sm mt-1">
      <span class="text-gray-500 dark:text-gray-400">Deviation Threshold</span>
      <span class="text-gray-900 dark:text-white">±5%</span>
    </div>
    <div class="mt-3">
      <div class="flex items-center text-sm">
        <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        <span class="text-green-600 dark:text-green-400 font-medium">Portfolio is balanced</span>
      </div>
    </div>
  </div>
</div>