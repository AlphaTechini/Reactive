<script>
  import { page } from '$app/stores';
  import { walletService, walletAddress, walletBalance, walletConnected } from '$lib/stores/wallet.js';
  import ThemeToggle from './ThemeToggle.svelte';
  
  export let toggleSidebar;
  
  $: shortAddress = walletService.formatAddress($walletAddress);
  $: formattedBalance = walletService.formatBalance($walletBalance);
</script>

<header class="surface-blur sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 shadow-sm">
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16 gap-4">
      <!-- Left side: Logo and mobile menu button -->
      <div class="flex items-center">
        <button
          on:click={toggleSidebar}
          class="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
          aria-label="Open sidebar"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div class="flex items-center ml-4 lg:ml-0">
          <div class="flex items-center">
            <!-- Logo -->
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <div class="ml-3">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
                Reactive Portfolio
              </h1>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Navigation -->
      <nav class="hidden md:flex items-center gap-2">
        <a href="/" class="nav-link { $page.route.id === '/' ? 'nav-link-active' : '' }">Dashboard</a>
        <a href="/settings" class="nav-link { $page.route.id === '/settings' ? 'nav-link-active' : '' }">Settings</a>
        <a href="/events" class="nav-link { $page.route.id === '/events' ? 'nav-link-active' : '' }">Events</a>
      </nav>

      <!-- Right side: Wallet info and connection -->
      <div class="flex items-center gap-3">
        <ThemeToggle />
        {#if $walletConnected}
          <!-- Wallet Balance -->
          <div class="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{formattedBalance} REACT</span>
          </div>
          
          <!-- Wallet Address -->
          <div class="flex items-center space-x-2">
            <div class="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
              {shortAddress}
            </div>
            <button
              on:click={() => walletService.disconnect()}
              class="btn btn-danger h-9 px-3"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span class="hidden sm:inline">Disconnect</span>
            </button>
          </div>
        {:else}
          <button
            on:click={() => walletService.connect()}
            class="btn btn-primary h-9 px-4"
          >
            Connect Wallet
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>