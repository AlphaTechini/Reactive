<!-- Migrated EventsMonitor.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { contractService } from '$lib/contractService.js';
  import { walletStore } from '$lib/stores/wallet.js';
  import { notify } from '$lib/notify.js';
  export let maxEvents = 50;
  let events = []; let isSubscribed = false; let showDetails = {};
  const eventConfig = { StopLossSet:{color:'red',icon:'📉',title:'Stop Loss Updated'}, TakeProfitSet:{color:'green',icon:'📈',title:'Take Profit Updated'}, PanicModeTriggered:{color:'yellow',icon:'⚠️',title:'Panic Mode Activated'}, PanicModeDeactivated:{color:'blue',icon:'✅',title:'Panic Mode Deactivated'}, PortfolioRebalanced:{color:'purple',icon:'⚖️',title:'Portfolio Rebalanced'} };
  function addEvent(type,data){ const event={ id:Date.now()+Math.random(), type, data, timestamp:new Date(), ...eventConfig[type]}; events=[event,...events.slice(0,maxEvents-1)]; notify.success(formatEventMessage(type,data));} 
  function formatEventMessage(type,data){
    switch(type){
      case 'StopLossSet': {
        return `Stop loss set to ${data.percentage}%`;
      }
      case 'TakeProfitSet': {
        return `Take profit set to ${data.percentage}%`;
      }
      case 'PanicModeTriggered': {
        return 'Panic mode activated - Converting to stablecoins';
      }
      case 'PanicModeDeactivated': {
        return 'Panic mode deactivated';
      }
      case 'PortfolioRebalanced': {
        return `Portfolio rebalanced with ${data.tokens.length} tokens`;
      }
      default: {
        return 'Portfolio event occurred';
      }
    }
  }
  function formatEventDetails(type,data){
    switch(type){
      case 'StopLossSet': {
        return `Set stop loss threshold to ${data.percentage}% to automatically limit losses when positions drop below this level.`;
      }
      case 'TakeProfitSet': {
        return `Set take profit threshold to ${data.percentage}% to automatically secure gains when positions rise above this level.`;
      }
      case 'PanicModeTriggered': {
        return 'Emergency panic mode has been activated. All risky positions will be converted to stablecoins to preserve capital during market instability.';
      }
      case 'PanicModeDeactivated': {
        return 'Panic mode has been deactivated. Normal trading operations have resumed.';
      }
      case 'PortfolioRebalanced': {
        const tokenList = data.tokens.map((t,i)=>`${t}: ${data.allocations[i]}%`).join(', ');
        return `Portfolio has been automatically rebalanced to target allocations: ${tokenList}`;
      }
      default: {
        return 'A portfolio management event has occurred.';
      }
    }
  }
  const formatTimestamp = (ts)=> new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(ts);
  const truncateHash = (h)=> h?`${h.slice(0,6)}...${h.slice(-4)}`:''; function toggleDetails(id){ showDetails[id]=!showDetails[id]; showDetails={...showDetails}; }
  function openEtherscan(hash){ const explorerUrl = `https://explorer.reactive.network/tx/${hash}`; window.open(explorerUrl,'_blank'); }
  function clearEvents(){ events=[]; notify.success('Event history cleared');} 
  onMount(()=>{ const unsub = walletStore.subscribe(async (wallet)=>{ if(wallet.isConnected && !isSubscribed){ try { await contractService.initialize(); contractService.subscribeToEvents({ onStopLossSet:(d)=>addEvent('StopLossSet',d), onTakeProfitSet:(d)=>addEvent('TakeProfitSet',d), onPanicModeTriggered:(d)=>addEvent('PanicModeTriggered',d), onPanicModeDeactivated:(d)=>addEvent('PanicModeDeactivated',d), onPortfolioRebalanced:(d)=>addEvent('PortfolioRebalanced',d) }); isSubscribed=true; } catch(e){ console.error('Failed to subscribe to contract events:',e); notify.error('Failed to connect to contract events'); } } else if(!wallet.isConnected && isSubscribed){ contractService.unsubscribeFromEvents(); isSubscribed=false; }}); return ()=>unsub(); });
  onDestroy(()=>{ if(isSubscribed) contractService.unsubscribeFromEvents(); });
</script>
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
          <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4 8h14M4 12h8M4 16h5" /></svg>
        </div>
        <div><h3 class="text-lg font-semibold text-gray-900 dark:text-white">Contract Events</h3><p class="text-sm text-gray-500 dark:text-gray-400">{isSubscribed ? 'Monitoring live events' : 'Connect wallet to monitor events'}</p></div>
      </div>
      <div class="flex items-center space-x-2">{#if isSubscribed}<div class="flex items-center text-green-600 dark:text-green-400"><div class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div><span class="text-sm font-medium">Live</span></div>{/if}{#if events.length > 0}<button on:click={clearEvents} class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Clear</button>{/if}</div>
    </div>
  </div>
  <div class="max-h-96 overflow-y-auto">
    {#if events.length === 0}
      <div class="px-6 py-8 text-center">
        <svg class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        <p class="text-gray-500 dark:text-gray-400">No events yet</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{isSubscribed ? 'Events will appear here as they occur' : 'Connect your wallet to see contract events'}</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each events as event (event.id)}
          <div class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center"><span class="text-lg mr-2">{event.icon}</span><div><h4 class="text-sm font-medium text-gray-900 dark:text-white">{event.title}</h4><p class="text-sm text-gray-500 dark:text-gray-400">{formatEventMessage(event.type, event.data)}</p></div></div>
                {#if showDetails[event.id]}<div class="mt-3 pl-7"><p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{formatEventDetails(event.type, event.data)}</p><div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-xs"><div class="grid grid-cols-1 gap-2"><div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Transaction:</span><button on:click={() => openEtherscan(event.data.transactionHash)} class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-mono" aria-label="View transaction on Etherscan">{truncateHash(event.data.transactionHash)}</button></div><div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Block:</span><span class="font-mono text-gray-700 dark:text-gray-300">#{event.data.blockNumber}</span></div><div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">User:</span><span class="font-mono text-gray-700 dark:text-gray-300">{truncateHash(event.data.user)}</span></div></div></div></div>{/if}
              </div>
              <div class="flex items-center ml-4"><div class="text-right mr-3"><p class="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(event.timestamp)}</p></div><button on:click={() => toggleDetails(event.id)} class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label={showDetails[event.id] ? 'Hide event details' : 'Show event details'}><svg class="w-4 h-4 transition-transform duration-200" class:rotate-180={showDetails[event.id]} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></button></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>