# Implementation Plan - Simulation Portfolio Flow

- [x] 1. Enhance simulation store with portfolio management





  - Extend `client/src/lib/stores/simulation.js` with portfolio CRUD operations
  - Add portfolio state structure (portfolios map, balance tracking)
  - Implement derived stores for portfolio calculations
  - Add localStorage persistence for portfolios
  - _Requirements: Portfolio creation, state management_

- [ ]* 1.1 Write property test for balance conservation
  - **Property 1: Balance Conservation**
  - **Validates: Core system invariant**

- [x] 2. Create SimulationTradingService





  - Create `client/src/lib/services/SimulationTradingService.js`
  - Implement `createPortfolio(name, description, depositAmount)` method
  - Implement `calculateTokenAmounts(allocations, totalValue, prices)` method
  - Implement `validateAllocations(allocations)` method
  - Integrate with simulation store and priceService
  - _Requirements: Portfolio creation, token calculations_

- [ ]* 2.1 Write property test for token allocation calculation
  - **Property 2: Token Allocation Calculation Accuracy**
  - **Validates: Token amount calculation correctness**

- [ ]* 2.2 Write property test for percentage sum constraint
  - **Property 3: Percentage Sum Constraint**
  - **Validates: Allocation validation requirement**

- [ ]* 2.3 Write property test for non-negative constraints
  - **Property 10: Non-Negative Constraints**
  - **Validates: Data integrity**

- [x] 3. Build portfolio creation page








  - Update `client/src/routes/simulated/create-portfolio/+page.svelte`
  - Add form with name, description, and deposit amount fields
  - Implement validation (name required, amount > 0, amount <= balance)
  - Show available balance from simulation store
  - Handle form submission and redirect to portfolio page
  - Display error messages for validation failures
  - _Requirements: Portfolio creation UI_

- [x] 4. Create portfolio configuration page





  - Create `client/src/routes/simulated/portfolio/[name]/+page.svelte`
  - Display all 33 tokens from INITIAL_TOKEN_LIST with categories
  - Show current price for each token using priceService
  - Add percentage input for each token
  - Display running total of percentages
  - Show calculated token amounts in real-time
  - _Requirements: Token selection and allocation interface_

- [x] 5. Implement auto-distribute functionality





  - Add "Auto Distribute" button to portfolio configuration page
  - Calculate equal percentages for selected tokens
  - Update percentage inputs automatically
  - Recalculate token amounts
  - _Requirements: Auto-distribute feature_

- [ ]* 5.1 Write property test for auto-distribute equality
  - **Property 4: Auto-Distribute Equality**
  - **Validates: Auto-distribute functionality**

- [x] 6. Implement portfolio execution logic





  - Add "Confirm & Create Portfolio" button
  - Fetch current prices for all selected tokens
  - Calculate final token amounts
  - Execute portfolio creation via SimulationTradingService
  - Update simulation store with new portfolio
  - Deduct deposit from available balance
  - Store initial prices for P/L tracking
  - _Requirements: Portfolio execution, price fetching_

- [ ]* 6.1 Write property test for deposit deduction
  - **Property 7: Deposit Deduction**
  - **Validates: Balance management**

- [ ]* 6.2 Write property test for price snapshot immutability
  - **Property 9: Price Snapshot Immutability**
  - **Validates: Historical price tracking**

- [x] 7. Create portfolio dashboard view





  - Update portfolio page to show dashboard after creation
  - Display portfolio overview (name, description, created date)
  - Show current portfolio value
  - Display all holdings with amounts and current values
  - Show profit/loss (absolute and percentage)
  - Add settings icon linking to configuration
  - _Requirements: Portfolio dashboard display_

- [ ]* 7.1 Write property test for portfolio value consistency
  - **Property 5: Portfolio Value Consistency**
  - **Validates: Portfolio valuation correctness**

- [ ]* 7.2 Write property test for P/L calculation accuracy
  - **Property 6: Profit/Loss Calculation Accuracy**
  - **Validates: P/L tracking correctness**

- [x] 8. Implement portfolio list view





  - Update `client/src/routes/simulated/dashboard/+page.svelte`
  - Display all created portfolios
  - Show portfolio cards with name, value, and P/L
  - Add "Create Portfolio" button
  - Link each portfolio to its detail page
  - Show total balance across all portfolios
  - _Requirements: Portfolio management UI_

- [x] 9. Add price update mechanism





  - Implement periodic price updates for portfolio holdings
  - Update currentPrice for each holding
  - Recalculate portfolio value and P/L
  - Use existing priceService polling mechanism
  - Ensure initial prices remain unchanged
  - _Requirements: Real-time price updates_

- [x] 10. Implement error handling and validation





  - Add try-catch blocks for all async operations
  - Implement price fetch retry logic (3 attempts with backoff)
  - Add validation error messages to UI
  - Handle localStorage corruption gracefully
  - Add loading states for price fetching
  - Display user-friendly error messages
  - _Requirements: Error handling, user feedback_

- [ ]* 10.1 Write property test for localStorage round-trip
  - **Property 8: localStorage Round-Trip**
  - **Validates: Data persistence**

- [x] 11. Add deposit and withdraw functionality





  - Add "Deposit" and "Withdraw" buttons to portfolio page
  - Create modal for deposit with amount input
  - Validate deposit amount against available balance
  - Auto-distribute deposit across tokens based on percentages
  - Update portfolio holdings and balance
  - Create modal for withdraw with amount input
  - Validate withdraw amount against portfolio value
  - _Requirements: Portfolio deposit/withdraw_

- [x] 12. Implement category-based portfolio metrics





  - Calculate percentage by category (memecoins, altcoins, stable, core)
  - Display category breakdowns on portfolio page
  - Update calculations when holdings change
  - Use grid layout for category display
  - _Requirements: Category metrics display_




- [x] 13. Add transaction history tracking



  - Extend simulation store with transactions array
  - Record all portfolio operations (create, buy, sell, deposit, withdraw)
  - Display transaction history on portfolio page
  - Show timestamp, type, and details for each transaction
  - _Requirements: Transaction tracking_

- [x] 14. Polish UI and styling








  - Apply consistent Tailwind styling across all pages
  - Match design patterns from main app
  - Ensure responsive layout for all screen sizes
  - Add smooth transitions and animations
  - Improve form validation feedback
  - Add tooltips for user guidance
  - _Requirements: UI/UX consistency_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
