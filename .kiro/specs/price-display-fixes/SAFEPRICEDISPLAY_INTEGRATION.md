# SafePriceDisplay Component - Integration Guide

## Quick Start

The SafePriceDisplay component is now ready to use throughout the application. This guide shows how to integrate it into existing components.

## Basic Integration

### Step 1: Import the Component

```svelte
<script>
  import SafePriceDisplay from '$lib/components/SafePriceDisplay.svelte';
</script>
```

### Step 2: Replace Manual Price Display

**Before:**
```svelte
<script>
  import { globalPricesStore } from '$lib/stores/globalStorage.js';
  import { formatPrice } from '$lib/utils/priceFormatter.js';
  
  $: tokenPrice = $globalPricesStore[token.address];
  $: displayPrice = tokenPrice?.price ? formatPrice(tokenPrice.price) : 'N/A';
</script>

<span>{displayPrice}</span>
```

**After:**
```svelte
<script>
  import SafePriceDisplay from '$lib/components/SafePriceDisplay.svelte';
</script>

<SafePriceDisplay tokenAddress={token.address} />
```

## Common Use Cases

### 1. Dashboard Price Display

```svelte
<!-- In dashboard/+page.svelte -->
<div class="price-section">
  <h3>{selectedToken.name}</h3>
  <SafePriceDisplay 
    tokenAddress={selectedToken.address}
    showChange={true}
    className="text-2xl font-bold"
  />
</div>
```

### 2. Token List

```svelte
<!-- In token list component -->
{#each tokens as token}
  <div class="token-row">
    <span>{token.symbol}</span>
    <SafePriceDisplay 
      tokenAddress={token.address}
      showChange={false}
      decimals={4}
    />
  </div>
{/each}
```

### 3. Portfolio Overview

```svelte
<!-- In portfolio overview -->
<div class="portfolio-item">
  <div class="token-info">
    <img src={token.logo} alt={token.symbol} />
    <span>{token.name}</span>
  </div>
  <SafePriceDisplay 
    tokenAddress={token.address}
    showChange={true}
    showLoading={true}
  />
</div>
```

### 4. Price Chart Header

```svelte
<!-- In price chart component -->
<div class="chart-header">
  <h2>{token.symbol} Price</h2>
  <SafePriceDisplay 
    tokenAddress={token.address}
    showChange={true}
    decimals="auto"
    className="text-xl"
  />
</div>
```

## Migration Checklist

When migrating a component to use SafePriceDisplay:

- [ ] Import SafePriceDisplay component
- [ ] Remove manual price formatting code
- [ ] Remove manual null checks
- [ ] Remove manual loading state handling
- [ ] Replace price display markup with SafePriceDisplay
- [ ] Test all states (loading, available, unavailable)
- [ ] Verify accessibility with screen reader
- [ ] Check dark mode appearance

## Components to Migrate (Priority Order)

### High Priority (P0)
1. ✅ `dashboard/+page.svelte` - Already using safe patterns, can enhance with component
2. `portfolio/[id]/+page.svelte` - Portfolio detail page
3. `PortfolioOverview.svelte` - Portfolio overview component

### Medium Priority (P1)
4. `PriceChart.svelte` - Price chart component
5. `+page.svelte` - Home page
6. `create-portfolio/+page.svelte` - Portfolio creation

### Low Priority (P2)
7. `TradeModal.svelte` - Trading modal
8. `QuickActions.svelte` - Quick actions panel
9. Other price-dependent components

## Testing After Integration

After integrating SafePriceDisplay into a component:

1. **Test Loading State**
   - Clear localStorage
   - Refresh page
   - Verify loading spinner appears
   - Verify no console errors

2. **Test Data Available State**
   - Wait for prices to load
   - Verify price displays correctly
   - Verify change percentage shows (if enabled)
   - Verify colors are correct (green/red)

3. **Test Unavailable State**
   - Use invalid token address
   - Verify fallback text appears
   - Verify no console errors

4. **Test Stale Data**
   - Set old timestamp in localStorage
   - Verify stale indicator (⚠️) appears
   - Verify tooltip shows on hover

5. **Test Accessibility**
   - Use screen reader
   - Verify aria-label is descriptive
   - Verify role="status" is present
   - Verify aria-live updates work

6. **Test Dark Mode**
   - Toggle dark mode
   - Verify colors adapt correctly
   - Verify contrast is sufficient

## Common Patterns

### Pattern 1: Conditional Token Address

```svelte
<SafePriceDisplay 
  tokenAddress={selectedToken?.address || ''}
  fallbackText="Select a token"
/>
```

### Pattern 2: Large Display

```svelte
<SafePriceDisplay 
  tokenAddress={token.address}
  className="text-3xl font-bold text-blue-600"
  decimals={2}
/>
```

### Pattern 3: Compact Display

```svelte
<SafePriceDisplay 
  tokenAddress={token.address}
  showChange={false}
  showLoading={false}
  className="text-sm"
/>
```

### Pattern 4: Custom Fallback

```svelte
<SafePriceDisplay 
  tokenAddress={token.address}
  fallbackText="Price not available for {token.symbol}"
/>
```

## Troubleshooting

### Issue: Price not showing

**Solution:**
1. Check that tokenAddress is valid
2. Verify price service is initialized
3. Check globalPricesStore has data
4. Look for console errors

### Issue: Loading state stuck

**Solution:**
1. Check globalRefreshingStore value
2. Verify price service is fetching
3. Check network tab for API calls
4. Ensure backend is responding

### Issue: Stale indicator always showing

**Solution:**
1. Check price timestamp
2. Verify price service is refreshing
3. Adjust staleness threshold if needed (currently 5 minutes)

### Issue: Styling not applying

**Solution:**
1. Use className prop for custom classes
2. Check CSS specificity
3. Verify Tailwind classes are available
4. Use :global() for deep styling if needed

## Performance Tips

1. **Reuse instances**: Don't create new SafePriceDisplay for same token
2. **Lazy load**: Use {#if} to conditionally render when needed
3. **Batch updates**: Let Svelte batch reactive updates
4. **Avoid inline functions**: Define handlers outside template

## Best Practices

1. **Always provide tokenAddress**: Even if empty, provide a string
2. **Use meaningful fallbacks**: Customize fallbackText for context
3. **Consider showLoading**: Disable for compact displays
4. **Test all states**: Verify loading, available, and unavailable
5. **Check accessibility**: Use screen reader to verify labels

## Next Steps

After integrating SafePriceDisplay:

1. Remove old price display code
2. Remove manual null checks
3. Remove manual loading states
4. Test thoroughly
5. Update documentation
6. Move to next component

## Support

For questions or issues:
- Check SafePriceDisplay.README.md for detailed docs
- Review SafePriceDisplay.example.js for usage examples
- Test with SafePriceDisplay.test.svelte page
- Check TASK_4_SUMMARY.md for implementation details

---

**Component Location**: `client/src/lib/components/SafePriceDisplay.svelte`
**Documentation**: `client/src/lib/components/SafePriceDisplay.README.md`
**Examples**: `client/src/lib/components/SafePriceDisplay.example.js`
**Test Page**: `client/src/lib/components/SafePriceDisplay.test.svelte`
