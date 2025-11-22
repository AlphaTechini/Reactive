<script>
  import { walletConnected, isConnecting, connectionError, isMetaMaskInstalledStore } from '$lib/stores/wallet.js';
  
  let { class: className = '' } = $props();
</script>

<div class="connection-status {className}">
  {#if !$isMetaMaskInstalledStore}
    <div class="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>MetaMask not installed</span>
    </div>
  {:else if $isConnecting}
    <div class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
      <div class="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <span>Connecting to MetaMask...</span>
    </div>
  {:else if $walletConnected}
    <div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Wallet connected</span>
    </div>
  {:else if $connectionError}
    <div class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Connection failed</span>
    </div>
  {:else}
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Wallet not connected</span>
    </div>
  {/if}
</div>
