<script>
  export let simulation = false;
  export let className = '';
</script>
<span class={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${simulation ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700'} ${className}`}>
  {simulation ? 'Simulation Mode' : 'Live Mode'}
</span>
<style>
</style>
