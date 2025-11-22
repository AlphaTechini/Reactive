<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { walletAddress } from '$lib/stores/wallet.js';
  import { notify } from '$lib/notify.js';
  
  let { 
    requireWallet = false,
    redirectTo = '/',
    message = 'Please connect your wallet to access this page',
    children 
  } = $props();
  
  let isAuthorized = $state(false);
  let isChecking = $state(true);
  
  onMount(() => {
    checkAuthorization();
  });
  
  $effect(() => {
    checkAuthorization();
  });
  
  function checkAuthorization() {
    if (requireWallet && !$walletAddress) {
      isAuthorized = false;
      isChecking = false;
      notify.warning(message);
      goto(redirectTo);
    } else {
      isAuthorized = true;
      isChecking = false;
    }
  }
</script>

{#if isChecking}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Checking authorization...</p>
    </div>
  </div>
{:else if isAuthorized}
  {@render children?.()}
{:else}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <svg class="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      <button 
        onclick={() => goto(redirectTo)}
        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
      >
        Go to Home
      </button>
    </div>
  </div>
{/if}
