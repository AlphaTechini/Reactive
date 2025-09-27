<script>
  import { walletService, isConnecting } from '$lib/stores/wallet.js';
</script>
<div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
  <div class="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
    <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10M3 6h10M3 14h10m4-4v.01M17 6v.01M17 14v.01M17 18v.01M7 18h6" /></svg>
  </div>
  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
  <p class="text-gray-600 dark:text-gray-400 mb-6">To access your automated portfolio dashboard, please connect a MetaMask compatible wallet.</p>
  <button on:click={() => walletService.connect()} class="w-full btn btn-primary h-11 text-base font-medium" disabled={$isConnecting}>
    {#if $isConnecting}
      <span class="flex items-center justify-center"><span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span> Connecting...</span>
    {:else} Connect Wallet {/if}
  </button>
  <p class="mt-6 text-xs text-gray-500 dark:text-gray-500">By connecting, you agree to sign a message for authentication. No transactions will be made.</p>
</div>