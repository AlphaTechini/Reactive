<script>
  import { onMount, onDestroy } from 'svelte';
  import { priceService } from '$lib/priceService.js';
  import { globalPricesStore } from '$lib/stores/globalStorage.js';
  import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
  
  export let open=false;
  
  // Build token categories dynamically from INITIAL_TOKEN_LIST
  const tokenCategories = {
    core: INITIAL_TOKEN_LIST.filter(t => t.category === 'core'),
    altcoins: INITIAL_TOKEN_LIST.filter(t => t.category === 'alt'),
    memecoins: INITIAL_TOKEN_LIST.filter(t => t.category === 'meme'),
    stablecoins: INITIAL_TOKEN_LIST.filter(t => t.category === 'stable'),
    reactive: INITIAL_TOKEN_LIST.filter(t => t.category === 'reactive')
  };
  
  let selectedToken = null;
  let query = '';
  let expandedCategories = { core: true, altcoins: true, memecoins: false, stablecoins: false, reactive: true };
  
  // Use Svelte 5 store subscription with $ prefix
  $: priceData = $globalPricesStore;
  
  // Log when prices update
  $: if (priceData && Object.keys(priceData).length > 0) {
    console.log('💰 Sidebar prices updated:', Object.keys(priceData).length, 'tokens');
    const firstKey = Object.keys(priceData)[0];
    console.log('💰 Sample:', firstKey, '=', priceData[firstKey]);
  }
  
  function toggleCategory(cat) { 
    expandedCategories[cat] = !expandedCategories[cat]; 
  }
  
  function selectToken(token) { 
    selectedToken = token; 
    window.dispatchEvent(new CustomEvent('tokenSelected', { detail: token })); 
  }
  
  function formatPrice(price) { 
    if (!price || price === null) return '$0.00';
    return `$${Number(price).toFixed(2)}`;
  }
  
  function formatChange(change) { 
    if (!change) return '+0.00%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Number(change).toFixed(2)}%`;
  }
  
  function filtered(list) { 
    if (!query.trim()) return list; 
    const q = query.trim().toLowerCase(); 
    return list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)); 
  }
  
  function getTokenWithPrice(token) {
    // Backend returns data keyed by symbol (ETH, BTC, etc.)
    const priceInfo = priceData[token.symbol];
    
    return {
      ...token,
      price: priceInfo?.priceUSD || 0,
      change: priceInfo?.priceChangePercent || 0
    };
  }
