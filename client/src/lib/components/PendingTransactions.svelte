<script>
  import { pendingTxs, pendingCount } from '$lib/stores/pendingTxs.js';
  import { slide } from 'svelte/transition';
  
  export let compact = false;
  
  // Format transaction type for display
  function formatTxType(tx) {
    switch(tx.type) {
      case 'swap': return `Swap ${tx.tokenIn?.slice(0,6)}... → ${tx.tokenOut?.slice(0,6)}...`;
      case 'deposit': return 'Deposit REACT';
      case 'withdraw': return 'Withdraw REACT';
      case 'approval': return 'Token Approval';
      default: return 'Transaction';
    }
  }
  
  // Format status with appropriate styling
  function getStatusClass(status) {
    switch(status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }
  
  // Format elapsed time
  function formatElapsed(timestamp) {
    const elapsed = Date.now() - timestamp;
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
  
  // Open transaction in explorer
  function openInExplorer(hash) {
    window.open(`https://reactscan.net/tx/${hash}`, '_blank');
  }
</script>

{#if $pendingCount > 0}
  <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm" transition:slide={{ duration: 300 }}>
    {#if !compact}
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-gray-900">
          Pending Transactions ({$pendingCount})
        </h3>
        <button 
          on:click={() => pendingTxs.clear()} 
          class="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>
    {/if}
    
    <div class="space-y-2">
      {#each $pendingTxs as tx (tx.hash)}
        <div 
          class="flex items-center justify-between p-3 rounded-lg border {getStatusClass(tx.status)} transition-colors duration-200"
          transition:slide={{ duration: 200 }}
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <div class="flex-shrink-0">
                {#if tx.status === 'pending'}
                  <div class="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                {:else if tx.status === 'confirmed'}
                  <svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                {:else if tx.status === 'failed'}
                  <svg class="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                {:else}
                  <svg class="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </div>
              
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {formatTxType(tx)}
                </p>
                <div class="flex items-center space-x-2 text-xs text-gray-500">
                  <span class="capitalize">{tx.status}</span>
                  <span>•</span>
                  <span>{formatElapsed(tx.timestamp)}</span>
                  {#if tx.confirmations > 0}
                    <span>•</span>
                    <span>{tx.confirmations} confirmations</span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2 ml-3">
            <button
              on:click={() => openInExplorer(tx.hash)}
              class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="View in explorer"
              aria-label="View transaction in explorer"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            
            <button
              on:click={() => pendingTxs.remove(tx.hash)}
              class="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Remove"
              aria-label="Remove transaction"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

