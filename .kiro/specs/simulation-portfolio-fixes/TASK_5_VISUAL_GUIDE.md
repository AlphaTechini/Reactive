# Task 5 Visual Guide: Per-Token Settings Structure

## Data Structure Diagram

```
Portfolio
├── name: "My Portfolio"
├── description: "Test portfolio"
├── createdAt: 1234567890
├── initialDeposit: 1000
├── currentValue: 1050
├── holdings: {
│   ├── BTC: {
│   │   ├── amount: 0.02
│   │   ├── initialPrice: 50000
│   │   ├── currentPrice: 52000
│   │   └── percentage: 50
│   │   }
│   └── ETH: {
│       ├── amount: 0.1
│       ├── initialPrice: 3000
│       ├── currentPrice: 3100
│       └── percentage: 30
│       }
│   }
├── settings: {
│   ├── allocations: {}
│   ├── autoBalanceEnabled: true
│   │
│   ├── Global Defaults (Legacy):
│   ├── sellPercent: 10
│   ├── buyPercent: 5
│   ├── stopLossPercent: 15
│   │
│   └── tokenSettings: {  ← NEW!
│       ├── BTC: {
│       │   ├── targetPercentage: 50
│       │   ├── sellPercent: 10
│       │   ├── buyPercent: 5
│       │   ├── stopLossPercent: 15
│       │   ├── lastPrice: 50000
│       │   └── enabled: true
│       │   }
│       └── ETH: {
│           ├── targetPercentage: 30
│           ├── sellPercent: 8
│           ├── buyPercent: 3
│           ├── stopLossPercent: 20
│           ├── lastPrice: 3000
│           └── enabled: true
│           }
│       }
│   }
└── profitLoss: {
    ├── absolute: 50
    └── percentage: 5
    }
```

## Before vs After

### Before (Global Settings Only)
```javascript
{
  settings: {
    sellPercent: 10,      // Applied to ALL tokens
    buyPercent: 5,        // Applied to ALL tokens
    stopLossPercent: 15,  // Applied to ALL tokens
    autoBalanceEnabled: true
  }
}
```

**Problem**: All tokens use the same settings. Can't have different rules for BTC vs ETH.

### After (Per-Token Settings)
```javascript
{
  settings: {
    // Global defaults (legacy)
    sellPercent: 10,
    buyPercent: 5,
    stopLossPercent: 15,
    autoBalanceEnabled: true,
    
    // Per-token settings (NEW)
    tokenSettings: {
      BTC: {
        targetPercentage: 50,
        sellPercent: 10,      // BTC-specific
        buyPercent: 5,        // BTC-specific
        stopLossPercent: 15,  // BTC-specific
        lastPrice: 50000,
        enabled: true
      },
      ETH: {
        targetPercentage: 30,
        sellPercent: 8,       // ETH-specific (different!)
        buyPercent: 3,        // ETH-specific (different!)
        stopLossPercent: 20,  // ETH-specific (different!)
        lastPrice: 3000,
        enabled: true
      }
    }
  }
}
```

**Solution**: Each token has independent settings. BTC can have 10% sell trigger while ETH has 8%.

## Migration Flow

```
┌─────────────────────────────────────┐
│  Old Portfolio (from localStorage)  │
│                                     │
│  settings: {                        │
│    sellPercent: 10,                 │
│    buyPercent: 5,                   │
│    stopLossPercent: 15              │
│  }                                  │
│  holdings: {                        │
│    BTC: { ... },                    │
│    ETH: { ... }                     │
│  }                                  │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ migratePortfolio     │
    │ Settings()           │
    └──────────┬───────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Migrated Portfolio                 │
│                                     │
│  settings: {                        │
│    sellPercent: 10,                 │
│    buyPercent: 5,                   │
│    stopLossPercent: 15,             │
│    tokenSettings: {  ← ADDED!       │
│      BTC: {                         │
│        targetPercentage: 50,        │
│        sellPercent: 10,  ← from global
│        buyPercent: 5,    ← from global
│        stopLossPercent: 15, ← from global
│        lastPrice: 50000, ← from holding
│        enabled: true                │
│      },                             │
│      ETH: { ... }                   │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
```

## Function Flow

### Creating a New Portfolio
```
User Action: createPortfolio('My Portfolio', 'Desc', 1000)
                    ↓
        ┌───────────────────────┐
        │ Create portfolio with │
        │ empty tokenSettings   │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ Portfolio created:    │
        │ tokenSettings: {}     │
        └───────────────────────┘
```

