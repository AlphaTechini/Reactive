<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { portfolios, fetchPortfolios } from '$lib/stores/portfolios.js';
  import { walletAddress } from '$lib/stores/wallet.js';
  import { portfolioCount, simulationPortfolios } from '$lib/stores/simulation.js';
  import { appMode } from '$lib/stores/appMode.js';
  import { onMount } from 'svelte';
  
  let { open = $bindable(false) } = $props();
  
  let showPortfolios = $state(true);
  
  // Determine which portfolio count to use based on mode
  let isSimulation = $derived($appMode === 'simulation');
  let displayPortfolioCount = $derived(isSimulation ? $portfolioCount : $portfolios.length);
  let displayPortfolios = $derived(isSimulation ? Object.values($simulationPortfolios) : $portfolios);
  
  onMount(() => {
    if ($walletAddress) {
      fetchPortfolios();
    }
  });
  
  $effect(() => {
    if ($walletAddress) {
      fetchPortfolios();
    }
  });
  
  function navigateTo(route) {
    goto(route);
    if (window.innerWidth < 1024) {
      open = false;
    }
  }
  
  function isActive(route) {
    return $page.url.pathname === route || $page.url.pathname.startsWith(route + '/');
  }
</script>

<div class="flex">
  {#if open}
    <div class="fixed inset-0 z-40 lg:hidden" aria-hidden="true">
      <div class="fixed inset-0 bg-gray-600 bg-opacity-75" role="button" tabindex="0" 
           onclick={() => open = false} 
           onkeydown={(e) => e.key === 'Escape' && (open = false)} 
           aria-label="Close sidebar overlay">
      </div>
    </div>
  {/if}
  
  <div class="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0" 
       class:translate-x-0={open} 
       class:-translate-x-full={!open}>
    
    <!-- Header -->
    <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Navigation</h2>
      <button onclick={() => open = false} 
              class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden" 
              aria-label="Close sidebar">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- Navigation Content -->
    <div class="flex-1 overflow-y-auto">
      <nav class="px-4 py-4 space-y-2" aria-label="Main navigation">
        
        <!-- Main Routes -->
        <div class="space-y-1">
          <button onclick={() => navigateTo('/')} 
                  class="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  class:bg-blue-50={isActive('/')}
                  class:text-blue-600={isActive('/')}
                  class:dark:bg-blue-900={isActive('/')}
                  class:dark:text-blue-400={isActive('/')}
                  class:text-gray-700={!isActive('/')}
                  class:dark:text-gray-300={!isActive('/')}
                  class:hover:bg-gray-100={!isActive('/')}
                  class:dark:hover:bg-gray-700={!isActive('/')}>
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>

          
          {#if displayPortfolios.length > 0}
            {@const portfoliosRoute = isSimulation ? '/simulated/dashboard' : '/portfolios'}
            <button onclick={() => navigateTo(portfoliosRoute)} 
                    class="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors"
                    class:bg-blue-50={isActive(portfoliosRoute)}
                    class:text-blue-600={isActive(portfoliosRoute)}
                    class:dark:bg-blue-900={isActive(portfoliosRoute)}
                    class:dark:text-blue-400={isActive(portfoliosRoute)}
                    class:text-gray-700={!isActive(portfoliosRoute)}
                    class:dark:text-gray-300={!isActive(portfoliosRoute)}
                    class:hover:bg-gray-100={!isActive(portfoliosRoute)}
                    class:dark:hover:bg-gray-700={!isActive(portfoliosRoute)}>
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              My Portfolios
            </button>
          {/if}
          
          <button onclick={() => navigateTo('/dashboard')} 
                  class="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  class:bg-blue-50={isActive('/dashboard')}
                  class:text-blue-600={isActive('/dashboard')}
                  class:dark:bg-blue-900={isActive('/dashboard')}
                  class:dark:text-blue-400={isActive('/dashboard')}
                  class:text-gray-700={!isActive('/dashboard')}
                  class:dark:text-gray-300={!isActive('/dashboard')}
                  class:hover:bg-gray-100={!isActive('/dashboard')}
                  class:dark:hover:bg-gray-700={!isActive('/dashboard')}>
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </button>
        </div>
        
        <!-- Divider -->
        <div class="border-t border-gray-200 dark:border-gray-700 my-4"></div>
        
        <!-- Portfolio Section -->
        {#if $walletAddress || isSimulation}
          <div class="space-y-1">
            <button onclick={() => showPortfolios = !showPortfolios} 
                    class="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Portfolios ({displayPortfolioCount})</span>
              </div>
              <svg class="w-4 h-4 transition-transform" class:rotate-90={showPortfolios} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {#if showPortfolios}
              <div class="ml-4 space-y-1">
                <button onclick={() => navigateTo(isSimulation ? '/simulated/create-portfolio' : '/create-portfolio')} 
                        class="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Portfolio
                </button>
                
                {#if displayPortfolios.length > 0}
                  <div class="max-h-64 overflow-y-auto space-y-1">
                    {#each displayPortfolios as portfolio (isSimulation ? portfolio.name : portfolio.id)}
                      {@const portfolioPath = isSimulation ? `/simulated/portfolio/${encodeURIComponent(portfolio.name)}` : `/portfolio/${portfolio.id}`}
                      <button onclick={() => navigateTo(portfolioPath)} 
                              class="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors"
                              class:bg-blue-50={isActive(portfolioPath)}
                              class:text-blue-600={isActive(portfolioPath)}
                              class:dark:bg-blue-900={isActive(portfolioPath)}
                              class:dark:text-blue-400={isActive(portfolioPath)}
                              class:text-gray-700={!isActive(portfolioPath)}
                              class:dark:text-gray-300={!isActive(portfolioPath)}
                              class:hover:bg-gray-100={!isActive(portfolioPath)}
                              class:dark:hover:bg-gray-700={!isActive(portfolioPath)}>
                        <div class="flex items-center min-w-0">
                          <div class="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                          <span class="truncate">{portfolio.name}</span>
                        </div>
                        <svg class="w-4 h-4 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 italic">
                    No portfolios yet
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {:else}
          <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            {#if isSimulation}
              Enter simulation mode to create portfolios
            {:else}
              Connect wallet to view portfolios
            {/if}
          </div>
        {/if}
      </nav>
    </div>
  </div>
</div>
