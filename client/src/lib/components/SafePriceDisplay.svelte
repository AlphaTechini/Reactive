<!--
  SafePriceDisplay Component
  
  A reusable component that safely displays token prices with proper null handling,
  loading states, and accessibility features.
  
  Requirements: 1.2, 1.3, 2.1, 2.4, 3.2, 3.3
-->
<script>
  import { globalPricesStore, globalRefreshingStore, globalStorage } from '$lib/stores/globalStorage.js';
  import { formatPrice, formatChange, isValidPrice } from '$lib/utils/priceFormatter.js';

  // Props
  export let tokenAddress = '';
  export let showChange = true;
  export let showLoading = true;
  export let decimals = 'auto';
  export let fallbackText = 'Price unavailable';
  export let className = '';

  // Reactive state
  $: priceData = tokenAddress ? $globalPricesStore[tokenAddress] : null;
  $: isLoading = $globalRefreshingStore && showLoading;
  $: hasData = globalStorage.isPriceAvailable(tokenAddress);
  $: isStale = globalStorage.isStale(tokenAddress, 5 * 60 * 1000); // 5 minutes
  
  // Extract price and change values safely
  $: price = priceData?.price ?? priceData?.current ?? null;
  $: change = priceData?.change ?? priceData?.change24h ?? null;
  
  // Format values
  $: displayPrice = isValidPrice(price) 
    ? formatPrice(price, { decimals, showCurrency: true })
    : fallbackText;
  
  $: displayChange = isValidPrice(change)
    ? formatChange(change, { decimals: 2, showSign: true, showPercent: true })
    : null;
  
  // Determine change color class
  $: changeColorClass = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
  
  // Accessibility label
  $: ariaLabel = hasData 
    ? `Price: ${displayPrice}${showChange && displayChange ? `, Change: ${displayChange}` : ''}`
    : isLoading 
      ? 'Loading price data'
      : fallbackText;
</script>

<div 
  class="safe-price-display {className}"
  role="status"
  aria-label={ariaLabel}
  aria-live="polite"
>
  {#if isLoading && !hasData}
    <!-- Loading state when no data available -->
    <div class="price-loading" aria-busy="true">
      <span class="loading-spinner"></span>
      <span class="loading-text">Loading...</span>
    </div>
  {:else if hasData}
    <!-- Price data available -->
    <div class="price-container">
      <span class="price-value" class:stale={isStale}>
        {displayPrice}
      </span>
      
      {#if showChange && displayChange}
        <span class="price-change {changeColorClass}">
          {displayChange}
        </span>
      {/if}
      
      {#if isStale}
        <span class="stale-indicator" title="Price data may be outdated">
          ⚠️
        </span>
      {/if}
    </div>
  {:else}
    <!-- No data available -->
    <div class="price-unavailable">
      <span class="unavailable-text">{fallbackText}</span>
    </div>
  {/if}
</div>

<style>
  .safe-price-display {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .price-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
  }

  .loading-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    font-size: 0.875rem;
  }

  .price-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .price-value {
    font-weight: 600;
    color: #111827;
  }

  .price-value.stale {
    opacity: 0.7;
  }

  .price-change {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .stale-indicator {
    font-size: 0.75rem;
    cursor: help;
  }

  .price-unavailable {
    color: #9ca3af;
    font-style: italic;
  }

  .unavailable-text {
    font-size: 0.875rem;
  }

  /* Dark mode support */
  :global(.dark) .price-value {
    color: #f9fafb;
  }

  :global(.dark) .price-loading {
    color: #9ca3af;
  }

  :global(.dark) .loading-spinner {
    border-color: #374151;
    border-top-color: #60a5fa;
  }

  :global(.dark) .price-unavailable {
    color: #6b7280;
  }
</style>
