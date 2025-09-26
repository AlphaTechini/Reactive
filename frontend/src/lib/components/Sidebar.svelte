<script>
  import { onMount } from 'svelte';
  
  export let open = false;
  
  // Token categories data
  const tokens = {
    altcoins: [
      { symbol: 'ETH', name: 'Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', price: null, change: null },
      { symbol: 'ADA', name: 'Cardano', address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', price: null, change: null },
      { symbol: 'DOT', name: 'Polkadot', address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', price: null, change: null },
      { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', price: null, change: null },
      { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', price: null, change: null },
      { symbol: 'MATIC', name: 'Polygon', address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', price: null, change: null },
      { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', price: null, change: null },
      { symbol: 'COMP', name: 'Compound', address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', price: null, change: null },
      { symbol: 'MKR', name: 'Maker', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', price: null, change: null },
      { symbol: 'SUSHI', name: 'SushiSwap', address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', price: null, change: null },
      { symbol: 'CRV', name: 'Curve DAO', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', price: null, change: null },
      { symbol: '1INCH', name: '1inch', address: '0x111111111117dC0aa78b770fA6A738034120C302', price: null, change: null },
      { symbol: 'LRC', name: 'Loopring', address: '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD', price: null, change: null },
      { symbol: 'ZRX', name: '0x Protocol', address: '0xE41d2489571d322189246DaFA5ebDe1F4699F498', price: null, change: null },
      { symbol: 'BAT', name: 'Basic Attention Token', address: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', price: null, change: null },
      { symbol: 'ENJ', name: 'Enjin Coin', address: '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c', price: null, change: null },
      { symbol: 'MANA', name: 'Decentraland', address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', price: null, change: null },
      { symbol: 'SNX', name: 'Synthetix', address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', price: null, change: null },
      { symbol: 'GRT', name: 'The Graph', address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', price: null, change: null },
      { symbol: 'REN', name: 'Ren', address: '0x408e41876cCCDC0F92210600ef50372656052a38', price: null, change: null }
    ],
    memecoins: [
      { symbol: 'DOGE', name: 'Dogecoin', address: '0x4206931337dc273a630d328dA6441786BfaD668f', price: null, change: null },
      { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', price: null, change: null },
      { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', price: null, change: null },
      { symbol: 'WIF', name: 'dogwifhat', address: '0x5026F006B85729a8b14553FAE6af249aD16c9aaB', price: null, change: null },
      { symbol: 'BONK', name: 'Bonk', address: '0x1151CB3d861920e07a38e03eEAd12C32178567F6', price: null, change: null },
      { symbol: 'FLOKI', name: 'Floki', address: '0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E', price: null, change: null },
      { symbol: 'BABYDOGE', name: 'Baby Doge Coin', address: '0xc748673057861a797275CD8A068AbB95A902e8de', price: null, change: null },
      { symbol: 'ELON', name: 'Dogelon Mars', address: '0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3', price: null, change: null },
      { symbol: 'SAMO', name: 'Samoyedcoin', address: '0x5B09A0371C1DA44A8E24D36Bf5DEb1141a84d875', price: null, change: null },
      { symbol: 'WOJAK', name: 'Wojak', address: '0x5026F006B85729a8b14553FAE6af249aD16c9aaB', price: null, change: null }
    ],
    stablecoins: [
      { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6441b8FadB9c2FF932293e3dD4ff8cE', price: 1.00, change: 0.01 },
      { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', price: 1.00, change: -0.01 },
      { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', price: 1.00, change: 0.02 },
      { symbol: 'FRAX', name: 'Frax', address: '0x853d955aCEf822Db058eb8505911ED77F175b99e', price: 1.00, change: 0.00 }
    ],
    btc: [
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', price: null, change: null }
    ]
  };

  let selectedToken = null;
  let query = '';
  let expandedCategories = {
    altcoins: true,
    memecoins: false,
    stablecoins: false,
    btc: true
  };

  function toggleCategory(category) {
    expandedCategories[category] = !expandedCategories[category];
  }

  function selectToken(token) {
    selectedToken = token;
    // Emit event or update store for parent components
    const event = new CustomEvent('tokenSelected', {
      detail: token
    });
    window.dispatchEvent(event);
  }

  function formatPrice(price) {
    if (price === null) return 'Loading...';
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  }

  function formatChange(change) {
    if (change === null) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  function filtered(list) {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }

  onMount(() => {
    // Mock price updates (in real app, connect to Uniswap API)
    const updatePrices = () => {
      // Simulate price updates for demonstration
      Object.values(tokens).flat().forEach(token => {
        if (token.symbol !== 'USDC' && token.symbol !== 'USDT' && token.symbol !== 'DAI' && token.symbol !== 'FRAX') {
          if (token.price === null) {
            // Initial random prices
            if (token.symbol === 'WBTC') token.price = 45000 + Math.random() * 5000;
            else if (token.symbol === 'ETH') token.price = 2500 + Math.random() * 500;
            else token.price = Math.random() * 10 + 0.1;
          }
          
          // Random price changes
          const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
          token.change = changePercent;
          token.price *= (1 + changePercent / 100);
        }
      });
    };

    updatePrices();
    const interval = setInterval(updatePrices, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  });
</script>

<!-- Sidebar -->
<div class="flex">
  <!-- Mobile sidebar overlay -->
  {#if open}
    <div class="fixed inset-0 z-40 lg:hidden" aria-hidden="true">
      <div class="fixed inset-0 bg-gray-600 bg-opacity-75" on:click={() => open = false}></div>
    </div>
  {/if}

  <!-- Sidebar panel -->
  <div class="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0"
       class:translate-x-0={open}
       class:-translate-x-full={!open}>
    
    <!-- Sidebar header -->
    <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tokens</h2>
      <button
        on:click={() => open = false}
        class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="relative">
        <label for="token-search" class="sr-only">Search tokens</label>
        <input
          id="token-search"
          type="text"
          placeholder="Search tokens..."
          aria-label="Search tokens"
          bind:value={query}
          class="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
        />
        <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        {#if query}
          <button type="button" on:click={()=>query=''} class="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        {/if}
      </div>
    </div>

    <!-- Sidebar content -->
    <div class="flex-1 overflow-y-auto">
  <nav class="px-4 py-4 space-y-2" role="navigation" aria-label="Token categories">

        <!-- Bitcoin Section -->
        <div class="space-y-1">
          <button
            on:click={() => toggleCategory('btc')}
            class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <div class="flex items-center">
              <div class="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              <span>Bitcoin</span>
            </div>
            <svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.btc} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {#if expandedCategories.btc}
            <div class="ml-4 space-y-1">
              {#each filtered(tokens.btc) as token}
                <button
                  on:click={() => selectToken(token)}
                  class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  class:bg-blue-50={selectedToken?.symbol === token.symbol}
                  class:dark:bg-blue-900={selectedToken?.symbol === token.symbol}
                  class:text-blue-600={selectedToken?.symbol === token.symbol}
                  class:dark:text-blue-400={selectedToken?.symbol === token.symbol}
                >
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div class="text-left">
                      <div class="font-medium">{token.symbol}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div class="text-right text-xs">
                    <div class="font-medium">{formatPrice(token.price)}</div>
                    <div class="text-xs" class:text-green-500={token.change >= 0} class:text-red-500={token.change < 0}>
                      {formatChange(token.change)}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Altcoins Section -->
        <div class="space-y-1">
          <button
            on:click={() => toggleCategory('altcoins')}
            class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <div class="flex items-center">
              <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>Altcoins ({tokens.altcoins.length})</span>
            </div>
            <svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.altcoins} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {#if expandedCategories.altcoins}
            <div class="ml-4 space-y-1 max-h-64 overflow-y-auto">
              {#each filtered(tokens.altcoins) as token}
                <button
                  on:click={() => selectToken(token)}
                  class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  class:bg-blue-50={selectedToken?.symbol === token.symbol}
                  class:dark:bg-blue-900={selectedToken?.symbol === token.symbol}
                  class:text-blue-600={selectedToken?.symbol === token.symbol}
                  class:dark:text-blue-400={selectedToken?.symbol === token.symbol}
                >
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div class="text-left">
                      <div class="font-medium">{token.symbol}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div class="text-right text-xs">
                    <div class="font-medium">{formatPrice(token.price)}</div>
                    <div class="text-xs" class:text-green-500={token.change >= 0} class:text-red-500={token.change < 0}>
                      {formatChange(token.change)}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Memecoins Section -->
        <div class="space-y-1">
          <button
            on:click={() => toggleCategory('memecoins')}
            class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <div class="flex items-center">
              <div class="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              <span>Memecoins ({tokens.memecoins.length})</span>
            </div>
            <svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.memecoins} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {#if expandedCategories.memecoins}
            <div class="ml-4 space-y-1 max-h-48 overflow-y-auto">
              {#each filtered(tokens.memecoins) as token}
                <button
                  on:click={() => selectToken(token)}
                  class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  class:bg-blue-50={selectedToken?.symbol === token.symbol}
                  class:dark:bg-blue-900={selectedToken?.symbol === token.symbol}
                  class:text-blue-600={selectedToken?.symbol === token.symbol}
                  class:dark:text-blue-400={selectedToken?.symbol === token.symbol}
                >
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div class="text-left">
                      <div class="font-medium">{token.symbol}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div class="text-right text-xs">
                    <div class="font-medium">{formatPrice(token.price)}</div>
                    <div class="text-xs" class:text-green-500={token.change >= 0} class:text-red-500={token.change < 0}>
                      {formatChange(token.change)}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Stablecoins Section -->
        <div class="space-y-1">
          <button
            on:click={() => toggleCategory('stablecoins')}
            class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <div class="flex items-center">
              <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span>Stablecoins ({tokens.stablecoins.length})</span>
            </div>
            <svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.stablecoins} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {#if expandedCategories.stablecoins}
            <div class="ml-4 space-y-1">
              {#each filtered(tokens.stablecoins) as token}
                <button
                  on:click={() => selectToken(token)}
                  class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  class:bg-blue-50={selectedToken?.symbol === token.symbol}
                  class:dark:bg-blue-900={selectedToken?.symbol === token.symbol}
                  class:text-blue-600={selectedToken?.symbol === token.symbol}
                  class:dark:text-blue-400={selectedToken?.symbol === token.symbol}
                >
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div class="text-left">
                      <div class="font-medium">{token.symbol}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div class="text-right text-xs">
                    <div class="font-medium">{formatPrice(token.price)}</div>
                    <div class="text-xs" class:text-green-500={token.change >= 0} class:text-red-500={token.change < 0}>
                      {formatChange(token.change)}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

      </nav>
    </div>
  </div>
</div>