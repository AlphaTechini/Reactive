<script>
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { walletStore } from '$lib/stores/wallet.js';
  import { executeSwap } from '$lib/uniswap.js';
  import { secureContractService } from '$lib/secureContractService.js';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let defaultTokenIn = null;
  export let defaultTokenOut = null;

  let tokenIn = defaultTokenIn || '';
  let tokenOut = defaultTokenOut || '';
  let amount = '';
  let isProcessing = false;
  let error = null;
  let tokens = [];

  async function loadTokens() {
    try {
      await secureContractService.initialize();
      tokens = secureContractService.getSupportedTokens();
      if (!tokenIn && tokens.length) tokenIn = tokens[0].address;
      if (!tokenOut && tokens.length > 1) tokenOut = tokens[1].address;
    } catch (e) {
      console.error('Failed to load tokens', e);
    }
  }

  $: isOpen && loadTokens();

  async function submit() {
    isProcessing = true;
    error = null;
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected) throw new Error('Please connect your wallet');

      await executeSwap(tokenIn, tokenOut, amount, 1);
      dispatch('swapped');
      close();
    } catch (err) {
      error = err?.message || String(err);
    } finally {
      isProcessing = false;
    }
  }

  function close() {
    isOpen = false;
    dispatch('close');
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 class="text-lg font-semibold mb-4">Quick Trade</h3>

      <label class="block mb-2 text-sm">Token In</label>
      <select class="w-full p-2 mb-3 border rounded" bind:value={tokenIn}>
        {#each tokens as t}
          <option value={t.address}>{t.symbol}</option>
        {/each}
      </select>

      <label class="block mb-2 text-sm">Token Out</label>
      <select class="w-full p-2 mb-3 border rounded" bind:value={tokenOut}>
        {#each tokens as t}
          {#if t.address !== tokenIn}
            <option value={t.address}>{t.symbol}</option>
          {/if}
        {/each}
      </select>

      <label class="block mb-2 text-sm">Amount (tokenIn units)</label>
      <input class="w-full p-2 mb-3 border rounded" bind:value={amount} placeholder="1.0" />

      {#if error}
        <div class="text-red-600 mb-3">{error}</div>
      {/if}

      <div class="flex justify-end space-x-2">
        <button class="px-4 py-2 bg-gray-200 rounded" on:click={close} disabled={isProcessing}>Cancel</button>
        <button class="px-4 py-2 bg-blue-600 text-white rounded" on:click={submit} disabled={isProcessing}>
          {#if isProcessing}
            Processing...
          {:else}
            Swap
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* minimal modal styles — project uses Tailwind so these are fallback */
</style>
