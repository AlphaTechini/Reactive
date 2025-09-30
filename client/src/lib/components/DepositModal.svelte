<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { walletStore } from '$lib/stores/wallet.js';
  import { depositReact } from '$lib/stores/portfolio.js';
  import { secureContractService } from '$lib/secureContractService.js';
  import { pendingTxs, hasSwapPending, hasDepositPending } from '$lib/stores/pendingTxs.js';
  import { ethers } from 'ethers';
  import { INITIAL_TOKEN_LIST, REACT_TOKEN_ADDRESS } from '$lib/config/network.js';
  import { notify } from '$lib/notify.js';

  export let isOpen = false;
  const dispatch = createEventDispatcher();

  let token = INITIAL_TOKEN_LIST[0].address; // default
  let amount = '';
  let processing = false;
  let userBalance = null;
  let tokenDecimals = 18;
  let tokenSymbol = 'REACT';
  let loadingBalance = false;
  let validationError = '';

  // Enhanced validation states
  $: isAmountValid = amount && Number(amount) > 0;
  $: hasInsufficientBalance = userBalance !== null && Number(amount) > userBalance;
  $: canSubmit = isAmountValid && !hasInsufficientBalance && !processing && !$hasSwapPending && !$hasDepositPending;
  $: isReactToken = token.toLowerCase() === REACT_TOKEN_ADDRESS.toLowerCase();

  // Load user balance when token changes
  $: if (token && isOpen) {
    loadTokenBalance();
  }

  async function loadTokenBalance() {
    if (!token || processing) return;
    
    loadingBalance = true;
    validationError = '';
    
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected) {
        userBalance = null;
        tokenSymbol = 'TOKEN';
        return;
      }

      const provider = wallet.provider || wallet.rpcProvider;
      if (!provider) throw new Error('No provider available');

      const erc = new ethers.Contract(token, [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ], provider);

      const [decimals, symbol, balance] = await Promise.all([
        erc.decimals().catch(() => 18),
        erc.symbol().catch(() => 'TOKEN'),
        erc.balanceOf(await wallet.provider?.getSigner()?.getAddress() || wallet.address)
      ]);

      tokenDecimals = decimals;
      tokenSymbol = symbol;
      userBalance = Number(ethers.formatUnits(balance, decimals));
    } catch (error) {
      console.warn('Failed to load token balance:', error);
      validationError = 'Failed to load token balance';
      userBalance = null;
      tokenSymbol = 'TOKEN';
    } finally {
      loadingBalance = false;
    }
  }

  // Validate amount input
  function validateAmount() {
    validationError = '';
    
    if (!amount) return;
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      validationError = 'Enter a valid amount';
      return;
    }
    
    if (userBalance !== null && numAmount > userBalance) {
      validationError = `Insufficient ${tokenSymbol} balance`;
      return;
    }
    
    if (numAmount < 0.000001) {
      validationError = 'Amount too small';
      return;
    }
  }

  // Set max balance
  function setMaxAmount() {
    if (userBalance !== null) {
      amount = userBalance.toString();
      validateAmount();
    }
  }

  async function submit() {
    if (!canSubmit) return;
    
    processing = true;
    validationError = '';
    
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected) throw new Error('Connect your wallet to deposit');
      
      validateAmount();
      if (validationError) throw new Error(validationError);
      
      const signer = await wallet.provider?.getSigner();
      if (!signer) throw new Error('Unable to get wallet signer');

      if (!isReactToken) {
        // Swap first, then deposit
        notify.info(`Swapping ${tokenSymbol} to REACT...`);
        
        await secureContractService.initialize();
        const swapReceipt = await secureContractService.executeSwap(token, REACT_TOKEN_ADDRESS, amount, 1);
        
        if (swapReceipt?.hash) {
          pendingTxs.add({ 
            hash: swapReceipt.hash, 
            type: 'swap', 
            tokenIn: token, 
            tokenOut: REACT_TOKEN_ADDRESS,
            amount: amount
          });
        }
        
        notify.success('Swap completed! Now depositing REACT...');
        
        // Deposit REACT after swap
        const depositTx = await depositReact(amount);
        if (depositTx?.hash) {
          pendingTxs.add({ 
            hash: depositTx.hash, 
            type: 'deposit',
            amount: amount
          });
        }
      } else {
        // Direct REACT deposit
        notify.info('Depositing REACT to portfolio...');
        const tx = await depositReact(amount);
        
        if (tx?.hash) {
          pendingTxs.add({ 
            hash: tx.hash, 
            type: 'deposit',
            amount: amount
          });
        }
      }
      
      notify.success('Deposit initiated successfully!');
      dispatch('deposited');
      close();
      
    } catch (error) {
      console.error('Deposit failed:', error);
      validationError = error.message || 'Deposit failed';
      notify.error(validationError);
    } finally {
      processing = false;
    }
  }

  function close() { 
    isOpen = false;
    amount = '';
    validationError = '';
    userBalance = null;
  }

  // Load balance on mount
  onMount(() => {
    if (isOpen) loadTokenBalance();
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {isReactToken ? 'Deposit REACT' : 'Swap & Deposit'}
        </h3>
        <button 
          on:click={close} 
          class="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={processing}
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Token Selection -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="depositTokenSelect">
          Select Token
        </label>
        <select 
          id="depositTokenSelect" 
          class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          bind:value={token}
          disabled={processing}
          on:change={validateAmount}
        >
          {#each INITIAL_TOKEN_LIST as t}
            <option value={t.address}>{t.symbol}</option>
          {/each}
        </select>
      </div>

      <!-- Amount Input -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="depositAmountInput">
            Amount
          </label>
          {#if userBalance !== null}
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">
                Balance: {userBalance.toFixed(6)} {tokenSymbol}
              </span>
              <button 
                on:click={setMaxAmount}
                class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                disabled={processing || loadingBalance}
              >
                MAX
              </button>
            </div>
          {:else if loadingBalance}
            <span class="text-sm text-gray-400 animate-pulse">Loading balance...</span>
          {/if}
        </div>
        
        <div class="relative">
          <input 
            id="depositAmountInput" 
            type="number"
            step="any"
            min="0"
            class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed {validationError ? 'border-red-500' : 'border-gray-300'}"
            bind:value={amount}
            on:input={validateAmount}
            placeholder="0.0"
            disabled={processing}
          />
          <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <span class="text-gray-500 text-sm">{tokenSymbol}</span>
          </div>
        </div>
        
        {#if validationError}
          <p class="mt-1 text-sm text-red-600">{validationError}</p>
        {/if}
      </div>

      <!-- Swap Info -->
      {#if !isReactToken && amount}
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center space-x-2 text-sm text-blue-800">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This will swap {amount} {tokenSymbol} to REACT, then deposit to your portfolio.</span>
          </div>
        </div>
      {/if}

      <!-- Pending Transaction Warning -->
      {#if $hasSwapPending || $hasDepositPending}
        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-center space-x-2 text-sm text-yellow-800">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Transaction in progress. Please wait...</span>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button 
          class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={close} 
          disabled={processing}
        >
          Cancel
        </button>
        
        <button 
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          on:click={submit} 
          disabled={!canSubmit}
        >
          {#if processing}
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          {:else}
            <span>{isReactToken ? 'Deposit' : 'Swap & Deposit'}</span>
          {/if}
        </button>
      </div>

      <!-- Help Text -->
      <div class="mt-4 text-xs text-gray-500 text-center">
        {#if isReactToken}
          Deposit REACT tokens directly to your portfolio
        {:else}
          Your {tokenSymbol} will be swapped to REACT via our router, then deposited
        {/if}
      </div>
    </div>
  </div>
{/if}
