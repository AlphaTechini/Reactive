# Simulation Portfolio Flow - Design Document

## Overview

This design implements a complete portfolio creation and management flow for simulation mode. The system allows users to create portfolios with custom token allocations, execute simulated trades, and track performance without blockchain transactions. All operations use pure JavaScript calculations with real-time price data.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Svelte Routes  │
│  (UI Layer)     │
└────────┬────────┘
         │
┌────────▼────────────────────────────────┐
│  SimulationTradingService               │
│  - Portfolio CRUD                       │
│  - Token allocation calculations        │
│  - Trade execution                      │
└────────┬────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│  Simulation Store (simulation.js)       │
│  - Portfolio state management           │
│  - Balance tracking                     │
│  - Transaction history                  │
└────────┬────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│  Price Service (priceService.js)        │
│  - Real-time price fetching             │
│  - Price caching                        │
└─────────────────────────────────────────┘
```

### Data Flow

1. User creates portfolio → Route captures input
2. Route calls SimulationTradingService
3. Service fetches current prices from PriceService
4. Service calculates token amounts
5. Service updates Simulation Store
6. Store persists to localStorage
7. UI reactively updates from store

## Components and Interfaces

### 1. Route Components

#### `/simulated/create-portfolio/+page.svelte`
- Form for portfolio creation
- Fields: name, description, deposit amount
- Validation: name required, amount > 0 and <= available balance
- Redirects to portfolio page on success

#### `/simulated/portfolio/[name]/+page.svelte`
- Token selection and allocation interface
- Real-time price display
- Percentage input for each token
- Auto-distribute functionality
- Confirmation and execution

### 2. SimulationTradingService

```javascript
class SimulationTradingService {
  // Portfolio Management
  createPortfolio(name, description, depositAmount)
  getPortfolio(name)
  updatePortfolioAllocations(portfolioName, allocations)
  
  // Token Operations
  calculateTokenAmounts(allocations, totalValue, prices)
  executePortfolioCreation(portfolioName, allocations)
  
