<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { walletService, walletAddress, walletBalance, walletConnected, isConnecting, connectionError } from '$lib/stores/wallet.js';
  import ModeBadge from './ModeBadge.svelte';
  import { appMode } from '$lib/stores/appMode.js';
  import { priceService } from '$lib/priceService.js';
  import { globalRefreshingStore, globalLastUpdatedStore } from '$lib/stores/globalStorage.js';
  import { notify } from '$lib/notify.js';
  
  $: simulationMode = $appMode === 'simulation';
  
  function toggleMode(){
    appMode.set(simulationMode ? 'live' : 'simulation');
    if (typeof window !== 'undefined') window.location.reload();
  }
  
  async function refreshPrices() {
    try {
      await priceService.refreshAllPrices();
      notify.success('Prices refreshed successfully');
    } catch (error) {
      notify.error('Failed to refresh prices');
    }
  }

  async function handleWalletConnect() {
    try {
      // Provide user guidance for Edge browser
      const isEdge = navigator.userAgent.includes('Edg');
      if (isEdge) {
        notify.info('If MetaMask popup is blocked, click "Allow" in the address bar or manually open MetaMask extension');
      }
      
      await walletService.connect();
    } catch (error) {
      if (error.message.includes('blocked')) {
        notify.error('Browser blocked MetaMask popup. Please allow popups for this site or manually open MetaMask extension');
      } else {
        notify.error('Failed to connect wallet: ' + error.message);
      }
    }
  }
  
  import ThemeToggle from './ThemeToggle.svelte';
  export let toggleSidebar;
  $: shortAddress = walletService.formatAddress($walletAddress);
  $: formattedBalance = walletService.formatBalance($walletBalance);
  const go = (p) => (e) => { e.preventDefault(); goto(p); };
</script>
<header class="surface-blur sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 shadow-sm">
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16 gap-4">
      <div class="flex items-center">
        <button on:click={toggleSidebar} class="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden" aria-label="Open sidebar">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="flex items-center ml-4 lg:ml-0">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg>
            </div>
            <div class="ml-3"><h1 class="text-lg font-semibold text-gray-900 dark:text-white">Reactive Portfolio</h1></div>
          </div>
        </div>
      </div>
      <nav class="hidden md:flex items-center gap-2">
        <a href="/" on:click|preventDefault={go('/')} class="nav-link { $page.url.pathname === '/' ? 'nav-link-active' : '' }">Home</a>
        <a href="/dashboard" on:click|preventDefault={go('/dashboard')} class="nav-link { $page.url.pathname === '/dashboard' ? 'nav-link-active' : '' }">Dashboard</a>
      </nav>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <ModeBadge simulation={simulationMode} />
          <button on:click={toggleMode} class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition" aria-label="Toggle Mode">
            {simulationMode ? 'Go Live' : 'Simulate'}
          </button>
        </div>
        
        <!-- Price Refresh Button -->
        <div class="flex items-center gap-2">
          <button on:click={refreshPrices} disabled={$globalRefreshingStore} class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1" aria-label="Refresh Prices">
            {#if $globalRefreshingStore}
              <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {:else}
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            {/if}
            <span class="hidden sm:inline">{$globalRefreshingStore ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {#if $globalLastUpdatedStore}
            <span class="hidden md:inline text-xs text-gray-500 dark:text-gray-400">
              Updated: {new Date($globalLastUpdatedStore).toLocaleTimeString()}
            </span>
          {/if}
        </div>
        
        <ThemeToggle />
        {#if $isConnecting}
          <!-- Connecting State -->
          <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span>Connecting...</span>
          </div>
        {:else if $walletConnected}
          <!-- Connected State -->
          <div class="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected"></div>
            <span>{formattedBalance} REACT</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="hidden sm:block text-sm text-gray-600 dark:text-gray-400">{shortAddress}</div>
            <button on:click={() => walletService.disconnect()} class="btn btn-danger h-9 px-3">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span class="hidden sm:inline">Disconnect</span>
            </button>
          </div>
        {:else}
          <!-- Disconnected State -->
          <div class="flex items-center space-x-2">
            {#if $connectionError}
              <div class="hidden sm:flex items-center space-x-1 text-xs text-red-600 dark:text-red-400" title={$connectionError}>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Connection failed</span>
              </div>
            {/if}
            <button on:click={handleWalletConnect} class="btn btn-primary h-9 px-4" disabled={$isConnecting}>
              {#if $isConnecting}
                <svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              {:else}
                Connect Wallet
              {/if}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>