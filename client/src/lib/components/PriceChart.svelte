<script>
  import { onMount, onDestroy } from 'svelte';
  import { uniswapPriceFeed, TIMEFRAMES } from '$lib/uniswapPriceFeed.js';
  import { appMode } from '$lib/stores/appMode.js';
  import { fetchPriceIfChanged } from '$lib/priceSources/coingeckoPriceService.js';
  export let selectedToken = null;
  export let timeframe = '1d';
  let chartContainer; let plotly; let isLoading = true; let candleData = []; let error = null; let spotPrice=null; let fetchingSpot=false;
  // Provide a default sample token when none is passed in
  if (!selectedToken) selectedToken = { symbol: 'mBTC', address: '0x1111111111111111111111111111111111111111' };
  let pushingOnChain = false;
  let chartData = {};
  let layout = {
    title: 'Price Chart',
    xaxis: { title: 'Time' },
    yaxis: { title: 'Price (USD)' },
    template: 'plotly_dark'
  }; let updatingTimeframe=false; let lastLoadedKey='';
  onMount(async ()=>{ const Plotly = await import('plotly.js-dist'); plotly = Plotly.default; if(selectedToken){ await loadCandles(); createChart(); } isLoading=false; const interval=setInterval(async()=>{ if(selectedToken && plotly && chartContainer) await refreshLatest(); },15000); return ()=> clearInterval(interval); });
  onDestroy(()=>{ if(plotly && chartContainer) plotly.purge(chartContainer); });
  $: if(selectedToken && plotly && chartContainer) triggerReload();
  $: if(timeframe && selectedToken && plotly && chartContainer) triggerReload(true);
  async function triggerReload(isTf=false){ const key=`${selectedToken?.address||'synthetic'}:${timeframe}`; if(key===lastLoadedKey && !isTf) return; if(isTf) updatingTimeframe=true; await loadCandles(); updateChart(); lastLoadedKey=key; if(isTf) setTimeout(()=> updatingTimeframe=false,150); }
  async function loadCandles(){
    if(!selectedToken?.address){ candleData=generateSyntheticCandles(); return; }
    error=null;
    const mode = $appMode;
    if(mode === 'simulation'){
      try{ candleData = await uniswapPriceFeed.getCandles(selectedToken.address, timeframeMapper(timeframe)); }
      catch(err){ console.error('Failed to load candles:',err); error=err.message; candleData=generateSyntheticCandles(); }
    } else { // live mode: build sparse candle set around spot fetches (no heavy polling)
      try {
        await fetchSpot();
        // If we already have spotPrice, create a flat candle backbone (placeholders)
        const mapped=timeframeMapper(timeframe);
        const cfg=TIMEFRAMES[mapped]; const now=Date.now(); const base=spotPrice||getBasePriceForToken(selectedToken?.symbol); const candles=[]; for(let i=cfg.candles;i>0;i--){ const t=now - i*cfg.seconds*1000; candles.push({ time:t, open:base, high:base, low:base, close:base, volumeUSD:0 }); }
        candleData=candles;
      } catch(err){ error=err.message; candleData=[]; }
    }
  }
  async function fetchSpot(){
    if(!selectedToken?.symbol) return; try { fetchingSpot=true; spotPrice = await fetchPriceIfChanged(selectedToken.symbol); } catch(e){ console.warn('Spot price fetch failed', e.message); } finally { fetchingSpot=false; }
  }
  async function refreshLatest(){
    if(!candleData.length || !selectedToken?.address) return;
    const mode = $appMode;
    if(mode==='simulation'){
      try{ const latestPrice = await uniswapPriceFeed.getLatestPrice(selectedToken.address); if(latestPrice){ candleData[candleData.length-1].close=latestPrice; updateChart(); sendTick(latestPrice);} }catch(e){ console.warn('Latest price refresh failed', e.message); }
    } else {
      // Live: only update if >5% change or >5min (handled inside fetchPriceIfChanged via caching logic) then restyle last candle
      await fetchSpot(); if(spotPrice!=null && candleData.length){ candleData[candleData.length-1].close=spotPrice; updateChart(); }
    }
  }
  function sendTick(price){ try{ const payload=JSON.stringify({ token_address:selectedToken.address, symbol:selectedToken.symbol||'TKN', price:Number(price), source:'uniswap', ts:Date.now() }); if(navigator.sendBeacon) navigator.sendBeacon('/ingest/tick', new Blob([payload],{type:'application/json'})); else fetch('/ingest/tick',{ method:'POST', headers:{'Content-Type':'application/json'}, body:payload }); }catch(err){ console.debug('tick send failed', err);} }
  function timeframeMapper(tf){ if(tf==='1h') return '5m'; if(tf==='1d') return '1h'; if(tf==='7d') return '4h'; if(tf==='30d') return '1d'; return '1h'; }
  function generateSyntheticCandles(){ const mapped=timeframeMapper(timeframe); const cfg=TIMEFRAMES[mapped]; const now=Date.now(); const base=getBasePriceForToken(selectedToken?.symbol); const candles=[]; let last=base; for(let i=cfg.candles;i>0;i--){ const t=now - i*cfg.seconds*1000; const drift=(Math.random()-0.5)*0.02; const open=last; const close=open*(1+drift); const high=Math.max(open,close)*(1+Math.random()*0.003); const low=Math.min(open,close)*(1-Math.random()*0.003); candles.push({ time:t, open, high, low, close, volumeUSD:Math.random()*500 }); last=close; } return candles; }
  function getBasePriceForToken(symbol){ const basePrices={ ETH:2500, WBTC:45000, LINK:12.5, UNI:8.2, USDC:1, USDT:1 }; return basePrices[symbol]||100; }
  function createChart(){ if(!plotly||!chartContainer||!candleData.length) return; const x=candleData.map(c=>new Date(c.time)); const open=candleData.map(c=>c.open); const high=candleData.map(c=>c.high); const low=candleData.map(c=>c.low); const close=candleData.map(c=>c.close); const increasingColor='#10B981'; const decreasingColor='#EF4444'; const candleTrace={ x, open, high, low, close, type:'candlestick', name:selectedToken?.symbol||'Price', increasing:{ line:{ color:increasingColor } }, decreasing:{ line:{ color:decreasingColor } }, hovertemplate:'<b>%{fullData.name}</b><br>Open: $%{open:.4f}<br>High: $%{high:.4f}<br>Low: $%{low:.4f}<br>Close: $%{close:.4f}<extra></extra>'}; const sim = $appMode==='simulation'; const layoutConfig={ title:{ text:`${selectedToken?.symbol||'Token'} (${timeframe}) ${sim? '(Sim)': '(Live)'}`, font:{ size:15, color:'#374151'}}, xaxis:{ title:'Time', showgrid:true, gridcolor:'rgba(156,163,175,0.2)', type:'date'}, yaxis:{ title:'Price (USD)', showgrid:true, gridcolor:'rgba(156,163,175,0.2)', tickprefix:'$'}, annotations: sim? [{ text:'Simulation (mock / synthetic data)', x:0, xref:'paper', y:1.1, yref:'paper', showarrow:false, font:{ size:11, color:'#6B7280'} }]:[], margin:{ t:40, r:20, b:40, l:60}, plot_bgcolor:'rgba(0,0,0,0)', paper_bgcolor:'rgba(0,0,0,0)', font:{ family:'Inter, sans-serif', size:12, color:'#6B7280'}, showlegend:false, dragmode:'pan'}; const config={ responsive:true, displayModeBar:true, scrollZoom:true }; plotly.newPlot(chartContainer,[candleTrace],layoutConfig,config); }
  function updateChart(){ if(!plotly||!chartContainer||!candleData.length){ createChart(); return;} const x=candleData.map(c=>new Date(c.time)); const open=candleData.map(c=>c.open); const high=candleData.map(c=>c.high); const low=candleData.map(c=>c.low); const close=candleData.map(c=>c.close); plotly.restyle(chartContainer,{ x:[x], open:[open], high:[high], low:[low], close:[close] },[0]); plotly.relayout(chartContainer,{ 'title.text': `${selectedToken?.symbol||'Token'} (${timeframe}) ${$appMode==='simulation' ? '(Sim)' : '(Live)'}` }); }
  // Load price history from webhook service for mock trading
  async function loadPriceHistory() {
    if (!selectedToken?.address) return;
    
    try {
      const { secureContractService } = await import('$lib/secureContractService.js');
      const history = await secureContractService.getPriceHistory(selectedToken.address);
      
      if (history && history.length > 0) {
        // Convert to Plotly format
        const timestamps = history.map(h => new Date(h.timestamp));
        const prices = history.map(h => h.price);
        const changes = history.map(h => h.change * 100);
        
        // Update chart data
        chartData = {
          x: timestamps,
          y: prices,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${selectedToken.symbol} Price`,
          line: { color: '#10b981', width: 2 },
          marker: { size: 4, color: changes.map(c => c > 0 ? '#10b981' : '#ef4444') }
        };
        
        // Update layout for better visualization
        layout = {
          ...layout,
          title: `${selectedToken.symbol} Price History (Mock)`,
          xaxis: { title: 'Time', type: 'date' },
          yaxis: { title: 'Price (USD)', tickformat: '.6f' },
          annotations: [{
            text: 'Mock Trading Mode - Percentage-based movements',
            x: 0.5, y: 1.1, xref: 'paper', yref: 'paper',
            showarrow: false, font: { size: 12, color: '#6b7280' }
          }]
        };
      }
    } catch (e) {
      console.error('Failed to load price history:', e);
    }
  }
  
  // Simulate pushing price update (mock only)
  async function pushOnChain() { 
    if (!selectedToken?.address) return; 
    pushingOnChain = true; 
    
    try { 
      console.log(`📊 Simulating price update for ${selectedToken.symbol}`);
      
      // In mock mode, we just refresh the price history
      await loadPriceHistory();
      
      // Show success message
      const { notify } = await import('$lib/notify.js');
      notify.success(`Mock price update completed for ${selectedToken.symbol}`);
      
    } catch(e) { 
      console.error('Mock price update failed', e); 
      const { notify } = await import('$lib/notify.js');
      notify.error('Failed to update mock price');
    } finally { 
      pushingOnChain = false; 
    } 
  }
</script>

<div class="relative w-full h-full">
  {#if isLoading}
    <div class="flex items-center justify-center h-full"><div class="flex flex-col items-center"><div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading chart...</p></div></div>
  {:else if !selectedToken}
    <div class="flex items-center justify-center h-full"><div class="text-center"><svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg><h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Token Selected</h3><p class="mt-2 text-gray-500 dark:text-gray-400">Select a token from the sidebar to view its price chart</p></div></div>
  {:else if error}
    <div class="flex items-center justify-center h-full"><div class="text-center max-w-sm"><div class="w-10 h-10 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center"><svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.938 19h14.124c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.206 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h3 class="text-sm font-medium text-gray-900 dark:text-white">Price Data Error</h3><p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{error}</p></div></div>
  {:else}
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 transition-opacity duration-150" class:opacity-0={updatingTimeframe}>
        <div bind:this={chartContainer} class="w-full h-full"></div>
      </div>
      {#if updatingTimeframe}
        <div class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
          <div class="flex flex-col items-center gap-3">
            <div class="h-6 w-32 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"></div>
            <div class="h-4 w-48 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"></div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
  <div class="absolute top-2 right-2 flex gap-2 z-10">
    {#if $appMode==='simulation'}
      <button on:click={pushOnChain} class="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={pushingOnChain}>{pushingOnChain ? 'Updating...' : 'Store On-Chain'}</button>
    {:else}
      <button on:click={refreshLatest} class="px-3 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50" disabled={fetchingSpot}>{fetchingSpot ? 'Fetching...' : 'Refresh Spot'}</button>
      {#if spotPrice != null}<span class="px-2 py-1 rounded bg-gray-800 text-xs text-gray-200">${spotPrice}</span>{/if}
    {/if}
  </div>
</div>
<!-- Removed duplicate script/markup block -->