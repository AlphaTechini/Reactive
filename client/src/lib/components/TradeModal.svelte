<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { walletStore } from '$lib/stores/wallet.js';
  import { secureContractService } from '$lib/secureContractService.js';
  import { pendingTxs, hasSwapPending } from '$lib/stores/pendingTxs.js';
  import { INITIAL_TOKEN_LIST, REACT_TOKEN_ADDRESS } from '$lib/config/network.js';
  import { priceService } from '$lib/priceService.js';
  import { notify } from '$lib/notify.js';
  const dispatch = createEventDispatcher();
  export let isOpen=false; export let defaultTokenIn=null; export let defaultTokenOut=null;
  import { appMode } from '$lib/stores/appMode.js';
  let tokenIn = defaultTokenIn || ''; let tokenOut = defaultTokenOut || ''; let amount=''; let isProcessing=false; let error=null; let tokens=[];
  let tokenInBalance = null;
  let tokenOutBalance = null;
  let phase = null; // 'approving' | 'swapping' for live mode UX
  let latestPrice = null; let priceError=null; let fetchingPrice=false;
  let expectedOutDisplay = null; let minOutDisplay = null; let mode='simulation';
  let validationError = '';
  let slippageTolerance = 1; // 1% default
  let loadingBalances = false;
  
  $: appMode.subscribe(v=> mode=v);
  $: isAmountValid = amount && Number(amount) > 0;
  $: hasInsufficientBalance = tokenInBalance !== null && Number(amount) > tokenInBalance;
  $: canSwap = isAmountValid && !hasInsufficientBalance && !isProcessing && !$hasSwapPending && tokenIn !== tokenOut;
  $: tokenInMeta = tokens.find(t => t.address === tokenIn);
  $: tokenOutMeta = tokens.find(t => t.address === tokenOut);
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
  async function loadTokenBalances() {
    if (!tokenIn || !tokenOut || loadingBalances) return;
    
    loadingBalances = true;
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected) return;
      
      const provider = wallet.provider || wallet.rpcProvider;
      const userAddress = wallet.address;
      
      // Load balances for both tokens
      const promises = [tokenIn, tokenOut].map(async (token) => {
        try {
          const erc = new (await import('ethers')).Contract(token, [
            'function balanceOf(address) view returns (uint256)',
            'function decimals() view returns (uint8)'
          ], provider);
          
          const [balance, decimals] = await Promise.all([
            erc.balanceOf(userAddress),
            erc.decimals()
          ]);
          
          return {
            token,
            balance: Number((await import('ethers')).formatUnits(balance, decimals)),
            decimals
          };
        } catch (e) {
          console.warn(`Failed to load balance for ${token}:`, e);
          return { token, balance: 0, decimals: 18 };
        }
      });
      
      const results = await Promise.all(promises);
      tokenInBalance = results.find(r => r.token === tokenIn)?.balance || 0;
      tokenOutBalance = results.find(r => r.token === tokenOut)?.balance || 0;
      
    } catch (error) {
      console.warn('Failed to load token balances:', error);
    } finally {
      loadingBalances = false;
    }
  }

  function validateSwap() {
    validationError = '';
    
    if (!amount) return;
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      validationError = 'Enter a valid amount';
      return;
    }
    
    if (tokenInBalance !== null && numAmount > tokenInBalance) {
      validationError = `Insufficient ${tokenInMeta?.symbol || 'token'} balance`;
      return;
    }
    
    if (tokenIn === tokenOut) {
      validationError = 'Cannot swap token to itself';
      return;
    }
    
    if (numAmount < 0.000001) {
      validationError = 'Amount too small';
      return;
    }
  }

  function setMaxAmount() {
    if (tokenInBalance !== null) {
      amount = tokenInBalance.toString();
      validateSwap();
    }
  }

  async function submit() {
    if (!canSwap) return;
    
    isProcessing = true;
    error = null;
    phase = null;
    validationError = '';
    
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected) throw new Error('Please connect your wallet');
      
      validateSwap();
      if (validationError) throw new Error(validationError);
      
      if (mode === 'live') {
        phase = 'approving';
        notify.info('Preparing swap transaction...');
      }
      
      await secureContractService.initialize();
      const txReceipt = await secureContractService.executeSwap(tokenIn, tokenOut, amount, slippageTolerance);
      
      if (txReceipt?.hash) {
        pendingTxs.add({
          hash: txReceipt.hash,
          type: 'swap',
          tokenIn,
          tokenOut,
          amount
        });
      }
      
      notify.success('Swap completed successfully!');
      dispatch('swapped');
      close();
      
    } catch (err) {
      error = err?.message || String(err);
      notify.error(error);
    } finally {
      isProcessing = false;
      phase = null;
    }
  }

  function close() {
    isOpen = false;
    amount = '';
    validationError = '';
    error = null;
    dispatch('close');
  }

  // Load balances when tokens change
  $: if (tokenIn && tokenOut && isOpen) {
    loadTokenBalances();
  }
  
  // Validate on amount change
  $: if (amount) {
    validateSwap();
  }
