# Task 11: Deposit and Withdraw - Visual Guide

## UI Components

### Portfolio Dashboard with Action Buttons

```
┌─────────────────────────────────────────────────────────────┐
│ Portfolio Dashboard - My Portfolio                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Portfolio Overview                                          │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐│
│  │ Portfolio    │ No. of       │ Profit       │ Initial   ││
│  │ Value        │ Currencies   │              │ Deposit   ││
│  │ $5,234.56    │ 5            │ +4.69%       │ $5,000.00 ││
│  └──────────────┴──────────────┴──────────────┴───────────┘│
│                                                              │
│  Holdings                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BTC  Bitcoin          0.123456 @ $45,000  $5,555.21  │  │
│  │ ETH  Ethereum         2.345678 @ $2,500   $5,864.20  │  │
│  │ ...                                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────┬──────────────────────┐           │
│  │  💰 Deposit          │  💸 Withdraw         │           │
│  └──────────────────────┴──────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Deposit Modal

```
┌─────────────────────────────────────────────────────────┐
│  💰 Deposit Funds                                    [X]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Deposit funds will be automatically distributed        │
│  across your existing holdings based on their           │
│  current percentages.                                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ Available Balance: $5,000.00                       ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Deposit Amount (USD)                                   │
│  ┌────────────────────────────────────────────────────┐│
│  │ 1000.00                                            ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  ┌──────────────────┬──────────────────────────────┐   │
│  │     Cancel       │   Confirm Deposit            │   │
│  └──────────────────┴──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Withdraw Modal

```
┌─────────────────────────────────────────────────────────┐
│  💸 Withdraw Funds                                   [X]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Withdraw funds by proportionally reducing all          │
│  holdings. The percentage distribution will remain      │
│  the same.                                              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ Portfolio Value: $5,234.56                         ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Withdraw Amount (USD)                                  │
│  ┌────────────────────────────────────────────────────┐│
│  │ 500.00                                             ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  ┌──────────────────┬──────────────────────────────┐   │
│  │     Cancel       │   Confirm Withdrawal         │   │
│  └──────────────────┴──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Flow Diagrams

### Deposit Flow

```
User clicks "Deposit"
        ↓
Modal opens with input field
        ↓
User enters amount
        ↓
Validation checks:
  - Amount > 0?
  - Amount ≤ Available Balance?
  - Portfolio has holdings?
        ↓
User clicks "Confirm Deposit"
        ↓
System fetches current prices
        ↓
Calculate current percentages:
  BTC: 40% ($2,000 / $5,000)
  ETH: 35% ($1,750 / $5,000)
  SOL: 25% ($1,250 / $5,000)
        ↓
Distribute deposit ($1,000):
  BTC: $400 (40% of $1,000)
  ETH: $350 (35% of $1,000)
  SOL: $250 (25% of $1,000)
        ↓
Calculate token amounts:
  BTC: $400 / $45,000 = 0.008889
  ETH: $350 / $2,500 = 0.14
  SOL: $250 / $100 = 2.5
        ↓
Add to existing holdings:
  BTC: 0.1 + 0.008889 = 0.108889
  ETH: 2.0 + 0.14 = 2.14
  SOL: 10.0 + 2.5 = 12.5
        ↓
Update store:
  - Deduct $1,000 from balance
  - Add $1,000 to portfolio value
  - Update holdings
        ↓
Show success message
        ↓
Close modal
```

### Withdraw Flow

```
User clicks "Withdraw"
        ↓
Modal opens with input field
        ↓
User enters amount
        ↓
Validation checks:
  - Amount > 0?
  - Amount ≤ Portfolio Value?
  - Portfolio has holdings?
        ↓
User clicks "Confirm Withdrawal"
        ↓
System fetches current prices
        ↓
Calculate withdrawal percentage:
  $500 / $5,000 = 10%
        ↓
Reduce each holding by 10%:
  BTC: 0.1 × 0.9 = 0.09
  ETH: 2.0 × 0.9 = 1.8
  SOL: 10.0 × 0.9 = 9.0
        ↓
Update store:
  - Add $500 to balance
  - Subtract $500 from portfolio value
  - Update holdings
        ↓
Show success message
        ↓
