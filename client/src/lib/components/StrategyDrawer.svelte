<script>
  import StrategyManager from './StrategyManager.svelte';
  import { onMount } from 'svelte';
  export let selectedToken = null; export let automationAddress = null; let open=false; function toggle(){ open=!open; } export { toggle as toggleDrawer }; let prefersReducedMotion=false; onMount(()=>{ prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; });
</script>
<div class="hidden xl:block"><StrategyManager {selectedToken} {automationAddress} /></div>
<div class="xl:hidden">
  <button class="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500" aria-haspopup="dialog" aria-expanded={open} on:click={()=> open=true}>Strategy</button>
  {#if open}
    <div class="fixed inset-0 z-50 flex" role="dialog" aria-modal="true"><div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" on:click={()=> open=false} aria-hidden="true"></div><div class="ml-auto h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300" class:translate-x-0={open} class:translate-x-full={!open} style={prefersReducedMotion ? 'transition:none':''}><div class="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-700"><h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Automation Strategy</h3><button class="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" on:click={()=> open=false} aria-label="Close strategy panel"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div><div class="overflow-y-auto p-4 flex-1"><StrategyManager {selectedToken} {automationAddress} /></div></div></div>
  {/if}
</div>