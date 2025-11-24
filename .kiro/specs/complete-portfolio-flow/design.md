# Design Document

## Overview

The Complete Portfolio Flow system provides a unified user experience for portfolio management across both simulation and live modes. The design leverages existing services and components while introducing new functionality for portfolio creation, settings management, automated trading, and comprehensive dashboard views.

The system is built on a dual-mode architecture where simulation mode uses local calculations and storage, while live mode integrates with Reactive Network smart contracts. Both modes share the same UI components and user flow, with mode-specific service implementations handling the underlying operations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │  Components  │  │    Stores    │      │
│  │  (Svelte)    │  │   (Svelte)   │  │   (Svelte)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────┐
│         │      Service Layer (Mode-Aware)     │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐     │
│  │           Portfolio Management Service             │     │
│  │  ┌──────────────────┐  ┌──────────────────┐       │     │
│  │  │  Simulation Mode │  │    Live Mode     │       │     │
│  │  │   (Local Calc)   │  │  (Blockchain)    │       │     │
│  │  └──────────────────┘  └──────────────────┘       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Supporting Services                        │     │
│  │  • Price Service                                   │     │
│  │  • Trading Service                                 │     │
│  │  • Settings Service                                │     │
│  │  • Rebalancing Engine                              │     │
│  │  • Risk Management Service                         │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
          │                                    │
┌─────────▼────────────┐          ┌───────────▼──────────────┐
│  Local Storage       │          │  Reactive Network        │
│  (Simulation)        │          │  Smart Contracts (Live)  │
└──────────────────────┘          └──────────────────────────┘
```

### Component Hierarchy

```
App Root
├── Mode Switcher (Simulation/Live)
├── Navigation
│   └── Portfolio List
├── Routes
│   ├── Dashboard (/)
│   │   ├── Available Balance Display
│   │   └── Portfolio Cards List
│   ├── Create Portfolio (/create-portfolio or /simulated/create-portfolio)
│   │   └── Portfolio Creation Form
│   ├── Portfolio Settings (/portfolios/[id]/settings)
│   │   ├── Token Allocation Manager
│   │   ├── Trading Parameters Form
│   │   └── Auto-Balancer Toggle
│   └── Portfolio Dashboard (/portfolios/[id])
│       ├── Portfolio Header (Value, Currencies Count)
│       ├── Performance Metrics (Profit/Loss)
│       ├── Category Breakdown Grid
│       ├── Token Holdings Sidebar
│       └── Action Buttons (Deposit/Withdraw)
```

## Components and Interfaces

### Core Services

#### PortfolioFlowService

Main service coordinating portfolio operations across modes.

```javascript
class PortfolioFlowService {
  constructor(mode) {
    this.mode = mode; // 'simulation' | 'live'
    this.storageService = mode === 'simulation' 
      ? new SimulationStorageService() 
      : new BlockchainStorageService();
  }

  // Portfolio CRUD
  async createPortfolio(data)
  async getPortfolio(id)
  async updatePortfolio(id, updates)
  async deletePortfolio(id)
  async listPortfolios()

  // Balance management
  async getAvailableBalance()
  async depositToPortfolio(portfolioId, amount)
  async withdrawFromPortfolio(portfolioId, amount)

  // Settings management
  async saveSettings(portfolioId, settings)
  async getSettings(portfolioId)
  async applySettings(portfolioId)
}
```

#### TokenAllocationManager

Handles token allocation calculations and validation.

```javascript
class TokenAllocationManager {
  // Calculate allocations
  calculateEqualDistribution(tokens)
  validateAllocations(allocations)
  calculateRemainingPercentage(allocations, total)
  
  // Auto-fill last token
  autoFillLastToken(allocations)
  
  // Allocation to token amounts
  calculateTokenAmounts(allocations, portfolioValue, prices)
}
```

#### AutomatedTradingEngine

Monitors prices and executes trades based on settings.

```javascript
class AutomatedTradingEngine {
  constructor(portfolioId, settings) {
    this.portfolioId = portfolioId;
    this.settings = settings;
    this.lastPrices = {};
  }

  // Price monitoring
  async onPriceUpdate(symbol, newPrice)
  checkTakeProfitTrigger(symbol, currentPrice, lastPrice)
  checkBuyThresholdTrigger(symbol, currentPrice, lastPrice)
  checkStopLossTrigger(symbol, currentPrice, lastPrice)

  // Trade execution
  async executeTakeProfit(symbol, amount)
  async executeBuy(symbol, amount)
  async executeStopLoss(symbol)

