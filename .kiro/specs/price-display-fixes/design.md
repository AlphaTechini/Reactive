# Design Document

## Overview

This design addresses critical frontend errors in the Reactive Portfolio Manager where undefined price data causes runtime exceptions when components attempt to call `.toFixed()` and other numeric operations. The solution implements defensive programming patterns, centralized formatting utilities, and proper null-safety throughout the price display pipeline.

The core issue stems from the asynchronous nature of price data loading - components render before the price service completes initialization, leading to attempts to format undefined values. This design ensures all price-dependent UI elements handle the full lifecycle of price data: undefined → loading → loaded → stale.

## Architecture

### Component Hierarchy

```
Dashboard/Portfolio Pages
    ↓
Price Display Components (PriceChart, PortfolioOverview, etc.)
    ↓
Global Storage Stores (globalPricesStore, globalRefreshingStore)
    ↓
Price Service (fetches from backend)
    ↓
Backend API (cached price data)
```

### Data Flow

1. **Initialization Phase**: Components mount with undefined price data
2. **Loading Phase**: Price service fetches from backend, stores show loading state
3. **Loaded Phase**: Price data populates stores, components reactively update
4. **Stale Phase**: Cached data shown with staleness indicators until refresh

### Safe Rendering Strategy

All price-dependent displays will follow this pattern:

```javascript
// Safe price access with fallbacks
$: tokenPrice = selectedToken && $globalPricesStore[selectedToken.address];
$: currentPrice = tokenPrice?.price ?? null;
$: displayPrice = currentPrice !== null ? formatPrice(currentPrice) : 'Loading...';
```

## Components and Interfaces

### 1. Price Formatting Utility

**Location**: `client/src/lib/utils/priceFormatter.js`

**Purpose**: Centralized, null-safe price formatting for consistent display across all components

**Interface**:
```javascript
export const priceFormatter = {
  // Format price with appropriate decimals
  formatPrice(price, options = {})
  
  // Format percentage change with sign
  formatChange(change, options = {})
  
  // Check if value is valid for numeric operations
  isValidPrice(value)
  
  // Get safe numeric value with fallback
  getSafePrice(value, fallback = 0)
}
```

**Key Features**:
- Null/undefined safety checks before all operations
- Automatic decimal precision based on price magnitude
- Consistent currency and percentage formatting
- Fallback values for invalid inputs

### 2. Safe Price Display Component

**Location**: `client/src/lib/components/SafePriceDisplay.svelte`

**Purpose**: Reusable component that handles all price display edge cases

**Props**:
```javascript
{
  tokenAddress: string,
  showChange: boolean = true,
  showLoading: boolean = true,
  decimals: number = 'auto',
  fallbackText: string = 'Price unavailable'
}
```

**Features**:
- Automatic loading state detection
- Graceful handling of missing data
- Customizable fallback messages
- Accessibility attributes

### 3. Enhanced Dashboard Component

**Location**: `client/src/routes/dashboard/+page.svelte`

**Changes**:
- Replace direct price access with safe accessors
- Use SafePriceDisplay component for all price displays
- Add proper loading states
- Implement error boundaries for price-dependent sections

### 4. Global Storage Enhancements

**Location**: `client/src/lib/stores/globalStorage.js`

**Additions**:
- `getPriceSafe(tokenAddress)` - Returns price with null safety
- `isPriceAvailable(tokenAddress)` - Boolean check for data availability
- `getPriceAge(tokenAddress)` - Returns age of price data in milliseconds
- `isStale(tokenAddress, maxAge)` - Checks if price data is stale

## Data Models

### Price Data Structure

```javascript
{
  symbol: string,           // Token symbol (e.g., "ETH")
  address: string,          // Contract address
  price: number | null,     // Current price in USD
  current: number | null,   // Alias for price (backward compat)
  change: number | null,    // 24h change percentage
  change24h: number | null, // Alias for change (backward compat)
  timestamp: number,        // Unix timestamp of price update
  mode: string,             // 'live' or 'simulation'
  previousPrice: number | null, // Previous price for change calculation
  source: string            // 'backend', 'cache', 'ipfs', 'mock'
}
```

### Display State Model