Close modal
```

## State Changes

### Before Deposit
```javascript
{
  balance: 5000,
  portfolios: {
    "My Portfolio": {
      currentValue: 5000,
      holdings: {
        BTC: { amount: 0.1, initialPrice: 45000, currentPrice: 45000 },
        ETH: { amount: 2.0, initialPrice: 2500, currentPrice: 2500 },
        SOL: { amount: 10.0, initialPrice: 100, currentPrice: 100 }
      }
    }
  }
}
```

### After Deposit ($1,000)
```javascript
{
  balance: 4000,  // Decreased by $1,000
  portfolios: {
    "My Portfolio": {
      currentValue: 6000,  // Increased by $1,000
      holdings: {
        BTC: { amount: 0.108889, initialPrice: 45000, currentPrice: 45000 },
        ETH: { amount: 2.14, initialPrice: 2500, currentPrice: 2500 },
        SOL: { amount: 12.5, initialPrice: 100, currentPrice: 100 }
      }
    }
  }
}
```

### After Withdraw ($500)
```javascript
{
  balance: 4500,  // Increased by $500
  portfolios: {
    "My Portfolio": {
      currentValue: 5500,  // Decreased by $500
      holdings: {
        BTC: { amount: 0.098, initialPrice: 45000, currentPrice: 45000 },
        ETH: { amount: 1.926, initialPrice: 2500, currentPrice: 2500 },
        SOL: { amount: 11.25, initialPrice: 100, currentPrice: 100 }
      }
    }
  }
}
```

## Percentage Preservation

### Example: Portfolio with 3 tokens

**Initial State:**
- BTC: 40% ($2,000)
- ETH: 35% ($1,750)
- SOL: 25% ($1,250)
- Total: $5,000

**After Deposit ($1,000):**
- BTC: 40% ($2,400) ← Still 40%
- ETH: 35% ($2,100) ← Still 35%
- SOL: 25% ($1,500) ← Still 25%
- Total: $6,000

**After Withdraw ($500):**
- BTC: 40% ($2,200) ← Still 40%
- ETH: 35% ($1,925) ← Still 35%
- SOL: 25% ($1,375) ← Still 25%
- Total: $5,500

The percentages remain constant throughout deposits and withdrawals!

## Error States

### Deposit Errors

```
┌─────────────────────────────────────────────────────────┐
│  💰 Deposit Funds                                    [X]│
├─────────────────────────────────────────────────────────┤
│  ...                                                     │
│  ┌────────────────────────────────────────────────────┐│
│  │ 10000.00                                           ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ ⚠️ Insufficient balance. Available: $5,000.00      ││
│  └────────────────────────────────────────────────────┘│
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Withdraw Errors

```
┌─────────────────────────────────────────────────────────┐
│  💸 Withdraw Funds                                   [X]│
├─────────────────────────────────────────────────────────┤
│  ...                                                     │
│  ┌────────────────────────────────────────────────────┐│
│  │ 10000.00                                           ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ ⚠️ Insufficient portfolio value. Available: $5,234.56││
│  └────────────────────────────────────────────────────┘│
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

## Success States

```
┌─────────────────────────────────────────────────────────┐
│ Portfolio Dashboard - My Portfolio                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ ✅ Successfully deposited $1,000.00                ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Portfolio Overview                                      │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Auto-Distribution (Deposit)
- Calculates current percentage of each holding
- Distributes new funds according to these percentages
- Maintains portfolio balance

### 2. Proportional Reduction (Withdraw)
- Calculates withdrawal as percentage of total
- Reduces all holdings by same percentage
- Maintains portfolio balance

### 3. Price Tracking
- Fetches current prices before each operation
- Updates `currentPrice` for accurate valuation
- Preserves `initialPrice` for P/L calculation

### 4. Validation
- Real-time input validation
- Clear error messages
- Prevents invalid operations

### 5. User Feedback
- Loading states during processing
- Success messages with amounts
- Error messages with details
- Auto-dismiss after 3 seconds

## Testing Scenarios

### Scenario 1: Simple Deposit
1. Portfolio has $5,000 with 2 tokens (50/50)
2. User deposits $1,000
3. Each token gets $500 more
4. Balance decreases by $1,000
5. Portfolio value increases by $1,000

### Scenario 2: Simple Withdraw
1. Portfolio has $5,000 with 2 tokens (50/50)
2. User withdraws $1,000 (20%)
3. Each token reduced by 20%
4. Balance increases by $1,000
5. Portfolio value decreases by $1,000

### Scenario 3: Edge Case - Withdraw All
1. Portfolio has $5,000
2. User withdraws $5,000 (100%)
3. All holdings become zero
4. Portfolio is empty
5. Balance increases by $5,000

### Scenario 4: Multiple Operations
1. Start: $10,000 balance, $0 portfolio
2. Create portfolio: $5,000 deposit
3. Deposit: +$1,000 → Portfolio: $6,000, Balance: $4,000
4. Withdraw: -$2,000 → Portfolio: $4,000, Balance: $6,000
5. Deposit: +$3,000 → Portfolio: $7,000, Balance: $3,000
6. Final: $7,000 portfolio + $3,000 balance = $10,000 total ✓

## Implementation Notes

### Why Percentage-Based?
- Maintains portfolio balance
- Prevents drift in allocation strategy
- Simplifies calculations
- User-friendly (no need to specify per-token amounts)

### Why Preserve Initial Prices?
- Accurate P/L calculation over time
- Shows true performance since creation
- Not affected by deposits/withdrawals

### Why Proportional Reduction?
- Fair distribution of withdrawal
- Maintains strategy
- Prevents forced selling of specific tokens
- Handles partial withdrawals cleanly

This implementation provides a robust, user-friendly way to manage portfolio funds while maintaining the user's intended allocation strategy.
