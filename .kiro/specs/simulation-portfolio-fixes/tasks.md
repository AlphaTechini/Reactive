# Implementation Plan - Simulation Portfolio Fixes

- [x] 1. Fix sidebar portfolio count display



  - Identify the sidebar component (Sidebar.svelte or NavigationSidebar.svelte)
  - Import `portfolioCount` from `$lib/stores/simulation.js`
  - Update template to use `$portfolioCount` reactive subscription
  - Verify count updates when portfolios are created/deleted
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 1.1 Write property test for portfolio count consistency
  - **Property 1: Portfolio Count Consistency**
  - **Validates: Requirements 1.2**

- [x] 2. Fix profit/loss calculation for initial portfolio state





  - Update `createPortfolio` function in simulation store
  - Ensure `currentValue` is set to `depositAmount` at creation
  - Ensure `profitLoss` is set to `{ absolute: 0, percentage: 0 }` at creation
  - Update `updatePortfolioAllocations` to preserve `currentValue` when no holdings
  - Add logic: if holdings are empty, keep `currentValue = initialDeposit`
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 2.1 Write property test for initial P/L is zero
  - **Property 2: Initial P/L is Zero**
  - **Validates: Requirements 2.1**

- [ ]* 2.2 Write property test for P/L calculation accuracy
  - **Property 3: P/L Calculation Accuracy**
  - **Validates: Requirements 2.2, 2.5**

- [ ]* 2.3 Write property test for initial deposit immutability
  - **Property 4: Initial Deposit Immutability**
  - **Validates: Requirements 2.4**

- [x] 3. Add token quantity calculation and storage




  - Update `updatePortfolioAllocations` to calculate token quantities
  - Use formula: `tokenQuantity = (portfolioValue × percentage / 100) / tokenPrice`
  - Store `amount` field in each holding
  - Ensure `amount` persists through price updates
  - Update `buyTokenForPortfolio` to add to existing quantities
  - Update `sellTokenFromPortfolio` to subtract from quantities
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 3.1 Write property test for token quantity conservation
  - **Property 5: Token Quantity Conservation**
  - **Validates: Requirements 4.4**

- [ ]* 3.2 Write property test for token quantity calculation
  - **Property 6: Token Quantity Calculation**
  - **Validates: Requirements 4.1, 4.2**

- [x] 4. Display token quantities in portfolio dashboard





  - Update portfolio dashboard holdings display
  - Show token quantity with 6 decimal places
  - Display format: "{quantity} {symbol}" (e.g., "1000.000000 FLOKI")
  - Show current price per token
  - Show total value (quantity × current price)
  - _Requirements: 4.3_

- [x] 5. Implement per-token settings data structure






  - Add `tokenSettings` object to portfolio settings
  - Create `TokenSettings` model with fields: targetPercentage, sellPercent, buyPercent, stopLossPercent, lastPrice, enabled
  - Update portfolio creation to initialize empty `tokenSettings`
  - Add migration function for existing portfolios
  - Update `updatePortfolioSettings` to handle per-token settings
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 5.1 Write property test for per-token settings independence
  - **Property 7: Per-Token Settings Independence**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [x] 6. Update portfolio settings UI for per-token configuration




  - Modify settings page to show token-specific settings
  - Add input fields for each token: sell%, buy%, stop-loss%
  - Display current token allocation percentage
  - Add enable/disable toggle per token
  - Save per-token settings to store
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Implement per-token price monitoring logic





  - Add `lastActionPrice` field to holdings
  - Create function to check if token meets sell condition
  - Create function to check if token meets buy condition
  - Create function to check if token meets stop-loss condition
  - Compare current price to last action price for each token
  - _Requirements: 3.4, 3.5_

- [x] 8. Implement per-token automated actions





  - Create function to execute sell for specific token
  - Create function to execute buy for specific token
  - Create function to convert token to USDC (stop-loss)
  - Update `lastActionPrice` after each action
  - Log automated actions to transaction history
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 9. Fix auto-balance to use current portfolio value





  - Update auto-balance logic to calculate percentages from `currentValue`
  - Compare each token's current percentage to target percentage
  - Calculate exact amount to buy/sell to restore target
  - Use formula: `targetValue = currentValue × targetPercentage / 100`
  - Execute rebalancing trades
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 9.1 Write property test for auto-balance target accuracy
  - **Property 8: Auto-Balance Target Accuracy**
  - **Validates: Requirements 5.2, 5.3**

- [x] 10. Fix deposit distribution to use current allocations





  - Update `depositToPortfolio` to calculate current percentages
  - Distribute deposit based on current token percentages
  - Calculate token amounts to buy: `(deposit × percentage) / currentPrice`
  - Update token quantities correctly
  - Ensure initial deposit remains unchanged
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 10.1 Write property test for deposit distribution accuracy
  - **Property 9: Deposit Distribution Accuracy**
  - **Validates: Requirements 6.2**

- [x] 11. Add validation and error handling







  - Add division by zero checks in P/L calculations
  - Validate token prices before quantity calculations
  - Handle missing price data gracefully
  - Add error messages for invalid settings
  - Validate percentage ranges (0-100)
  - _Requirements: 2.5, 4.1_

- [x] 12. Test store persistence and reactivity





  - Verify localStorage saves updated portfolio structure
  - Test portfolio count reactivity in sidebar
  - Test P/L updates when prices change
  - Test token quantity persistence
  - Verify per-token settings persist
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 12.1 Write property test for store persistence round-trip
  - **Property 10: Store Persistence Round-Trip**
  - **Validates: Requirements 7.1, 7.2**

- [x] 13. Update portfolio dashboard to show per-token metrics





  - Display per-token P/L (current value vs initial value)
  - Show per-token percentage change
  - Display token-specific settings status
  - Show last action price for each token
  - Add visual indicators for automated actions
  - _Requirements: 4.3, 3.1_

- [x] 14. Add migration for existing portfolios





  - Create migration function to add `tokenSettings` to old portfolios
  - Migrate old global settings to per-token settings
  - Set default values for missing fields
  - Run migration on store initialization
  - Log migration results
  - _Requirements: 7.1, 7.2_

- [x] 15. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
