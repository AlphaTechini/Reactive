<script>
  import { onMount } from 'svelte';
  let dark = false;
  onMount(() => { dark = window.matchMedia('(prefers-color-scheme: dark)').matches; update(); });
  function toggle(){ dark = !dark; update(); }
  function update(){ if (dark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); localStorage.setItem('theme', dark ? 'dark':'light'); }
</script>
<button on:click={toggle} class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" aria-label="Toggle theme">
  {#if dark}
    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.64 13a1 1 0 00-1.05-.14 8.05 8.05 0 01-3.37.73A8.15 8.15 0 019.08 5.49a8 8 0 01.25-2A1 1 0 009 2.36 10.14 10.14 0 1022 14a1 1 0 00-.36-1z"/></svg>
  {:else}
    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5.64 17l-.71.71a1 1 0 001.41 1.41l.71-.71a1 1 0 00-1.41-1.41zM5 12a1 1 0 001-1V9a1 1 0 00-2 0v2a1 1 0 001 1zm7-7a1 1 0 001-1V2a1 1 0 00-2 0v2a1 1 0 001 1zM5.64 7.05a1 1 0 00.7.29 1 1 0 00.71-1.71l-.71-.7A1 1 0 104.93 6.34l.71.71zM17 11a1 1 0 001 1 1 1 0 001-1V9a1 1 0 00-2 0zm-5 8a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6.36-2.05a1 1 0 00-1.41 1.41l.71.71a1 1 0 001.41-1.41zM12 6.5A5.5 5.5 0 1017.5 12 5.51 5.51 0 0012 6.5z"/></svg>
  {/if}
</button>