</script>
{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Swap</h3>
        <button 
          on:click={close} 
          class="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isProcessing}
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Token In -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="tokenInSelect">
            From
          </label>
          {#if tokenInBalance !== null}
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">
                Balance: {tokenInBalance.toFixed(6)} {tokenInMeta?.symbol || 'TOKEN'}
              </span>
              <button 
                on:click={setMaxAmount}
                class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                disabled={isProcessing || loadingBalances}
              >
                MAX
              </button>
            </div>
          {:else if loadingBalances}
            <span class="text-sm text-gray-400 animate-pulse">Loading...</span>
          {/if}
        </div>
        
        <select 
          id="tokenInSelect" 
          class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          bind:value={tokenIn}
          disabled={isProcessing}
        >
          {#each tokens as t (t.address)}
            <option value={t.address}>{t.symbol}</option>
          {/each}
        </select>
      </div>

      <!-- Amount Input -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="amountInput">
          Amount
        </label>
        <div class="relative">
          <input 
            id="amountInput" 
            type="number"
            step="any"
            min="0"
            class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 {validationError ? 'border-red-500' : 'border-gray-300'}"
            bind:value={amount}
            on:input={validateSwap}
            placeholder="0.0"
            disabled={isProcessing}
          />
          <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <span class="text-gray-500 text-sm">{tokenInMeta?.symbol || 'TOKEN'}</span>
          </div>
        </div>
        
        {#if validationError}
          <p class="mt-1 text-sm text-red-600">{validationError}</p>
        {/if}
      </div>

      <!-- Swap Direction Icon -->
      <div class="flex justify-center mb-4">
        <button
          on:click={() => { const temp = tokenIn; tokenIn = tokenOut; tokenOut = temp; }}
          class="p-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
          disabled={isProcessing}
          title="Swap token direction"
          aria-label="Swap token direction"
        >
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      <!-- Token Out -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="tokenOutSelect">
            To
          </label>
          {#if tokenOutBalance !== null}
            <span class="text-sm text-gray-500">
              Balance: {tokenOutBalance.toFixed(6)} {tokenOutMeta?.symbol || 'TOKEN'}
            </span>
          {/if}
        </div>
        
        <select 
          id="tokenOutSelect" 
          class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          bind:value={tokenOut}
          disabled={isProcessing}
        >
          {#each tokens as t (t.address)}
            {#if t.address !== tokenIn}
              <option value={t.address}>{t.symbol}</option>
            {/if}
          {/each}
        </select>
      </div>

      <!-- Error Display -->
      {#if error}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{error}</p>
        </div>
      {/if}

      <!-- Processing Status -->
      {#if phase}
        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-center space-x-2 text-sm text-yellow-800">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>
              {#if phase === 'approving'}
                Approving token spend...
              {:else if phase === 'swapping'}
                Executing swap...
              {:else}
                Processing transaction...
              {/if}
            </span>
          </div>
        </div>
      {/if}

      <!-- Pending Transaction Warning -->
      {#if $hasSwapPending}
        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-center space-x-2 text-sm text-yellow-800">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Swap transaction in progress. Please wait...</span>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button 
          class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={close} 
          disabled={isProcessing}
        >
          Cancel
        </button>
        
        <button 
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          on:click={submit} 
          disabled={!canSwap}
        >
          {#if isProcessing}
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Swapping...</span>
          {:else}
            <span>Swap</span>
          {/if}
        </button>
      </div>

      <!-- Mode Indicator -->
      <div class="mt-4 text-xs text-gray-500 text-center">
        {mode === 'live' ? 'Live trading mode' : 'Simulation mode'} • 
        {tokenInMeta?.symbol || 'TOKEN'} → {tokenOutMeta?.symbol || 'TOKEN'}
      </div>
    </div>
  </div>
{/if}