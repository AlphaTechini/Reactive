# Design Document - Simulation Portfolio Fixes

## Overview

This design addresses four critical bugs in the simulation portfolio system: incorrect sidebar portfolio counting, initial deposit being counted as a loss, lack of per-token settings application, and missing token quantity tracking. The fixes ensure accurate portfolio display, correct profit/loss calculations, proper per-token automation, and transparent token quantity information.

## Architecture

### Current Issues

1. **Sidebar Portfolio Count**: The sidebar component doesn't properly subscribe to the `portfolioCount` derived store
2. **P/L Calculation**: The initial deposit is being subtracted from itself, resulting in -100% loss at creation
3. **Settings Application**: Portfolio settings are global instead of per-token, preventing individual token automation
4. **Token Quantity Display**: Token quantities aren't calculated or displayed, only USD values are shown

### Proposed Solutions

```
┌─────────────────────────────────────────┐
│         Sidebar Component               │
│  - Subscribe to portfolioCount store    │
│  - Display reactive count               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Simulation Store (Fixed)           │
│  - portfolioCount derived store         │
│  - Correct P/L calculation              │
│  - Per-token settings structure         │
│  - Token quantity tracking              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Portfolio Dashboard (Enhanced)       │
│  - Display token quantities             │
│  - Show per-token settings              │
│  - Accurate P/L display                 │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Sidebar Component Fix

**File**: `client/src/lib/components/Sidebar.svelte` or `NavigationSidebar.svelte`

**Current Issue**: Not subscribing to `portfolioCount` store

**Solution**:
```javascript
import { portfolioCount } from '$lib/stores/simulation.js';

// In template:
<div>Portfolios ({$portfolioCount})</div>
```

### 2. Simulation Store P/L Fix

**File**: `client/src/lib/stores/simulation.js`

**Current Issue**: P/L calculation treats initial deposit as a loss

**Current Code** (problematic):
```javascript
// When portfolio is created
currentValue: depositAmount,  // Correct
profitLoss: {
  absolute: 0,  // Should be 0 at creation
  percentage: 0  // Should be 0 at creation
}

// But somewhere it's being calculated as:
// profitLoss = currentValue - initialDeposit
// When currentValue === initialDeposit, this should be 0
```

**Root Cause**: The issue is likely in how `currentValue` is initialized or updated. When a portfolio is first created with no holdings, `currentValue` might be set to 0 instead of the deposit amount.

**Solution**:
```javascript
// In createPortfolio function
const portfolio = {
  name,
  description: description || '',
  createdAt: Date.now(),
  initialDeposit: depositAmount,
  currentValue: depositAmount,  // Start with deposit amount
  holdings: {},  // Empty until configured
  settings: {
    allocations: {},
    tokenSettings: {},  // NEW: Per-token settings
    autoBalanceEnabled: false
  },
  profitLoss: {
    absolute: 0,  // Zero at creation
    percentage: 0  // Zero at creation
  }
};

// In updatePortfolioAllocations - when holdings are added
// Calculate total value from holdings
let totalValue = 0;
for (const [symbol, holding] of Object.entries(allocations)) {
  totalValue += holding.amount * holding.currentPrice;
}

// IMPORTANT: Only update currentValue if we have holdings
if (Object.keys(allocations).length > 0) {
  portfolio.currentValue = totalValue;
} else {
  // Keep the initial deposit as current value
  portfolio.currentValue = portfolio.initialDeposit;
}

