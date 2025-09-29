<script>
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { walletStore } from '$lib/stores/wallet.js';
  import { depositReact } from '$lib/stores/portfolio.js';
  import { executeSwap } from '$lib/uniswap.js';
  import { getTokenPrice } from '$lib/uniswap.js';
  import { ethers } from 'ethers';
  import { INITIAL_TOKEN_LIST, REACT_TOKEN_ADDRESS } from '$lib/config/network.js';
  import { notify } from '$lib/notify.js';

  export let isOpen = false;
  const dispatch = createEventDispatcher();

  let token = INITIAL_TOKEN_LIST[0].address; // default
  let amount = '';
  let processing = false;
    let userBalance = null;

  async function submit() {
    processing = true;
    try {
      const wallet = get(walletStore);
      if (!wallet.isConnected) throw new Error('Connect your wallet to deposit');
      if (!amount || Number(amount) <= 0) throw new Error('Enter an amount');
      const signer = wallet.provider ? (await wallet.provider.getSigner()) : null;
      // Check user balance for token
      if (token.toLowerCase() !== REACT_TOKEN_ADDRESS.toLowerCase()) {
        // Attempt to swap token -> REACT via router
        // Check balance
        const erc = new ethers.Contract(token, [ 'function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)' ], signer || wallet.provider);
        const decimals = (await erc.decimals?.()) || 18;
        const rawBal = await erc.balanceOf(await signer.getAddress());
        const bal = Number(ethers.formatUnits(rawBal, decimals));
        userBalance = bal;
        if (bal < Number(amount)) throw new Error('Insufficient token balance for swap');
        notify.info('Swapping selected token to REACT...');
        // executeSwap handles signer internally
        const swapReceipt = await executeSwap(token, REACT_TOKEN_ADDRESS, amount, 1);
        if (swapReceipt && swapReceipt.hash) {
          // track pending tx
          try { const { pendingTxs } = await import('$lib/stores/pendingTxs.js'); pendingTxs.add({ hash: swapReceipt.hash, type: 'swap', tokenIn: token, tokenOut: REACT_TOKEN_ADDRESS }); } catch(e){}
        }
        notify.success('Swap completed');
        // After swap, deposit REACT (amount received may be different; for simplicity deposit requested amount)
        await depositReact(amount);
      } else {
        // token is REACT — deposit directly
        const tx = await depositReact(amount);
        if (tx && tx.hash) { try { const { pendingTxs } = await import('$lib/stores/pendingTxs.js'); pendingTxs.add({ hash: tx.hash, type: 'deposit' }); } catch(e){} }
      }
      notify.success('Deposit completed');
      dispatch('deposited');
      isOpen = false;
    } catch (e) {
      notify.error(e.message || 'Deposit failed');
    } finally { processing = false; }
  }

  function close() { isOpen = false; }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 class="text-lg font-semibold mb-4">Deposit to Portfolio (REACT)</h3>
  <label class="block mb-2 text-sm" for="depositTokenSelect">Token</label>
  <select id="depositTokenSelect" class="w-full p-2 mb-3 border rounded" bind:value={token}>
        {#each INITIAL_TOKEN_LIST as t}
          <option value={t.address}>{t.symbol}</option>
        {/each}
      </select>
  <label class="block mb-2 text-sm" for="depositAmountInput">Amount</label>
  <input id="depositAmountInput" class="w-full p-2 mb-3 border rounded" bind:value={amount} placeholder="1.0" />
      <div class="flex justify-end space-x-2"><button class="px-4 py-2 bg-gray-200 rounded" on:click={close} disabled={processing}>Cancel</button><button class="px-4 py-2 bg-blue-600 text-white rounded" on:click={submit} disabled={processing}>{processing ? 'Processing...' : 'Deposit'}</button></div>
    </div>
  </div>
{/if}
