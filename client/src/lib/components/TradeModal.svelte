<script>
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { walletStore } from '$lib/stores/wallet.js';
  import { executeSwap } from '$lib/uniswap.js';
  import { secureContractService } from '$lib/secureContractService.js';
  import { INITIAL_TOKEN_LIST, REACT_TOKEN_ADDRESS } from '$lib/config/network.js';
  import { fetchPriceIfChanged, getCachedPrice } from '$lib/priceSources/coingeckoPriceService.js';
  const dispatch = createEventDispatcher();
  export let isOpen=false; export let defaultTokenIn=null; export let defaultTokenOut=null;
  import { appMode } from '$lib/stores/appMode.js';
  let tokenIn = defaultTokenIn || ''; let tokenOut = defaultTokenOut || ''; let amount=''; let isProcessing=false; let error=null; let tokens=[];
  let tokenInBalance = null;
  let phase = null; // 'approving' | 'swapping' for live mode UX
  let latestPrice = null; let priceError=null; let fetchingPrice=false;
  let expectedOutDisplay = null; let minOutDisplay = null; let mode='simulation';
  $: appMode.subscribe(v=> mode=v);
  async function loadTokens(){
    try {
      await secureContractService.initialize();
      tokens = secureContractService.getSupportedTokens();
    } catch(e){
      console.warn('Falling back to static token list, contract token discovery failed:', e.message);
      tokens = INITIAL_TOKEN_LIST.map(t=> ({...t}));
    }
    if(!tokens.length){
      tokens = INITIAL_TOKEN_LIST.map(t=> ({...t}));
    }
    if(!tokenIn && tokens.length) tokenIn = tokens[0].address;
    if(!tokenOut && tokens.length>1) tokenOut = tokens.find(t=> t.address !== tokenIn)?.address || tokens[0].address;
  }
  async function fetchOnDemandPrice(){
    if(!isOpen) return; // only when modal open
    try {
      priceError=null; fetchingPrice=true; latestPrice=null;
      // Derive a symbol (assuming token struct includes symbol via secureContractService)
      const tokenMeta = tokens.find(t=> t.address === tokenIn) || tokens[0];
      if(!tokenMeta){ return; }
      const symbol = tokenMeta.symbol || tokenMeta.Symbol || tokenMeta.ticker;
      latestPrice = await fetchPriceIfChanged(symbol);
    } catch(err){ priceError = err?.message || String(err); }
    finally { fetchingPrice=false; }
  }
  $: isOpen && loadTokens();
  $: isOpen && tokens.length && fetchOnDemandPrice();
  
  // ensure tokens is a proper array of {address, symbol, decimals}
  $: if (tokens && tokens.length) {
    tokens = tokens.map(t => ({ address: t.address || t, symbol: t.symbol || t.symbol || 'TOKEN', decimals: t.decimals || 18 }));
  }
  async function submit(){
    isProcessing=true; error=null; phase=null; expectedOutDisplay=null; minOutDisplay=null;
    try {
      const wallet = get(walletStore);
      if(!wallet.isConnected) throw new Error('Please connect your wallet');
      if(!amount || Number(amount)<=0) throw new Error('Enter a valid amount');
      if (!tokens || tokens.length === 0) throw new Error('Token list not loaded');
      // Check tokenIn balance
      try {
        const provider = wallet.provider || wallet.rpcProvider;
        const signer = wallet.provider ? await wallet.provider.getSigner() : null;
        const erc = new (await import('ethers')).Contract(tokenIn, [ 'function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)' ], signer || provider);
        const dec = (await erc.decimals?.()) || 18;
        const raw = await erc.balanceOf(await signer.getAddress());
        tokenInBalance = Number((await import('ethers')).formatUnits(raw, dec));
        if (tokenInBalance < Number(amount)) throw new Error('Insufficient token balance');
      } catch(e) { console.warn('Balance check failed', e); }
      await fetchOnDemandPrice();
      if(mode==='live') phase='approving';
      const txOrReceipt = await executeSwap(tokenIn, tokenOut, amount, 1);
      // For live mode receipt already awaited inside service; simulation returns mock tx
      dispatch('swapped'); close();
    } catch(err){ error = err?.message || String(err); }
    finally { isProcessing=false; phase=null; }
  }
  function close(){ isOpen=false; dispatch('close'); }
</script>
{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 class="text-lg font-semibold mb-4">Quick Trade</h3>
  <label class="block mb-2 text-sm" for="tokenInSelect">Token In</label>
  <select id="tokenInSelect" class="w-full p-2 mb-3 border rounded" bind:value={tokenIn}>{#each tokens as t (t.address)}<option value={t.address}>{t.symbol}</option>{/each}</select>
  <label class="block mb-2 text-sm" for="tokenOutSelect">Token Out</label>
  <select id="tokenOutSelect" class="w-full p-2 mb-3 border rounded" bind:value={tokenOut}>{#each tokens as t (t.address)}{#if t.address !== tokenIn}<option value={t.address}>{t.symbol}</option>{/if}{/each}</select>
  <label class="block mb-2 text-sm" for="amountInput">Amount (tokenIn units)</label>
  <input id="amountInput" class="w-full p-2 mb-3 border rounded" bind:value={amount} placeholder="1.0" />
      <div class="mb-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <div>
          {#if fetchingPrice}
            <span>Fetching price...</span>
          {:else if priceError}
            <span class="text-red-500">{priceError}</span>
          {:else if latestPrice != null}
            <span>Current Price: ${latestPrice}</span>
          {/if}
        </div>
        <button type="button" class="text-blue-600 hover:underline disabled:opacity-40" on:click={fetchOnDemandPrice} disabled={fetchingPrice}>Refresh</button>
      </div>
      {#if error}<div class="text-red-600 mb-3">{error}</div>{/if}
      {#if phase}
        <div class="text-xs mb-2 text-gray-500">
          {#if phase==='approving'}Approving token spend...{/if}
          {#if phase==='swapping'}Executing swap...{/if}
        </div>
      {/if}
      <div class="flex justify-end space-x-2"><button class="px-4 py-2 bg-gray-200 rounded" on:click={close} disabled={isProcessing}>Cancel</button><button class="px-4 py-2 bg-blue-600 text-white rounded" on:click={submit} disabled={isProcessing}>{#if isProcessing}{#if phase==='approving'}Approving...{:else if phase==='swapping'}Swapping...{:else}Processing...{/if}{:else}Swap{/if}</button></div>
    </div>
  </div>
{/if}