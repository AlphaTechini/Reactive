# Implementation Plan

- [x] 1. Create price formatter utility with null-safe operations





  - Create `client/src/lib/utils/priceFormatter.js` with formatPrice, formatChange, isValidPrice, and getSafePrice functions
  - Implement null/undefined checks before all numeric operations
  - Add automatic decimal precision based on price magnitude (8 for < $0.01, 2-4 for >= $0.01)
  - Include currency and percentage formatting with proper signs
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.3_

- [ ]* 1.1 Write property test for null-safe formatting
  - **Property 1: Null-safe numeric operations**
  - **Validates: Requirements 1.2, 4.3**

- [ ]* 1.2 Write property test for decimal formatting consistency
  - **Property 3: Consistent decimal formatting**
  - **Validates: Requirements 2.1**

- [ ]* 1.3 Write property test for change formatting
  - **Property 4: Sign and precision for changes**
  - **Validates: Requirements 2.4**

- [x] 2. Add safe accessor methods to global storage





  - Add `getPriceSafe(tokenAddress)` method that returns price with null safety
  - Add `isPriceAvailable(tokenAddress)` boolean check method
  - Add `getPriceAge(tokenAddress)` method returning age in milliseconds
  - Add `isStale(tokenAddress, maxAge)` method for staleness checking
  - _Requirements: 3.1, 3.3, 4.2_

- [ ]* 2.1 Write property test for missing token handling
  - **Property 5: Missing token data handling**
  - **Validates: Requirements 3.3**

- [x] 3. Fix dashboard price display errors








  - Update `client/src/routes/dashboard/+page.svelte` to use safe price accessors
  - Replace direct `.toFixed()` calls with priceFormatter utility
  - Add null checks using optional chaining (`?.`) and nullish coalescing (`??`)
  - Implement proper loading state handling with conditional rendering
  - Add fallback text for undefined/null prices
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 3.1 Write property test for reactive updates
  - **Property 2: Reactive price updates**
  - **Validates: Requirements 1.4, 4.4**

- [ ]* 3.2 Write property test for numeric validation
  - **Property 6: Numeric validation before calculations**
  - **Validates: Requirements 4.3**

- [x] 4. Create SafePriceDisplay component





  - Create `client/src/lib/components/SafePriceDisplay.svelte` with props for tokenAddress, showChange, showLoading, decimals, fallbackText
  - Implement automatic loading state detection from globalRefreshingStore
  - Add graceful handling of missing price data with customizable fallback messages
  - Include accessibility attributes (aria-label, role)
  - Use priceFormatter utility for all formatting
  - _Requirements: 1.2, 1.3, 2.1, 2.4, 3.2, 3.3_

- [ ]* 4.1 Write unit tests for SafePriceDisplay component
  - Test rendering with no data (shows fallback)
  - Test rendering with loading state (shows loading indicator)
  - Test rendering with valid price data (shows formatted price)
  - Test rendering with invalid token address (shows unavailable message)
  - _Requirements: 1.1, 1.2, 1.3, 3.2, 3.3_

- [x] 5. Update portfolio and price-dependent components





  - Update `client/src/routes/portfolio/[id]/+page.svelte` with safe price access
  - Update `client/src/lib/components/PortfolioOverview.svelte` with safe price access
  - Update `client/src/lib/components/PriceChart.svelte` with safe price access
  - Update `client/src/routes/+page.svelte` with safe price access
  - Replace direct price access with SafePriceDisplay component where appropriate
  - Add null checks and fallbacks for all price-dependent calculations
  - _Requirements: 1.2, 1.4, 3.3, 4.2_

- [x] 6. Implement error recovery and retry mechanisms





  - Add manual refresh button to dashboard with loading state
  - Implement error logging for price fetch failures
  - Add staleness indicators when displaying cached data
  - Ensure app remains functional with stale/cached data
  - _Requirements: 3.1, 3.4_

- [ ]* 6.1 Write integration test for cache and refresh flow
  - Test localStorage cache loading on page refresh
  - Test manual refresh updates prices correctly
  - Test error recovery with cached data fallback
  - _Requirements: 1.5, 3.1, 3.4_

- [x] 7. Add mode switching price refresh





  - Update price service to clear stale data when switching modes
  - Ensure simulation mode uses mock prices
  - Ensure live mode uses backend prices
  - Verify no cross-contamination between modes
  - _Requirements: 3.5_

- [ ]* 7.1 Write integration test for mode switching
  - Test switching from live to simulation mode refreshes prices
  - Test switching from simulation to live mode refreshes prices
  - Test no stale data from previous mode remains
  - _Requirements: 3.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
