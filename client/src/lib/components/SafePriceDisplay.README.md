# SafePriceDisplay Component

A reusable Svelte component that safely displays token prices with proper null handling, loading states, and accessibility features.

## Features

- ✅ **Null-safe**: Handles undefined, null, and invalid price data gracefully
- ✅ **Loading states**: Shows spinner while price data is being fetched
- ✅ **Stale indicators**: Warns when price data is outdated
- ✅ **Accessibility**: Includes proper ARIA labels and roles
- ✅ **Reactive**: Automatically updates when prices change
- ✅ **Customizable**: Props for all common use cases
- ✅ **Dark mode**: Built-in dark mode support

## Requirements Satisfied

- **1.2**: Display placeholder text instead of attempting numeric operations on undefined/null
- **1.3**: Show loading indicators without triggering JavaScript errors
- **2.1**: Format numbers with appropriate decimal places based on price magnitude
- **2.4**: Include sign (+/-) and format to 2 decimal places for changes
- **3.2**: Display token-specific unavailable messages
- **3.3**: Handle missing price data gracefully

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokenAddress` | `string` | `''` | The token contract address to display price for |
| `showChange` | `boolean` | `true` | Whether to show the 24h price change percentage |
| `showLoading` | `boolean` | `true` | Whether to show loading spinner when fetching |
| `decimals` | `number \| 'auto'` | `'auto'` | Number of decimal places (auto adjusts based on price) |
| `fallbackText` | `string` | `'Price unavailable'` | Text to show when price data is missing |
| `className` | `string` | `''` | Additional CSS classes to apply |

## Usage Examples

### Basic Usage

```svelte
<script>
  import SafePriceDisplay from '$lib/components/SafePriceDisplay.svelte';
  
  let tokenAddress = '0x1234...';
</script>

<SafePriceDisplay {tokenAddress} />
```

### Without Change Indicator

```svelte
<SafePriceDisplay 
  tokenAddress={token.address} 
  showChange={false} 
/>
```

### Custom Fallback Text

```svelte
<SafePriceDisplay 
  tokenAddress={token.address} 
  fallbackText="No price data available" 
/>
```

### Fixed Decimal Places

```svelte
<SafePriceDisplay 
  tokenAddress={token.address} 
  decimals={4} 
/>
```

### Custom Styling

```svelte
<SafePriceDisplay 
  tokenAddress={token.address} 
  className="text-2xl font-bold text-blue-600" 
/>
```

## Migration Guide

### Before (Manual Implementation)

```svelte
<script>
  import { globalPricesStore, globalRefreshingStore } from '$lib/stores/globalStorage.js';
  import { formatPrice, formatChange, isValidPrice } from '$lib/utils/priceFormatter.js';
  
  $: tokenPrice = $globalPricesStore[token.address];
  $: currentPrice = tokenPrice?.price ?? null;
  $: priceChange = tokenPrice?.change ?? null;
  $: isLoading = $globalRefreshingStore;
  
  $: displayPrice = isValidPrice(currentPrice) 
    ? formatPrice(currentPrice) 
    : 'Loading...';
  
  $: displayChange = isValidPrice(priceChange)
    ? formatChange(priceChange)
    : 'N/A';
</script>

{#if isLoading}
  <span>Loading...</span>
{:else if currentPrice !== null}
  <span>{displayPrice}</span>
  {#if priceChange !== null}
    <span class:text-green-600={priceChange > 0} class:text-red-600={priceChange < 0}>
      {displayChange}
    </span>
  {/if}
{:else}
  <span>Price unavailable</span>
{/if}
```

### After (Using SafePriceDisplay)

```svelte
<script>
  import SafePriceDisplay from '$lib/components/SafePriceDisplay.svelte';
</script>

<SafePriceDisplay tokenAddress={token.address} />
```

## Component States

### 1. Loading State
Displayed when:
- `globalRefreshingStore` is `true`
- No price data exists yet

Shows:
- Animated spinner
- "Loading..." text

### 2. Data Available State
Displayed when:
- Valid price data exists in `globalPricesStore`

Shows:
- Formatted price with currency symbol
- 24h change percentage (if `showChange` is true)
- Stale indicator (⚠️) if data is older than 5 minutes

### 3. Unavailable State
Displayed when:
- No price data exists
- Not currently loading

Shows:
- Custom fallback text (default: "Price unavailable")

## Accessibility

The component includes proper accessibility attributes:

- `role="status"`: Indicates the element contains status information
- `aria-label`: Provides descriptive label for screen readers
- `aria-live="polite"`: Announces updates to screen readers
- `aria-busy="true"`: Indicates loading state

Example screen reader output:
- Loading: "Loading price data"
- Available: "Price: $1,234.56, Change: +5.67%"
- Unavailable: "Price unavailable"

## Styling

The component includes default styles with dark mode support. You can:

1. Use the `className` prop to add custom classes
2. Override styles using CSS specificity
3. Use Tailwind classes for quick styling

### Default Styles

- Price value: Bold, dark text
- Change positive: Green text
- Change negative: Red text
- Loading: Gray text with spinner
- Unavailable: Gray italic text
- Stale indicator: Small warning emoji

### Dark Mode

All styles automatically adapt to dark mode using the `:global(.dark)` selector.

## Performance

- Uses Svelte's reactive statements for efficient updates
- Only re-renders when relevant store values change
- Minimal DOM manipulation
- Lightweight component (~2KB)

## Dependencies

- `$lib/stores/globalStorage.js`: Price data stores
- `$lib/utils/priceFormatter.js`: Formatting utilities

## Testing

The component is designed to be easily testable:

```javascript
// Test with no data
<SafePriceDisplay tokenAddress="" />
// Expected: Shows fallback text

// Test with loading state
// Set globalRefreshingStore to true
// Expected: Shows loading spinner

// Test with valid data
// Set globalPricesStore with valid price
// Expected: Shows formatted price

// Test with stale data
// Set price with old timestamp
// Expected: Shows stale indicator
```

## Related Components

- `PriceChart.svelte`: Displays price history charts
- `PortfolioOverview.svelte`: Shows portfolio value
- `PriceServiceDemo.svelte`: Demonstrates price service

## Related Utilities

- `priceFormatter.js`: Price formatting functions
- `globalStorage.js`: Price data storage service

## Troubleshooting

### Price not showing

1. Check that `tokenAddress` is valid
2. Verify price data exists in `globalPricesStore`
3. Check browser console for errors
4. Ensure price service is initialized

### Loading state stuck

1. Check `globalRefreshingStore` value
2. Verify price service is fetching
3. Check network requests in DevTools
4. Ensure backend is responding

### Stale indicator always showing

1. Check price timestamp
2. Verify price service is refreshing
3. Adjust staleness threshold if needed

## Future Enhancements

Potential improvements for future versions:

- [ ] Configurable staleness threshold
- [ ] Custom loading component slot
- [ ] Price trend indicators (↑↓)
- [ ] Sparkline mini-charts
- [ ] Click to refresh functionality
- [ ] Tooltip with detailed info
- [ ] Animation on price changes
- [ ] Multiple currency support
