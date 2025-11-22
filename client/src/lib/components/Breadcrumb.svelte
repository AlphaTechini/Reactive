<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { currentPortfolio } from '$lib/stores/portfolios.js';
  
  // Generate breadcrumb items based on current route
  let breadcrumbs = $derived(() => {
    const path = $page.url.pathname;
    const items = [];
    
    // Always start with Home
    items.push({ label: 'Home', path: '/', active: path === '/' });
    
    // Parse path segments
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return items;
    }
    
    // Handle specific routes
    if (segments[0] === 'portfolios') {
      items.push({ label: 'My Portfolios', path: '/portfolios', active: true });
    } else if (segments[0] === 'create-portfolio') {
      items.push({ label: 'Create Portfolio', path: '/create-portfolio', active: true });
    } else if (segments[0] === 'portfolio' && segments[1]) {
      items.push({ label: 'My Portfolios', path: '/portfolios', active: false });
      const portfolioName = $currentPortfolio?.name || `Portfolio ${segments[1]}`;
      items.push({ label: portfolioName, path: `/portfolio/${segments[1]}`, active: true });
    } else if (segments[0] === 'dashboard') {
      items.push({ label: 'Dashboard', path: '/dashboard', active: true });
    } else if (segments[0] === 'settings') {
      items.push({ label: 'Settings', path: '/settings', active: true });
    }
    
    return items;
  });
  
  function navigate(path) {
    goto(path);
  }
</script>

{#if breadcrumbs().length > 1}
  <nav class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
    {#each breadcrumbs() as crumb, index}
      {#if index > 0}
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      {/if}
      
      {#if crumb.active}
        <span class="font-medium text-gray-900 dark:text-white" aria-current="page">
          {crumb.label}
        </span>
      {:else}
        <button 
          onclick={() => navigate(crumb.path)}
          class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {crumb.label}
        </button>
      {/if}
    {/each}
  </nav>
{/if}
