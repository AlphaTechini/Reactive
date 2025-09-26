<script>
  import { onMount, onDestroy } from 'svelte';
  import { uniswapPriceFeed, TIMEFRAMES } from '../uniswapPriceFeed.js';
  
  export let selectedToken = null;
  export let timeframe = '1d'; // '1h', '1d', '7d', '30d'
  
  let chartContainer;
  let plotly;
  let isLoading = true;
  let candleData = [];
  let error = null;
  let pushingOnChain = false;
  let updatingTimeframe = false;
  let lastLoadedKey = '';
  
  onMount(async () => {
    // Dynamically import Plotly to avoid SSR issues
    const Plotly = await import('plotly.js-dist');
    plotly = Plotly.default;
    
    if (selectedToken) {
      await loadCandles();
      createChart();
    }
    isLoading = false;
    
    // Subscribe to real-time price updates
    const interval = setInterval(async () => {
      if (selectedToken && plotly && chartContainer) {
        await refreshLatest();
      }
    }, 15000); // 15s polling for latest price
    return () => clearInterval(interval);
  });

  onDestroy(() => {
    if (plotly && chartContainer) {
      plotly.purge(chartContainer);
    }
  });

  $: if (selectedToken && plotly && chartContainer) {
    triggerReload();
  }
  $: if (timeframe && selectedToken && plotly && chartContainer) {
    triggerReload(true);
  }

  async function triggerReload(isTf=false) {
    const key = `${selectedToken?.address || 'synthetic'}:${timeframe}`;
    if (key === lastLoadedKey && !isTf) return; // no-op if nothing changed
    if (isTf) updatingTimeframe = true;
    await loadCandles();
    updateChart();
    lastLoadedKey = key;
    if (isTf) setTimeout(()=> updatingTimeframe=false, 150); // allow fade-out
  }

  async function loadCandles() {
    if (!selectedToken?.address) {
      candleData = generateSyntheticCandles();
      return;
    }
    error = null;
    try {
      const candles = await uniswapPriceFeed.getCandles(selectedToken.address, timeframeMapper(timeframe));
      candleData = candles;
    } catch (err) {
      console.error('Failed to load candles:', err);
      error = err.message;
      candleData = generateSyntheticCandles();
    }
  }

  async function refreshLatest() {
    if (!candleData.length || !selectedToken?.address) return;
    try {
      const latestPrice = await uniswapPriceFeed.getLatestPrice(selectedToken.address);
      if (latestPrice) {
        candleData[candleData.length - 1].close = latestPrice;
        updateChart();
        // Send to ingestion service (display-first then async persist)
        sendTick(latestPrice);
      }
    } catch (e) {
      console.warn('Latest price refresh failed', e.message);
    }
  }

  function sendTick(price) {
    try {
      const payload = JSON.stringify({
        token_address: selectedToken.address,
        symbol: selectedToken.symbol || 'TKN',
        price: Number(price),
        source: 'uniswap',
        ts: Date.now()
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/ingest/tick', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/ingest/tick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      }
    } catch (err) {
      console.debug('tick send failed', err);
    }
  }

  function timeframeMapper(tf) {
    if (tf === '1h') return '5m';
    if (tf === '1d') return '1h';
    if (tf === '7d') return '4h';
    if (tf === '30d') return '1d';
    return '1h';
  }

  function generateSyntheticCandles() {
    const mapped = timeframeMapper(timeframe);
    const cfg = TIMEFRAMES[mapped];
    const now = Date.now();
    const base = getBasePriceForToken(selectedToken?.symbol);
    const candles = [];
    let last = base;
    for (let i = cfg.candles; i > 0; i--) {
      const t = now - i * cfg.seconds * 1000;
      const drift = (Math.random() - 0.5) * 0.02;
      const open = last;
      const close = open * (1 + drift);
      const high = Math.max(open, close) * (1 + Math.random()*0.003);
      const low = Math.min(open, close) * (1 - Math.random()*0.003);
      candles.push({ time: t, open, high, low, close, volumeUSD: Math.random()*500 });
      last = close;
    }
    return candles;
  }
  
  function getBasePriceForToken(symbol) {
    const basePrices = {
      'ETH': 2500,
      'WBTC': 45000,
      'LINK': 12.5,
      'UNI': 8.2,
      'USDC': 1.0,
      'USDT': 1.0
    };
    return basePrices[symbol] || 100;
  }

  function createChart() {
    if (!plotly || !chartContainer || !candleData.length) return;
    const x = candleData.map(c => new Date(c.time));
    const open = candleData.map(c => c.open);
    const high = candleData.map(c => c.high);
    const low = candleData.map(c => c.low);
    const close = candleData.map(c => c.close);
    const isPositive = (close[close.length -1] - open[0]) >= 0;
    const increasingColor = '#10B981';
    const decreasingColor = '#EF4444';

    const candleTrace = {
      x,
      open,
      high,
      low,
      close,
      type: 'candlestick',
      name: selectedToken?.symbol || 'Price',
      increasing: { line: { color: increasingColor } },
      decreasing: { line: { color: decreasingColor } },
      hovertemplate: '<b>%{fullData.name}</b><br>'+ 'Open: $%{open:.4f}<br>High: $%{high:.4f}<br>Low: $%{low:.4f}<br>Close: $%{close:.4f}<extra></extra>'
    };

    const layout = {
      title: { text: `${selectedToken?.symbol || 'Token'} (${timeframe})`, font: { size: 15, color: '#374151' } },
      xaxis: { title: 'Time', showgrid: true, gridcolor: 'rgba(156,163,175,0.2)', type: 'date' },
      yaxis: { title: 'Price (USD)', showgrid: true, gridcolor: 'rgba(156,163,175,0.2)', tickprefix: '$' },
      margin: { t: 40, r: 20, b: 40, l: 60 },
      plot_bgcolor: 'rgba(0,0,0,0)', paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, sans-serif', size: 12, color: '#6B7280' },
      showlegend: false,
      dragmode: 'pan'
    };
    const config = { responsive: true, displayModeBar: true, scrollZoom: true };
    plotly.newPlot(chartContainer, [candleTrace], layout, config);
  }

  function updateChart() {
    if (!plotly || !chartContainer || !candleData.length) { createChart(); return; }
    const x = candleData.map(c => new Date(c.time));
    const open = candleData.map(c => c.open);
    const high = candleData.map(c => c.high);
    const low = candleData.map(c => c.low);
    const close = candleData.map(c => c.close);
    plotly.restyle(chartContainer, { x: [x], open: [open], high: [high], low: [low], close: [close] }, [0]);
    plotly.relayout(chartContainer, { 'title.text': `${selectedToken?.symbol || 'Token'} (${timeframe})` });
  }

  async function pushOnChain() {
    if (!selectedToken?.address) return;
    pushingOnChain = true;
    try {
      // lazy load contract service to avoid SSR issues
      const { secureContractService } = await import('../secureContractService.js');
      await secureContractService.initialize();
      await secureContractService.updateTokenPrice(selectedToken.address);
    } catch (e) {
      console.error('On-chain price update failed', e);
    } finally {
      pushingOnChain = false;
    }
  }
</script>

<div class="relative w-full h-full">
  {#if isLoading}
    <div class="flex items-center justify-center h-full">
      <div class="flex flex-col items-center">
        <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
      </div>
    </div>
  {:else if !selectedToken}
    <div class="flex items-center justify-center h-full">
      <div class="text-center">
        <svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Token Selected</h3>
        <p class="mt-2 text-gray-500 dark:text-gray-400">Select a token from the sidebar to view its price chart</p>
      </div>
    </div>
  {:else}
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 transition-opacity duration-150" class:opacity-0={updatingTimeframe}>
        <div bind:this={chartContainer} class="w-full h-full"></div>
      </div>
      {#if updatingTimeframe}
        <div class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
          <div class="flex flex-col items-center gap-3">
            <div class="h-6 w-32 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
            <div class="h-4 w-48 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="absolute top-2 right-2 flex gap-2 z-10">
    <button on:click={pushOnChain} class="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={pushingOnChain}>
      {pushingOnChain ? 'Updating...' : 'Store On-Chain'}
    </button>
  </div>
</div>