  // Profit/Loss tracking
  updateProfitLoss(tradeResult)
  getCumulativeProfitLoss()
}
```

#### AutoBalancerService

Maintains target allocations through automatic rebalancing.

```javascript
class AutoBalancerService {
  constructor(portfolioId, targetAllocations) {
    this.portfolioId = portfolioId;
    this.targetAllocations = targetAllocations;
  }

  // Rebalancing logic
  async checkRebalanceNeeded(currentHoldings, portfolioValue, prices)
  calculateRebalanceTrades(currentAllocations, targetAllocations, portfolioValue)
  async executeRebalance(trades)

  // Allocation monitoring
  getCurrentAllocations(holdings, portfolioValue, prices)
  getAllocationDrift(current, target)
}
```

### Data Models

#### Portfolio

```javascript
{
  id: string,
  name: string,
  description: string,
  mode: 'simulation' | 'live',
  createdAt: timestamp,
  updatedAt: timestamp,
  
  // Financial data
  initialDeposit: number,
  currentValue: number,
  availableBalance: number, // Cash not in tokens
  
  // Holdings
  holdings: [
    {
      symbol: string,
      amount: number,
      avgBuyPrice: number,
      currentPrice: number,
      value: number,
      allocation: number // percentage
    }
  ],
  
  // Performance
  cumulativeProfit: number, // percentage
  cumulativeLoss: number, // percentage
  
  // Settings
  settings: PortfolioSettings,
  
  // Metadata
  transactionCount: number,
  lastRebalance: timestamp
}
```

#### PortfolioSettings

```javascript
{
  // Token allocations (whole numbers only)
  tokenAllocations: {
    [symbol]: number // percentage
  },
  
  // Trading parameters
  takeProfitPercent: number,
  buyThresholdPercent: number,
  stopLossPercent: number,
  
  // Auto-balancer
  autoBalancerEnabled: boolean,
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### TokenCategory

```javascript
{
  name: 'Memecoins' | 'Altcoins' | 'Stablecoins' | 'Individual',
  tokens: string[], // symbols
  totalValue: number,
  percentage: number
}
```

## Data Models

### Storage Schema

#### Simulation Mode (LocalStorage)

```javascript
// Key: 'simulation_portfolios'
{
  availableBalance: 10000,
  portfolios: {
    [portfolioId]: Portfolio
  }
}

// Key: 'simulation_portfolio_[id]_transactions'
[
  {
    type: 'buy' | 'sell' | 'deposit' | 'withdraw' | 'rebalance',
    symbol: string,
    amount: number,
    price: number,
    timestamp: number,
    profitLoss: number
  }
]

// Key: 'simulation_portfolio_[id]_settings'
PortfolioSettings
```

#### Live Mode (Smart Contract + Backend)

Smart contract stores:
- Portfolio ownership
- Token holdings
- Settings hash

Backend API stores:
- Portfolio metadata
- Transaction history
- Performance metrics


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:
- Display properties (6.1-6.4, 7.1-7.3, 8.1-8.4) can be combined into comprehensive display correctness properties
- Balance update properties (2.3, 2.4, 9.3, 9.5, 10.4, 10.5) share common patterns and can be unified
- Validation properties (2.2, 3.2, 3.5, 9.2, 10.2) follow similar patterns
- Automated trading properties (11.1-11.5) can be streamlined

### Property 1: Mode toggle consistency
*For any* application state, toggling the mode should switch between simulation and live modes
**Validates: Requirements 1.3**

### Property 2: Wallet requirement for live mode
*For any* attempt to switch to live mode without a connected wallet, the system should prompt for wallet connection
**Validates: Requirements 1.4**

### Property 3: Deposit validation
*For any* deposit amount and available balance, the system should reject deposits that exceed the available balance
**Validates: Requirements 2.2, 9.2**

### Property 4: Balance deduction on portfolio creation
*For any* valid deposit amount, creating a portfolio should reduce the available balance by exactly that amount
**Validates: Requirements 2.3**

### Property 5: Initial portfolio balance equals deposit
*For any* newly created portfolio, the portfolio balance should equal the initial deposit amount
**Validates: Requirements 2.4**

### Property 6: Portfolio creation navigation
*For any* successful portfolio creation, the system should navigate to the settings page for that portfolio
**Validates: Requirements 2.5**

### Property 7: Whole number allocation validation
*For any* allocation input containing decimals, the system should reject the input
**Validates: Requirements 3.2**

### Property 8: Auto-calculate last token allocation
*For any* set of token allocations where only one token remains unallocated, the system should set that token's percentage to (100 - sum of others)
**Validates: Requirements 3.3**

### Property 9: Allow allocations exceeding 100%
*For any* set of token allocations totaling more than 100%, the system should accept the allocations
**Validates: Requirements 3.4**

### Property 10: Require non-zero allocation
*For any* set of token allocations where all are zero, the system should reject the configuration
**Validates: Requirements 3.5**

### Property 11: Settings persistence
*For any* portfolio settings, saving should make them retrievable from storage
**Validates: Requirements 4.5**

### Property 12: Auto-balancer sells excess allocations
*For any* portfolio with auto-balancer enabled where a token's allocation exceeds its target, the system should sell the excess amount
**Validates: Requirements 5.1**

### Property 13: Auto-balancer buys deficient allocations
*For any* portfolio with auto-balancer enabled where a token's allocation falls below its target, the system should buy additional tokens
**Validates: Requirements 5.2**

### Property 14: Rebalancing uses current balance
*For any* rebalancing calculation, the system should use the current portfolio balance, not the initial deposit
**Validates: Requirements 5.3**

### Property 15: Disabled auto-balancer prevents rebalancing
*For any* portfolio with auto-balancer disabled, no automatic rebalancing trades should execute regardless of allocation drift
**Validates: Requirements 5.4**

### Property 16: Rebalancing updates profit/loss tracker
*For any* rebalancing operation, the system should update the profit/loss tracker with the trade results
**Validates: Requirements 5.5**

### Property 17: Dashboard displays correct metrics
*For any* portfolio, the dashboard should display the correct number of currencies, portfolio balance, cumulative profit, and cumulative loss
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 18: Sidebar displays all holdings
*For any* portfolio, the sidebar should list all tokens currently held
**Validates: Requirements 7.1**

### Property 19: Token price display
*For any* token in the portfolio, the sidebar should show its current price
**Validates: Requirements 7.2**

### Property 20: Percentage change calculation
*For any* token with price history, the system should calculate and display the percentage change since the last fetch
**Validates: Requirements 7.3**

### Property 21: Category percentage calculation
*For any* portfolio, the system should correctly calculate and display the percentage for each token category (Memecoins, Altcoins, Stablecoins, Individual)
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 22: Withdrawal validation
*For any* withdrawal amount and portfolio balance, the system should reject withdrawals that exceed the portfolio balance
**Validates: Requirements 10.2**

### Property 23: Deposit distribution by allocation
*For any* deposit to a portfolio, the system should distribute the funds across tokens according to the portfolio's allocation settings
**Validates: Requirements 9.4**

### Property 24: Deposit increases portfolio balance
*For any* valid deposit amount, the portfolio balance should increase by exactly that amount
**Validates: Requirements 9.5**

### Property 25: Withdrawal proportional selling
*For any* withdrawal request, the system should sell tokens proportionally to raise the requested amount
**Validates: Requirements 10.3**

### Property 26: Withdrawal increases available balance
*For any* successful withdrawal, the available balance should increase by the withdrawal amount
**Validates: Requirements 10.4**

### Property 27: Withdrawal decreases portfolio balance
*For any* successful withdrawal, the portfolio balance should decrease by the withdrawal amount
**Validates: Requirements 10.5**

### Property 28: Take-profit triggers sell
*For any* token where the price increases by the take-profit percentage, the system should automatically sell that token
**Validates: Requirements 11.1**

### Property 29: Buy threshold triggers purchase
*For any* token where the price decreases by the buy threshold percentage, the system should automatically buy more of that token
**Validates: Requirements 11.2**

### Property 30: Stop-loss converts to USDC
*For any* token where the price decreases by the stop-loss percentage, the system should automatically sell that token for USDC
**Validates: Requirements 11.3**

### Property 31: Automated trades update tracker
*For any* automated trade execution, the system should update the profit/loss tracker with the results
**Validates: Requirements 11.4**

### Property 32: Threshold comparison uses last price
*For any* price change detection, the system should compare against the last fetched price, not the initial purchase price
**Validates: Requirements 11.5**

### Property 33: Profit accumulation
*For any* profitable trade, the system should add the profit percentage to the cumulative profit total
**Validates: Requirements 12.1**

### Property 34: Loss accumulation
*For any* losing trade, the system should add the loss percentage to the cumulative loss total
**Validates: Requirements 12.2**

### Property 35: Profit/loss calculation
*For any* trade, the profit/loss should be calculated as the difference between sell price and buy price
**Validates: Requirements 12.3**

### Property 36: Profit/loss precision
*For any* profit/loss display, the system should show percentages with exactly 2 decimal places
**Validates: Requirements 12.4**

### Property 37: Mode data isolation
*For any* portfolio operation, switching modes should maintain separate portfolio data for simulation and live modes
**Validates: Requirements 13.3**

## Error Handling

### Validation Errors

1. **Insufficient Balance**: When deposit/withdrawal exceeds available funds
   - Display clear error message with current balance
   - Prevent transaction submission
   - Suggest maximum available amount

2. **Invalid Allocations**: When token allocations are invalid
   - Show specific validation errors (decimals, all zeros, etc.)
   - Highlight problematic fields
   - Provide correction suggestions

3. **Missing Price Data**: When token prices are unavailable
   - Display last known price with timestamp
   - Show warning indicator
   - Prevent trades until prices are available

### Transaction Errors

1. **Failed Trades**: When buy/sell operations fail
   - Log error details
   - Rollback state changes
   - Notify user with retry option

2. **Rebalancing Failures**: When auto-rebalancing encounters errors
   - Disable auto-balancer temporarily
   - Log failure reason
   - Notify user to review settings

3. **Settings Save Failures**: When settings cannot be persisted
   - Retain in-memory settings
   - Retry with exponential backoff
   - Warn user of unsaved changes

### Network Errors

1. **Price Service Failures**: When price fetching fails
   - Use cached prices with staleness indicator
   - Retry with exponential backoff
   - Fall back to alternative price sources

2. **Blockchain Errors** (Live Mode): When smart contract calls fail
   - Display user-friendly error messages
   - Provide transaction hash for debugging
   - Suggest gas price adjustments if needed

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Individual service methods (PortfolioFlowService, TokenAllocationManager, etc.)
- Calculation functions (allocations, profit/loss, category percentages)
- Validation logic (deposit amounts, allocations, settings)
- State management (stores and their derived values)
- Component rendering (forms, modals, dashboard elements)

### Property-Based Testing

We will use **fast-check** (JavaScript property-based testing library) for property tests. Each property test will run a minimum of 100 iterations.

Property tests will verify:
- Balance calculations across random deposit/withdrawal sequences
- Allocation calculations with random percentage distributions
- Profit/loss accumulation with random trade sequences
- Rebalancing logic with random portfolio states
- Mode switching with random operation sequences

Each property-based test will be tagged with:
`**Feature: complete-portfolio-flow, Property {number}: {property_text}**`

### Integration Testing

Integration tests will verify:
- Complete portfolio creation flow
- Settings configuration and application
- Deposit/withdrawal with token distribution
- Automated trading triggers
- Mode switching with data persistence

### Manual Testing Checklist

- [ ] Create portfolio in simulation mode
- [ ] Configure token allocations (including edge cases)
- [ ] Set trading parameters
- [ ] Deposit funds and verify distribution
- [ ] Trigger automated trades through price changes
- [ ] Test auto-balancer with allocation drift
- [ ] Withdraw funds and verify proportional selling
- [ ] Switch to live mode and verify wallet prompt
- [ ] Verify category breakdowns with different portfolios
- [ ] Test profit/loss tracking across multiple trades

## Implementation Notes

### Mode Switching Strategy

The system uses a mode-aware service pattern where each service has simulation and live implementations:

```javascript
// Mode-aware factory
function createPortfolioService(mode) {
  return mode === 'simulation' 
    ? new SimulationPortfolioService()
    : new LivePortfolioService();
}
```

### Performance Considerations

1. **Price Updates**: Batch price updates to minimize re-renders
2. **Rebalancing**: Debounce rebalancing checks to avoid excessive calculations
3. **Storage**: Use efficient serialization for localStorage in simulation mode
4. **Caching**: Cache calculated values (category percentages, allocations) until portfolio state changes

### Security Considerations

1. **Input Validation**: Validate all user inputs on both client and server
2. **Balance Checks**: Always verify sufficient balance before operations
3. **Transaction Signing** (Live Mode): Require explicit user approval for all blockchain transactions
4. **Settings Validation**: Validate settings ranges to prevent extreme values

### Accessibility

1. **Keyboard Navigation**: All interactive elements accessible via keyboard
2. **Screen Readers**: Proper ARIA labels for dynamic content
3. **Color Contrast**: Ensure sufficient contrast for profit/loss indicators
4. **Error Messages**: Clear, descriptive error messages for all validation failures

### Future Enhancements

1. **Portfolio Templates**: Pre-configured allocation strategies
2. **Historical Performance**: Charts showing portfolio value over time
3. **Advanced Rebalancing**: Time-based and threshold-based strategies
4. **Multi-Portfolio View**: Dashboard showing all portfolios at once
5. **Export/Import**: Portfolio settings and transaction history