```javascript
{
  isLoading: boolean,       // Price service is fetching
  hasData: boolean,         // Price data exists
  isStale: boolean,         // Data is older than threshold
  error: string | null,     // Error message if fetch failed
  lastUpdated: string | null // ISO timestamp of last update
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Null-safe numeric operations

*For any* price value (including undefined, null, NaN, or numeric), when passed to a formatting function, the function should never throw a TypeError and should return a valid string.

**Validates: Requirements 1.2, 4.3**

### Property 2: Reactive price updates

*For any* token address, when price data is added to the global store for that token, all subscribed components should receive the update and display the new price without errors.

**Validates: Requirements 1.4, 4.4**

### Property 3: Consistent decimal formatting

*For any* numeric price value, the formatting function should return a string with decimal places appropriate to the price magnitude (8 decimals for < $0.01, 2-4 decimals for >= $0.01).

**Validates: Requirements 2.1**

### Property 4: Sign and precision for changes

*For any* numeric change value (positive, negative, or zero), the formatting function should return a string with a sign (+/-) and exactly 2 decimal places.

**Validates: Requirements 2.4**

### Property 5: Missing token data handling

*For any* token address that does not exist in the price store, components requesting that token's price should display an unavailable message without throwing errors.

**Validates: Requirements 3.3**

### Property 6: Numeric validation before calculations

*For any* value used in a price calculation (addition, multiplication, percentage, etc.), the system should validate it is a finite number before performing the operation.

**Validates: Requirements 4.3**

## Error Handling

### Error Categories

1. **Data Access Errors**: Attempting to access properties on undefined/null
   - **Solution**: Optional chaining (`?.`) and nullish coalescing (`??`)
   - **Fallback**: Display placeholder text

2. **Formatting Errors**: Calling numeric methods on non-numeric values
   - **Solution**: Type validation before operations
   - **Fallback**: Return safe default string

3. **Network Errors**: Backend price service unavailable
   - **Solution**: Use cached data with staleness indicator
   - **Fallback**: Display "Price unavailable" with retry option

4. **Store Subscription Errors**: Component subscribes before store initialization
   - **Solution**: Handle undefined initial state in reactive statements
   - **Fallback**: Show loading state until data available

### Error Recovery

- **Automatic Retry**: Price service retries failed fetches with exponential backoff
- **Manual Retry**: User can trigger refresh via UI button
- **Graceful Degradation**: App remains functional with stale/cached data
- **Error Logging**: All errors logged to console for debugging

## Testing Strategy

### Unit Testing

We will write unit tests for:

1. **Price Formatter Utility**
   - Test with valid numeric inputs
   - Test with null/undefined inputs
   - Test with edge cases (0, very small, very large numbers)
   - Test with non-numeric inputs (strings, objects, arrays)

2. **Safe Price Accessors**
   - Test getPriceSafe with existing and non-existing tokens
   - Test isPriceAvailable with various store states
   - Test getPriceAge with different timestamps

3. **Component Mounting**
   - Test dashboard mounts without errors when prices undefined
   - Test SafePriceDisplay renders correctly with no data
   - Test loading states display appropriately

### Property-Based Testing

We will use **fast-check** (JavaScript property-based testing library) to verify:

1. **Property 1**: Null-safe numeric operations
   - Generate arbitrary values (including null, undefined, NaN, numbers, strings)
   - Verify formatPrice never throws and always returns a string

2. **Property 2**: Reactive price updates
   - Generate random price data
   - Update store and verify all subscribers receive updates

3. **Property 3**: Consistent decimal formatting
   - Generate random price values across magnitude ranges
   - Verify correct decimal places in formatted output

4. **Property 4**: Sign and precision for changes
   - Generate random change percentages (positive, negative, zero)
   - Verify sign presence and 2 decimal places

5. **Property 5**: Missing token data handling
   - Generate random token addresses (some in store, some not)
   - Verify no errors and appropriate messages for missing tokens

6. **Property 6**: Numeric validation before calculations
   - Generate random values for calculations
   - Verify validation prevents operations on non-numeric values

### Integration Testing

1. **Full Price Loading Flow**
   - Start with empty stores
   - Initialize price service
   - Verify dashboard renders at each stage without errors
   - Verify final state shows correct prices

2. **Mode Switching**
   - Switch between live and simulation modes
   - Verify prices refresh appropriately
   - Verify no stale data from previous mode

3. **Cache and Refresh**
   - Populate localStorage with cached prices
   - Reload page
   - Verify cached prices load first
   - Verify fresh prices replace cached when available

### Manual Testing Checklist

- [ ] Dashboard loads without console errors
- [ ] Prices display correctly when available
- [ ] Loading indicators show during fetch
- [ ] "Price unavailable" shows for missing tokens
- [ ] Refresh button works without page reload
- [ ] Mode switching updates prices correctly
- [ ] Cached prices load on page refresh
- [ ] Small prices show 8 decimals
- [ ] Normal prices show 2-4 decimals
- [ ] Percentage changes show sign and 2 decimals
- [ ] Zero prices display as "$0.00"
- [ ] Stale data shows staleness indicator

## Implementation Notes

### Priority Order

1. **Critical (P0)**: Fix immediate errors preventing app usage
   - Add null checks to dashboard price displays
   - Implement safe price accessor functions
   - Add loading state handling

2. **High (P1)**: Improve user experience
   - Create centralized price formatter utility
   - Build SafePriceDisplay component
   - Add proper error messages

3. **Medium (P2)**: Enhance robustness
   - Implement comprehensive error handling
   - Add staleness indicators
   - Create property-based tests

4. **Low (P3)**: Polish and optimization
   - Add accessibility attributes
   - Optimize re-render performance
   - Add detailed logging

### Backward Compatibility

The design maintains backward compatibility by:
- Keeping existing store structure (adding, not changing)
- Supporting both `price` and `current` fields
- Supporting both `change` and `change24h` fields
- Providing fallback values for missing data

### Performance Considerations

- Formatting functions are pure and can be memoized
- Store subscriptions use Svelte's built-in reactivity (efficient)
- LocalStorage operations are async to avoid blocking
- Chart data stored separately to reduce main data payload

## Migration Path

1. **Phase 1**: Add utility functions and safe accessors (no breaking changes)
2. **Phase 2**: Update dashboard to use safe patterns (fixes immediate errors)
3. **Phase 3**: Create SafePriceDisplay component
4. **Phase 4**: Migrate other components to use SafePriceDisplay
5. **Phase 5**: Add comprehensive tests
6. **Phase 6**: Remove old unsafe patterns

Each phase can be deployed independently without breaking existing functionality.