// Calculate P/L correctly
const profitLoss = portfolio.currentValue - portfolio.initialDeposit;
portfolio.profitLoss = {
  absolute: profitLoss,
  percentage: portfolio.initialDeposit > 0 
    ? (profitLoss / portfolio.initialDeposit) * 100 
    : 0
};
```

### 3. Per-Token Settings Structure

**File**: `client/src/lib/stores/simulation.js`

**New Data Model**:
```javascript
{
  portfolios: {
    [portfolioName]: {
      // ... existing fields
      settings: {
        // Global settings
        autoBalanceEnabled: boolean,
        
        // Per-token settings
        tokenSettings: {
          [symbol]: {
            targetPercentage: number,  // Target allocation %
            sellPercent: number,       // Sell when price increases by this %
            buyPercent: number,        // Buy when price decreases by this %
            stopLossPercent: number,   // Convert to USDC when price drops by this %
            lastPrice: number,         // Last price when action was taken
            enabled: boolean           // Whether automation is enabled for this token
          }
        }
      },
      holdings: {
        [symbol]: {
          amount: number,           // Token quantity
          initialPrice: number,     // Price at purchase
          currentPrice: number,     // Latest price
          percentage: number,       // Current % of portfolio
          lastActionPrice: number   // Price at last buy/sell/stop-loss
        }
      }
    }
  }
}
```

### 4. Token Quantity Calculation

**Formula**:
```javascript
// When allocating tokens during portfolio creation
const tokenQuantity = (portfolioValue × allocationPercentage / 100) / tokenPrice;