</script>
<div class="flex">
  {#if open}<div class="fixed inset-0 z-40 lg:hidden" aria-hidden="true"><div class="fixed inset-0 bg-gray-600 bg-opacity-75" role="button" tabindex="0" on:click={()=> open=false} on:keydown={(e) => e.key === 'Escape' && (open=false)} aria-label="Close sidebar overlay"></div></div>{/if}
  <div class="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0" class:translate-x-0={open} class:-translate-x-full={!open}>
    <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700"><h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tokens</h2><button on:click={()=> open=false} class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden" aria-label="Close sidebar"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><div class="relative"><label for="token-search" class="sr-only">Search tokens</label><input id="token-search" type="text" placeholder="Search tokens..." aria-label="Search tokens" bind:value={query} class="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60" /><svg class="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>{#if query}<button type="button" on:click={()=> query=''} class="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear search"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>{/if}</div></div>
    <div class="flex-1 overflow-y-auto"><nav class="px-4 py-4 space-y-2" aria-label="Token categories">
      <div class="space-y-1"><button on:click={()=> toggleCategory('core')} class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><div class="flex items-center"><div class="w-2 h-2 bg-orange-500 rounded-full mr-3"></div><span>Core ({tokenCategories.core.length})</span></div><svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.core} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>{#if expandedCategories.core}<div class="ml-4 space-y-1">{#each filtered(tokenCategories.core) as baseToken (baseToken.symbol)}{@const token = getTokenWithPrice(baseToken)}<button on:click={()=> selectToken(token)} class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" class:bg-blue-50={selectedToken?.symbol===token.symbol} class:dark:bg-blue-900={selectedToken?.symbol===token.symbol} class:text-blue-600={selectedToken?.symbol===token.symbol} class:dark:text-blue-400={selectedToken?.symbol===token.symbol}><div class="flex items-center"><div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">{token.symbol.slice(0,2)}</div><div class="text-left"><div class="font-medium">{token.symbol}</div><div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div></div></div><div class="text-right text-xs"><div class="font-medium">{formatPrice(token.price)}</div><div class="text-xs" class:text-green-500={token.change>=0} class:text-red-500={token.change<0}>{formatChange(token.change)}</div></div></button>{/each}</div>{/if}</div>
      <div class="space-y-1"><button on:click={()=> toggleCategory('altcoins')} class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><div class="flex items-center"><div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div><span>Altcoins ({tokenCategories.altcoins.length})</span></div><svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.altcoins} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>{#if expandedCategories.altcoins}<div class="ml-4 space-y-1 max-h-64 overflow-y-auto">{#each filtered(tokenCategories.altcoins) as baseToken (baseToken.symbol)}{@const token = getTokenWithPrice(baseToken)}<button on:click={()=> selectToken(token)} class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" class:bg-blue-50={selectedToken?.symbol===token.symbol} class:dark:bg-blue-900={selectedToken?.symbol===token.symbol} class:text-blue-600={selectedToken?.symbol===token.symbol} class:dark:text-blue-400={selectedToken?.symbol===token.symbol}><div class="flex items-center"><div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">{token.symbol.slice(0,2)}</div><div class="text-left"><div class="font-medium">{token.symbol}</div><div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div></div></div><div class="text-right text-xs"><div class="font-medium">{formatPrice(token.price)}</div><div class="text-xs" class:text-green-500={token.change>=0} class:text-red-500={token.change<0}>{formatChange(token.change)}</div></div></button>{/each}</div>{/if}</div>
      <div class="space-y-1"><button on:click={()=> toggleCategory('memecoins')} class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><div class="flex items-center"><div class="w-2 h-2 bg-pink-500 rounded-full mr-3"></div><span>Memecoins ({tokenCategories.memecoins.length})</span></div><svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.memecoins} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>{#if expandedCategories.memecoins}<div class="ml-4 space-y-1 max-h-64 overflow-y-auto">{#each filtered(tokenCategories.memecoins) as baseToken (baseToken.symbol)}{@const token = getTokenWithPrice(baseToken)}<button on:click={()=> selectToken(token)} class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" class:bg-blue-50={selectedToken?.symbol===token.symbol} class:dark:bg-blue-900={selectedToken?.symbol===token.symbol} class:text-blue-600={selectedToken?.symbol===token.symbol} class:dark:text-blue-400={selectedToken?.symbol===token.symbol}><div class="flex items-center"><div class="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">{token.symbol.slice(0,2)}</div><div class="text-left"><div class="font-medium">{token.symbol}</div><div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div></div></div><div class="text-right text-xs"><div class="font-medium">{formatPrice(token.price)}</div><div class="text-xs" class:text-green-500={token.change>=0} class:text-red-500={token.change<0}>{formatChange(token.change)}</div></div></button>{/each}</div>{/if}</div>
      <div class="space-y-1"><button on:click={()=> toggleCategory('stablecoins')} class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><div class="flex items-center"><div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div><span>Stablecoins ({tokenCategories.stablecoins.length})</span></div><svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.stablecoins} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>{#if expandedCategories.stablecoins}<div class="ml-4 space-y-1">{#each filtered(tokenCategories.stablecoins) as baseToken (baseToken.symbol)}{@const token = getTokenWithPrice(baseToken)}<button on:click={()=> selectToken(token)} class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" class:bg-blue-50={selectedToken?.symbol===token.symbol} class:dark:bg-blue-900={selectedToken?.symbol===token.symbol} class:text-blue-600={selectedToken?.symbol===token.symbol} class:dark:text-blue-400={selectedToken?.symbol===token.symbol}><div class="flex items-center"><div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">{token.symbol.slice(0,2)}</div><div class="text-left"><div class="font-medium">{token.symbol}</div><div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div></div></div><div class="text-right text-xs"><div class="font-medium">{formatPrice(token.price)}</div><div class="text-xs" class:text-green-500={token.change>=0} class:text-red-500={token.change<0}>{formatChange(token.change)}</div></div></button>{/each}</div>{/if}</div>
      <div class="space-y-1"><button on:click={()=> toggleCategory('reactive')} class="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><div class="flex items-center"><div class="w-2 h-2 bg-purple-500 rounded-full mr-3"></div><span>Reactive ({tokenCategories.reactive.length})</span></div><svg class="w-4 h-4 transition-transform" class:rotate-90={expandedCategories.reactive} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>{#if expandedCategories.reactive}<div class="ml-4 space-y-1">{#each filtered(tokenCategories.reactive) as baseToken (baseToken.symbol)}{@const token = getTokenWithPrice(baseToken)}<button on:click={()=> selectToken(token)} class="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" class:bg-blue-50={selectedToken?.symbol===token.symbol} class:dark:bg-blue-900={selectedToken?.symbol===token.symbol} class:text-blue-600={selectedToken?.symbol===token.symbol} class:dark:text-blue-400={selectedToken?.symbol===token.symbol}><div class="flex items-center"><div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3">{token.symbol.slice(0,2)}</div><div class="text-left"><div class="font-medium">{token.symbol}</div><div class="text-xs text-gray-500 dark:text-gray-400">{token.name}</div></div></div><div class="text-right text-xs"><div class="font-medium">{formatPrice(token.price)}</div><div class="text-xs" class:text-green-500={token.change>=0} class:text-red-500={token.change<0}>{formatChange(token.change)}</div></div></button>{/each}</div>{/if}</div>
    </nav></div>
  </div>
</div>