  // Utilities
  validateAllocations(allocations)
  fetchCurrentPrices(tokenSymbols)
}
```

### 3. Simulation Store

```javascript
{
  balance: 10000, // Starting balance
  portfolios: {
    [portfolioName]: {
      name: string,
      description: string,
      createdAt: timestamp,
      initialDeposit: number,
      currentValue: number,
      holdings: {
        [symbol]: {
          amount: number,
          initialPrice: number,
          currentPrice: number,
          percentage: number
        }
      }
    }
  },
  transactions: []
}
```

### 4. Token List Configuration

```javascript
const INITIAL_TOKEN_LIST = {
  core: ['BTC', 'ETH'],
  stable: ['USDC'],
  altcoins: [
    'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX', 'LINK',
    'UNI', 'ATOM', 'LTC', 'XLM', 'ALGO', 'VET', 'ICP', 'FIL',
    'HBAR', 'NEAR', 'APT', 'ARB'
  ],
  memecoins: [
    'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME',
    'WOJAK', 'TURBO', 'SPONGE'
  ]
}
```

## Data Models

### Portfolio Model

```javascript
{
  name: string,              // Unique identifier
  description: string,       // Optional description
  createdAt: number,         // Unix timestamp
  initialDeposit: number,    // USD value at creation
  currentValue: number,      // Current USD value
  holdings: Map<string, Holding>,
  profitLoss: {
    absolute: number,        // USD difference
    percentage: number       // % change
  }
}
```

### Holding Model

```javascript
{
  symbol: string,            // Token symbol (e.g., 'BTC')
  amount: number,            // Token quantity
  initialPrice: number,      // Price at purchase (USD)
  currentPrice: number,      // Latest price (USD)
  percentage: number,        // % of portfolio (0-100)
  value: number,             // amount * currentPrice
  profitLoss: {
    absolute: number,
    percentage: number
  }
}
```

### Transaction Model

```javascript
{
  id: string,
  portfolioName: string,
  type: 'create' | 'buy' | 'sell' | 'deposit' | 'withdraw',
  timestamp: number,
  details: {
    symbol?: string,
    amount?: number,
    price?: number,
    value: number
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Balance Conservation
*For any* sequence of portfolio operations (create, deposit, withdraw), the sum of all portfolio values plus the remaining balance should always equal the initial system balance (10000 USD).
**Validates: Core system invariant**

### Property 2: Token Allocation Calculation Accuracy
*For any* set of token allocations with percentages and prices, the sum of (calculated_token_amount × token_price) should equal the allocated portfolio value within rounding tolerance.
**Validates: Token amount calculation correctness**

### Property 3: Percentage Sum Constraint
*For any* valid portfolio configuration, the sum of all token allocation percentages should equal 100%.
**Validates: Allocation validation requirement**

### Property 4: Auto-Distribute Equality
*For any* set of N selected tokens, applying auto-distribute should assign each token exactly (100 / N)% of the portfolio.
**Validates: Auto-distribute functionality**

### Property 5: Portfolio Value Consistency
*For any* portfolio at any time, the calculated current value should equal the sum of (holding_amount × current_price) for all holdings.
**Validates: Portfolio valuation correctness**

### Property 6: Profit/Loss Calculation Accuracy
*For any* portfolio, the profit/loss should equal (current_value - initial_deposit), and the percentage should equal ((current_value - initial_deposit) / initial_deposit × 100).
**Validates: P/L tracking correctness**

### Property 7: Deposit Deduction
*For any* portfolio creation with deposit amount D, the user's available balance should decrease by exactly D.
**Validates: Balance management**

### Property 8: localStorage Round-Trip
*For any* portfolio created and saved, retrieving it from localStorage should return an equivalent portfolio with all properties intact.
**Validates: Data persistence**

### Property 9: Price Snapshot Immutability
*For any* portfolio, the initial prices stored at creation should never change, regardless of current market prices.
**Validates: Historical price tracking**

### Property 10: Non-Negative Constraints
*For any* portfolio operation, balances, amounts, and values should never become negative.
**Validates: Data integrity**

## Error Handling

### Validation Errors

1. **Portfolio Creation**
   - Empty name → "Portfolio name is required"
   - Duplicate name → "Portfolio with this name already exists"
   - Deposit amount > available balance → "Insufficient balance"
   - Deposit amount ≤ 0 → "Deposit amount must be positive"

2. **Token Allocation**
   - Total percentage ≠ 100% → "Total allocation must equal 100%"
   - Negative percentage → "Percentage cannot be negative"
   - No tokens selected → "Select at least one token"

3. **Price Fetching**
   - API failure → Retry with exponential backoff (3 attempts)
   - Missing price data → "Unable to fetch prices, please try again"
   - Stale prices (>5 min) → Show warning, allow user to refresh

### Recovery Strategies

1. **localStorage Corruption**
   - Detect invalid data structure
   - Attempt to recover valid portfolios
   - Reset to initial state if unrecoverable
   - Notify user of data loss

2. **Calculation Errors**
   - Validate all numeric inputs
   - Use BigNumber or Decimal.js for precision
   - Clamp values to valid ranges
   - Log errors for debugging

3. **State Inconsistency**
   - Implement state validation on load
   - Recalculate derived values
   - Provide manual refresh option

## Testing Strategy

### Unit Testing

We'll use Vitest for unit testing with the following focus areas:

1. **Calculation Functions**
   - Token amount calculations
   - Percentage distributions
   - P/L calculations
   - Portfolio value aggregations

2. **Validation Logic**
   - Input validation
   - Allocation constraints
   - Balance checks

3. **State Management**
   - Store mutations
   - Derived state calculations
   - localStorage operations

### Property-Based Testing

We'll use fast-check for property-based testing to verify universal properties:

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with this format:
`// Feature: simulation-portfolio-flow, Property {number}: {property_text}`

**Property Test Coverage**:

1. **Property 1: Balance Conservation**
   - Generate random sequences of portfolio operations
   - Verify total value conservation

2. **Property 2: Token Allocation Calculation**
   - Generate random allocations and prices
   - Verify calculation accuracy

3. **Property 3: Percentage Sum**
   - Generate random percentage distributions
   - Verify they sum to 100%

4. **Property 4: Auto-Distribute**
   - Generate random token selections
   - Verify equal distribution

5. **Property 5: Portfolio Value**
   - Generate random holdings and prices
   - Verify value calculation

6. **Property 6: P/L Calculation**
   - Generate random price changes
   - Verify P/L accuracy

7. **Property 7: Deposit Deduction**
   - Generate random deposit amounts
   - Verify balance changes

8. **Property 8: localStorage Round-Trip**
   - Generate random portfolios
   - Verify persistence integrity

9. **Property 9: Price Immutability**
   - Generate portfolios with price updates
   - Verify initial prices unchanged

10. **Property 10: Non-Negative Constraints**
    - Generate edge case operations
    - Verify no negative values

### Integration Testing

1. **Complete Portfolio Flow**
   - Create portfolio → Allocate tokens → Verify state
   - Test with real price service
   - Verify UI updates correctly

2. **Multi-Portfolio Management**
   - Create multiple portfolios
   - Verify balance tracking
   - Test portfolio switching

3. **Price Update Flow**
   - Create portfolio with initial prices
   - Simulate price updates
   - Verify P/L calculations

## Implementation Notes

### Performance Considerations

1. **Price Caching**
   - Cache prices for 1 minute
   - Batch fetch all required prices
   - Use existing PriceService infrastructure

2. **State Updates**
   - Debounce percentage input changes
   - Batch localStorage writes
   - Use Svelte's reactive statements efficiently

3. **Calculation Optimization**
   - Memoize expensive calculations
   - Use incremental updates where possible
   - Avoid unnecessary recalculations

### UI/UX Guidelines

1. **Responsive Feedback**
   - Show loading states during price fetches
   - Display calculation results in real-time
   - Provide clear error messages

2. **Visual Consistency**
   - Use existing Tailwind classes
   - Match color scheme from main app
   - Consistent spacing and typography

3. **User Guidance**
   - Show available balance prominently
   - Display percentage total as user types
   - Highlight validation errors clearly

### Dependencies

1. **Existing Services**
   - `priceService.js` - Price fetching
   - `simulation.js` store - State management
   - `priceFormatter.js` - Display formatting

2. **External Libraries**
   - None required (use native JavaScript)
   - Consider decimal.js if precision issues arise

3. **Token Configuration**
   - Use INITIAL_TOKEN_LIST from existing config
   - Ensure consistency with live mode token list

## Security Considerations

Since this is simulation mode with no real funds:

1. **Input Validation**
   - Sanitize all user inputs
   - Validate numeric ranges
   - Prevent injection attacks in portfolio names

2. **Data Isolation**
   - Separate simulation data from live data
   - Clear namespace in localStorage
   - Prevent cross-contamination

3. **Rate Limiting**
   - Respect price API rate limits
   - Implement client-side throttling
   - Cache aggressively

## Future Enhancements

1. **Advanced Features**
   - Portfolio templates
   - Historical performance charts
   - Rebalancing suggestions
   - Export portfolio data

2. **Optimization**
   - Web Worker for calculations
   - IndexedDB for larger datasets
   - Offline support

3. **Analytics**
   - Track user behavior
   - Portfolio performance metrics
   - Popular allocation strategies
