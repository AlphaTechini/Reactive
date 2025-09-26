<script>
  import { onMount } from 'svelte';
  let theme = 'dark';
  const STORAGE_KEY = 'reactive-theme';

  function applyTheme(next) {
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  onMount(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') theme = saved; else {
        // prefer system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }
      applyTheme(theme);
    } catch (e) { /* ignore */ }
  });
</script>

<button type="button" on:click={toggle}
  class="btn btn-outline h-9 w-9 p-0 relative group" aria-label="Toggle color theme">
  {#if theme === 'dark'}
    <svg class="h-5 w-5 text-amber-300 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a.75.75 0 01.75.75V4a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zm5.657 2.343a.75.75 0 011.06 1.06l- .884.884a.75.75 0 11-1.06-1.06l.884-.884zM10 6a4 4 0 100 8 4 4 0 000-8zm8 4a.75.75 0 01-.75.75H16a.75.75 0 010-1.5h1.25A.75.75 0 0118 10zm-3.343 5.657l.884.884a.75.75 0 11-1.06 1.06l-.884-.884a.75.75 0 111.06-1.06zM10 16a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0v-1.25A.75.75 0 0110 16zM4.343 15.657a.75.75 0 011.06 0 .75.75 0 010 1.06l-.884.884a.75.75 0 11-1.06-1.06l.884-.884zM4 10a.75.75 0 01-.75.75H2a.75.75 0 010-1.5h1.25A.75.75 0 014 10zm1.947-6.303a.75.75 0 010 1.06.75.75 0 01-1.06 0l-.884-.884a.75.75 0 111.06-1.06l.884.884z" />
    </svg>
  {:else}
    <svg class="h-5 w-5 text-blue-600 transition-transform group-active:scale-90" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8 8 0 1010.586 10.586z" />
    </svg>
  {/if}
  <span class="sr-only">Toggle theme</span>
</button>

<style>
  button:focus-visible { outline: none; }
</style>
