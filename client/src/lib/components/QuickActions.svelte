<script>
  import TradeModal from './TradeModal.svelte';
  import { goto } from '$app/navigation';
  let isProcessing = false; let tradeOpen=false;
  async function handlePanicMode(){ isProcessing=true; try { console.log('Activating panic mode...'); await new Promise(r=>setTimeout(r,2000)); } catch(e){ console.error(e);} finally { isProcessing=false; } }
  async function handleQuickRebalance(){ isProcessing=true; try { console.log('Quick rebalancing...'); await new Promise(r=>setTimeout(r,2000)); } catch(e){ console.error(e);} finally { isProcessing=false; } }
  function openTrade(){ tradeOpen=true; }
  function onTradeClose(){ tradeOpen=false; }
  const go = (p) => (e) => { e.preventDefault(); goto(p); };
</script>
<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
  <div class="space-y-3">
    <button on:click={handlePanicMode} disabled={isProcessing} class="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed">{#if isProcessing}<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Processing...{:else}<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>Panic Mode{/if}</button>
    <button on:click={handleQuickRebalance} disabled={isProcessing} class="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed">{#if isProcessing}<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Processing...{:else}<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Quick Rebalance{/if}</button>
    <button on:click={openTrade} class="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3" /></svg>Quick Trade</button>
  <a href="/settings" on:click|preventDefault={go('/settings')} data-sveltekit-preload-data class="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Advanced Settings</a>
  <a href="/events" on:click|preventDefault={go('/events')} data-sveltekit-preload-data class="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.828 7l6.586 6.586a2 2 0 002.828 0l6.586-6.586A2 2 0 0019.414 7H4.828z" /></svg>View Events</a>
  </div>
  <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Performance</h4>
    <div class="space-y-2">
      <div class="flex justify-between text-sm"><span class="text-gray-500 dark:text-gray-400">Today's P&L</span><span class="font-medium text-green-600 dark:text-green-400">+$2,347.82</span></div>
      <div class="flex justify-between text-sm"><span class="text-gray-500 dark:text-gray-400">Total Return</span><span class="font-medium text-green-600 dark:text-green-400">+12.54%</span></div>
      <div class="flex justify-between text-sm"><span class="text-gray-500 dark:text-gray-400">Automation Saves</span><span class="font-medium text-blue-600 dark:text-blue-400">$8,921.33</span></div>
    </div>
  </div>
</div>
<TradeModal bind:isOpen={tradeOpen} on:close={onTradeClose} />