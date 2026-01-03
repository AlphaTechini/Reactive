<script>
  export let simulation = false;
  export let className = '';
</script>
<span class={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${simulation ? 'bg-gradient-to-r from-[#c9a227]/10 via-[#d4af37]/10 to-[#e8c84a]/10 text-[#a68523] border-[#d4af37]/40 dark:from-[#c9a227]/20 dark:via-[#d4af37]/20 dark:to-[#e8c84a]/20 dark:text-[#e8c84a] dark:border-[#d4af37]/50' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700'} ${className}`}>
  <span class="w-1.5 h-1.5 rounded-full mr-1.5 {simulation ? 'bg-[#d4af37]' : 'bg-emerald-500'}"></span>
  {simulation ? 'Simulation' : 'Live'}
</span>