// Example:
// Portfolio value: $4000
// BTC allocation: 50%
// BTC price: $40,000
// Token quantity = ($4000 × 50%) / $40,000 = $2000 / $40,000 = 0.05 BTC
```

**Display Format**:
```javascript
// In portfolio dashboard
{holding.amount.toFixed(6)} {symbol}
// Example: "0.050000 BTC"
// Example: "1000.000000 FLOKI"
```

## Data Models

### Enhanced Portfolio Model

```javascript
{
  name: string,
  description: string,
  createdAt: number,
  initialDeposit: number,        // NEVER changes - baseline for P/L
  currentValue: number,          // Recalculated from holdings
  holdings: {
    [symbol]: {
      amount: number,            // Token quantity (e.g., 1000 FLOKI)
      initialPrice: number,      // Price when first purchased
      currentPrice: number,      // Latest market price
      percentage: number,        // Current % of portfolio value
      lastActionPrice: number    // Price at last automated action
    }
  },
  settings: {
    autoBalanceEnabled: boolean,
    tokenSettings: {
      [symbol]: {
        targetPercentage: number,
        sellPercent: number,
        buyPercent: number,
        stopLossPercent: number,
        lastPrice: number,
        enabled: boolean
      }
    }
  },
  profitLoss: {
    absolute: number,            // currentValue - initialDeposit
    percentage: number           // (absolute / initialDeposit) × 100
  }
}
```

### Token Settings Model

```javascript
{
  symbol: string,              // e.g., "FLOKI"
  targetPercentage: number,    // e.g., 10 (means 10% of portfolio)
  sellPercent: number,         // e.g., 5 (sell when price increases 5%)
  buyPercent: number,          // e.g., 5 (buy when price decreases 5%)
  stopLossPercent: number,     // e.g., 15 (convert to USDC when price drops 15%)
  lastPrice: number,           // Last price when we checked/acted
  enabled: boolean             // Whether automation is active
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Portfolio Count Consistency
*For any* simulation state, the portfolio count displayed in the sidebar should equal the number of portfolios in the portfolios object.
**Validates: Requirements 1.2**

### Property 2: Initial P/L is Zero
*For any* newly created portfolio with no price changes, the profit/loss should be exactly $0.00 (0%).
**Validates: Requirements 2.1**

### Property 3: P/L Calculation Accuracy
*For any* portfolio at any time, the profit/loss should equal (current value - initial deposit), and the percentage should equal ((current value - initial deposit) / initial deposit × 100).
**Validates: Requirements 2.2, 2.5**

### Property 4: Initial Deposit Immutability
*For any* portfolio, the initial deposit value should never change after creation, regardless of deposits, withdrawals, or price changes.
**Validates: Requirements 2.4**

### Property 5: Token Quantity Conservation
*For any* token holding, when prices change, the token quantity should remain constant while the current value recalculates.
**Validates: Requirements 4.4**

### Property 6: Token Quantity Calculation
*For any* token allocation, the token quantity should equal (allocated USD amount) / (token price at purchase).
**Validates: Requirements 4.1, 4.2**

### Property 7: Per-Token Settings Independence
*For any* two different tokens in a portfolio, a price change in one token should only trigger actions for that token, not the other.
**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

### Property 8: Auto-Balance Target Accuracy
*For any* token with auto-balance enabled, after rebalancing, the token's percentage should equal its target percentage within rounding tolerance.
**Validates: Requirements 5.2, 5.3**

### Property 9: Deposit Distribution Accuracy
*For any* deposit, the sum of (token percentage × deposit amount) across all tokens should equal the deposit amount.
**Validates: Requirements 6.2**

### Property 10: Store Persistence Round-Trip
*For any* portfolio state, saving to localStorage and reloading should produce an equivalent state with all properties intact.
**Validates: Requirements 7.1, 7.2**

## Error Handling

### P/L Calculation Errors

1. **Division by Zero**
   - If `initialDeposit` is 0, set P/L percentage to 0
   - Log warning for investigation

2. **Negative Current Value**
   - Should not occur in simulation mode
   - If detected, log error and reset portfolio

3. **NaN or Infinity**
   - Validate all numeric calculations
   - Default to 0 if invalid

### Token Quantity Errors

1. **Missing Price Data**
   - Cannot calculate quantity without price
   - Show error: "Price unavailable for {symbol}"
   - Prevent allocation until price is available

2. **Zero or Negative Price**
   - Invalid price data
   - Show error: "Invalid price for {symbol}"
   - Retry price fetch

### Settings Application Errors

1. **Missing Token Settings**
   - If token has no settings, use portfolio defaults
   - Create settings entry on first access

2. **Invalid Percentage Values**
   - Clamp to valid ranges (0-100)
   - Show warning to user

## Testing Strategy

### Unit Testing

We'll use Vitest for unit testing:

1. **P/L Calculation Tests**
   - Test initial portfolio creation (P/L should be 0)
   - Test after price increase (P/L should be positive)
   - Test after price decrease (P/L should be negative)
   - Test with deposits (initial deposit should not change)

2. **Token Quantity Tests**
   - Test quantity calculation with various prices
   - Test quantity persistence through price changes
   - Test quantity updates on buy/sell

3. **Per-Token Settings Tests**
   - Test settings isolation between tokens
   - Test trigger conditions for each token
   - Test auto-balance per token

4. **Store Subscription Tests**
   - Test portfolioCount derived store
   - Test sidebar subscription
   - Test reactivity

### Property-Based Testing

We'll use fast-check for property-based testing:

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with this format:
`// Feature: simulation-portfolio-fixes, Property {number}: {property_text}`

**Property Test Coverage**:

1. **Property 1: Portfolio Count Consistency**
   - Generate random portfolio operations
   - Verify count matches object size

2. **Property 2: Initial P/L is Zero**
   - Generate random portfolio creations
   - Verify P/L is 0 before price changes

3. **Property 3: P/L Calculation Accuracy**
   - Generate random price changes
   - Verify P/L formula

4. **Property 4: Initial Deposit Immutability**
   - Generate random operations
   - Verify initial deposit never changes

5. **Property 5: Token Quantity Conservation**
   - Generate random price updates
   - Verify quantities unchanged

6. **Property 6: Token Quantity Calculation**
   - Generate random allocations and prices
   - Verify quantity formula

7. **Property 7: Per-Token Settings Independence**
   - Generate multi-token portfolios
   - Verify isolated triggers

8. **Property 8: Auto-Balance Target Accuracy**
   - Generate random rebalancing scenarios
   - Verify target percentages achieved

9. **Property 9: Deposit Distribution Accuracy**
   - Generate random deposits
   - Verify sum equals deposit

10. **Property 10: Store Persistence Round-Trip**
    - Generate random portfolio states
    - Verify localStorage round-trip

### Integration Testing

1. **Complete Portfolio Flow**
   - Create portfolio → Configure → Check sidebar count
   - Verify P/L is 0 initially
   - Update prices → Verify P/L changes correctly

2. **Per-Token Automation**
   - Create portfolio with multiple tokens
   - Set different settings per token
   - Trigger price changes
   - Verify only affected tokens act

3. **Token Quantity Display**
   - Create portfolio with allocations
   - Verify quantities displayed correctly
   - Update prices → Verify quantities unchanged

## Implementation Notes

### Fix Priority

1. **High Priority** (Breaks core functionality):
   - Sidebar portfolio count
   - P/L calculation (initial deposit as loss)

2. **Medium Priority** (Affects user experience):
   - Token quantity display
   - Per-token settings structure

3. **Low Priority** (Future enhancement):
   - Automated per-token actions (requires price monitoring service)

### Sidebar Fix Details

The sidebar likely uses one of these components:
- `client/src/lib/components/Sidebar.svelte`
- `client/src/lib/components/NavigationSidebar.svelte`

Need to:
1. Import `portfolioCount` from simulation store
2. Subscribe using `$portfolioCount` syntax
3. Display in template

### P/L Fix Details

The bug is in how `currentValue` is set when a portfolio has no holdings yet:

**Current (buggy)**:
```javascript
// Portfolio created with $4000 deposit
currentValue: 0  // BUG: Set to 0 when no holdings
initialDeposit: 4000
profitLoss: 0 - 4000 = -4000 (-100%)
```

**Fixed**:
```javascript
// Portfolio created with $4000 deposit
currentValue: 4000  // FIX: Keep deposit amount until holdings added
initialDeposit: 4000
profitLoss: 4000 - 4000 = 0 (0%)
```

### Token Quantity Display

Add to portfolio dashboard holdings list:
```svelte
<div class="holding">
  <span class="symbol">{symbol}</span>
  <span class="quantity">{holding.amount.toFixed(6)} tokens</span>
  <span class="price">@ ${formatPrice(holding.currentPrice)}</span>
  <span class="value">${(holding.amount * holding.currentPrice).toFixed(2)}</span>
</div>
```

### Per-Token Settings Migration

Existing portfolios may have old settings structure. Need migration:
```javascript
function migratePortfolioSettings(portfolio) {
  if (!portfolio.settings.tokenSettings) {
    // Migrate from old structure
    portfolio.settings.tokenSettings = {};
    
    // If old settings exist, apply to all tokens
    if (portfolio.settings.sellPercent) {
      for (const symbol of Object.keys(portfolio.holdings)) {
        portfolio.settings.tokenSettings[symbol] = {
          targetPercentage: portfolio.holdings[symbol].percentage,
          sellPercent: portfolio.settings.sellPercent,
          buyPercent: portfolio.settings.buyPercent,
          stopLossPercent: portfolio.settings.stopLossPercent,
          lastPrice: portfolio.holdings[symbol].currentPrice,
          enabled: true
        };
      }
    }
  }
  return portfolio;
}
```

## Security Considerations

1. **Data Validation**
   - Validate all numeric inputs
   - Prevent negative quantities
   - Prevent division by zero

2. **State Consistency**
   - Ensure atomic updates
   - Validate derived values
   - Handle localStorage errors gracefully

3. **Performance**
   - Debounce price updates
   - Batch calculations
   - Optimize derived store computations

## Future Enhancements

1. **Price Monitoring Service**
   - Background service to monitor prices
   - Trigger per-token actions automatically
   - Webhook integration for real-time updates

2. **Advanced Per-Token Settings**
   - Trailing stop-loss
   - Take-profit targets
   - Time-based rules

3. **Portfolio Analytics**
   - Per-token P/L tracking
   - Historical performance charts
   - Rebalancing history

4. **Bulk Operations**
   - Apply settings to multiple tokens
   - Copy settings between portfolios
   - Templates for common strategies
