<script>
  import { walletService, isConnecting, isMetaMaskInstalledStore } from '$lib/stores/wallet.js';
  $: installed = $isMetaMaskInstalledStore;
  function handleConnect(){ walletService.connect(); }
  function handleInstall(){ walletService.promptInstall(); }
</script>
<div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
  <div class="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
    <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10M3 6h10M3 14h10m4-4v.01M17 6v.01M17 14v.01M17 18v.01M7 18h6" /></svg>
  </div>
  {#if installed}
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
    <p class="text-gray-600 dark:text-gray-400 mb-6">To access your automated portfolio dashboard, connect with MetaMask and sign a short message.</p>
    <button on:click={handleConnect} class="w-full btn btn-primary h-11 text-base font-medium" disabled={$isConnecting}>
      {#if $isConnecting}
        <span class="flex items-center justify-center"><span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span> Connecting...</span>
      {:else} Connect MetaMask {/if}
    </button>
    <p class="mt-6 text-xs text-gray-500 dark:text-gray-500">No funds movement. A message signature creates a 30‑minute session.</p>
  {:else}
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">MetaMask Required</h2>
    <p class="text-gray-600 dark:text-gray-400 mb-6">Install MetaMask to manage and automate your portfolio on the Reactive Network.</p>
    <button on:click={handleInstall} class="w-full btn btn-accent h-11 text-base font-medium">Install MetaMask</button>
    <p class="mt-6 text-xs text-gray-500 dark:text-gray-500">After installing, return to this tab and click Connect.</p>
  {/if}
</div>