### Updating Token Settings
```
User Action: updateTokenSettings('My Portfolio', 'BTC', { sellPercent: 10 })
                    ↓
        ┌───────────────────────┐
        │ Get portfolio         │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ Ensure tokenSettings  │
        │ exists                │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ Merge new settings    │
        │ with existing         │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ Save to state         │
        │ Persist to localStorage
        └───────────────────────┘
```

### Getting Token Settings
```
User Action: getTokenSettings('My Portfolio', 'BTC')
                    ↓
        ┌───────────────────────┐
        │ Get portfolio         │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ Check if tokenSettings│
        │ exists                │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ Return BTC settings   │
        │ or null               │
        └───────────────────────┘
```

## Usage Scenarios

### Scenario 1: Conservative BTC, Aggressive ETH
```javascript
// BTC: Conservative (higher thresholds)
updateTokenSettings('My Portfolio', 'BTC', {
  targetPercentage: 50,
  sellPercent: 15,      // Sell at 15% gain
  buyPercent: 10,       // Buy at 10% dip
  stopLossPercent: 20,  // Stop-loss at 20% loss
  enabled: true
});

// ETH: Aggressive (lower thresholds)
updateTokenSettings('My Portfolio', 'ETH', {
  targetPercentage: 30,
  sellPercent: 5,       // Sell at 5% gain (more frequent)
  buyPercent: 3,        // Buy at 3% dip (more frequent)
  stopLossPercent: 10,  // Tighter stop-loss
  enabled: true
});
```

### Scenario 2: Active Trading vs Hold
```javascript
// BTC: Active trading
updateTokenSettings('My Portfolio', 'BTC', {
  targetPercentage: 40,
  sellPercent: 5,
  buyPercent: 5,
  stopLossPercent: 15,
  enabled: true  // Automation ON
});

// USDC: Hold (no automation)
updateTokenSettings('My Portfolio', 'USDC', {
  targetPercentage: 60,
  sellPercent: 0,
  buyPercent: 0,
  stopLossPercent: 0,
  enabled: false  // Automation OFF
});
```

### Scenario 3: Different Risk Levels
```javascript
// High Risk Token (Memecoin)
updateTokenSettings('My Portfolio', 'FLOKI', {
  targetPercentage: 10,
  sellPercent: 20,      // Take profits quickly
  buyPercent: 15,       // Buy dips aggressively
  stopLossPercent: 30,  // Wide stop-loss (volatile)
  enabled: true
});

// Low Risk Token (Stablecoin)
updateTokenSettings('My Portfolio', 'USDC', {
  targetPercentage: 20,
  sellPercent: 0,       // No selling
  buyPercent: 0,        // No buying
  stopLossPercent: 0,   // No stop-loss needed
  enabled: false        // Just hold
});
```

## API Reference

### updateTokenSettings(portfolioName, symbol, tokenSettings)
Updates settings for a specific token.

**Parameters:**
- `portfolioName` (string): Portfolio identifier
- `symbol` (string): Token symbol (e.g., 'BTC')
- `tokenSettings` (object): Settings to update
  - `targetPercentage` (number): Target allocation %
  - `sellPercent` (number): Sell trigger %
  - `buyPercent` (number): Buy trigger %
  - `stopLossPercent` (number): Stop-loss trigger %
  - `lastPrice` (number): Last action price
  - `enabled` (boolean): Automation enabled

**Example:**
```javascript
updateTokenSettings('My Portfolio', 'BTC', {
  sellPercent: 10,
  buyPercent: 5,
  enabled: true
});
```

### getTokenSettings(portfolioName, symbol)
Retrieves settings for a specific token.

**Returns:** Object with token settings or null

**Example:**
```javascript
const btcSettings = getTokenSettings('My Portfolio', 'BTC');
if (btcSettings) {
  console.log(`BTC sell trigger: ${btcSettings.sellPercent}%`);
}
```

### getAllTokenSettings(portfolioName)
Retrieves all token settings for a portfolio.

**Returns:** Object mapping symbols to settings

**Example:**
```javascript
const allSettings = getAllTokenSettings('My Portfolio');
for (const [symbol, settings] of Object.entries(allSettings)) {
  console.log(`${symbol}: ${settings.sellPercent}% sell trigger`);
}
```

## Benefits

✅ **Flexibility**: Each token can have different automation rules
✅ **Risk Management**: Set tighter stop-losses for volatile tokens
✅ **Strategy Diversity**: Mix conservative and aggressive approaches
✅ **Granular Control**: Fine-tune each token independently
✅ **Backward Compatible**: Old portfolios continue to work
✅ **Easy Migration**: Automatic, no user action required
