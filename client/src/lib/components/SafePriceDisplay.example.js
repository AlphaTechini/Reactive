/**
 * SafePriceDisplay Component Usage Examples
 * 
 * This file demonstrates how to use the SafePriceDisplay component
 * in various scenarios throughout the application.
 */

// Example 1: Basic price display
// <SafePriceDisplay tokenAddress={token.address} />

// Example 2: Price without change indicator
// <SafePriceDisplay 
//   tokenAddress={token.address} 
//   showChange={false} 
// />

// Example 3: Custom fallback text
// <SafePriceDisplay 
//   tokenAddress={token.address} 
//   fallbackText="No price data" 
// />

// Example 4: Fixed decimal places
// <SafePriceDisplay 
//   tokenAddress={token.address} 
//   decimals={4} 
// />

// Example 5: Hide loading indicator
// <SafePriceDisplay 
//   tokenAddress={token.address} 
//   showLoading={false} 
// />

// Example 6: Custom styling
// <SafePriceDisplay 
//   tokenAddress={token.address} 
//   className="text-lg font-bold" 
// />

// Example 7: Complete configuration
// <SafePriceDisplay 
//   tokenAddress={selectedToken?.address}
//   showChange={true}
//   showLoading={true}
//   decimals="auto"
//   fallbackText="Price unavailable"
//   className="my-custom-class"
// />

/**
 * Integration Example: Replacing manual price display
 * 
 * BEFORE:
 * ```svelte
 * <script>
 *   import { globalPricesStore } from '$lib/stores/globalStorage.js';
 *   import { formatPrice } from '$lib/utils/priceFormatter.js';
 *   
 *   $: tokenPrice = $globalPricesStore[token.address];
 *   $: displayPrice = tokenPrice?.price ? formatPrice(tokenPrice.price) : 'N/A';
 * </script>
 * 
 * <span>{displayPrice}</span>
 * ```
 * 
 * AFTER:
 * ```svelte
 * <script>
 *   import SafePriceDisplay from '$lib/components/SafePriceDisplay.svelte';
 * </script>
 * 
 * <SafePriceDisplay tokenAddress={token.address} />
 * ```
 */

/**
 * Benefits of using SafePriceDisplay:
 * 
 * 1. Automatic null safety - no more TypeError exceptions
 * 2. Built-in loading states - shows spinner while fetching
 * 3. Stale data indicators - warns when price is outdated
 * 4. Accessibility - proper ARIA labels and roles
 * 5. Consistent formatting - uses priceFormatter utility
 * 6. Customizable - props for all common use cases
 * 7. Reactive - automatically updates when prices change
 */

export const USAGE_EXAMPLES = {
  basic: '<SafePriceDisplay tokenAddress={token.address} />',
  noChange: '<SafePriceDisplay tokenAddress={token.address} showChange={false} />',
  customFallback: '<SafePriceDisplay tokenAddress={token.address} fallbackText="No price data" />',
  fixedDecimals: '<SafePriceDisplay tokenAddress={token.address} decimals={4} />',
  noLoading: '<SafePriceDisplay tokenAddress={token.address} showLoading={false} />',
  customStyle: '<SafePriceDisplay tokenAddress={token.address} className="text-lg font-bold" />',
};
