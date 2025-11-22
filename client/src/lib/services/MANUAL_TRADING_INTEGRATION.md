# Manual Trading Integration

## Overview

The manual trading capability allows users to override automation and execute trades manually on the portfolio management page. This feature integrates with the `ManualTradingIntegrationService` to provide conflict resolution and safety checks.

## Features

### 1. Quick Trading Actions
- **Quick Buy Button**: Opens a trade modal to buy any token
- **Quick Sell Button**: Opens a trade modal to sell any token
- Located in a prominent card at the top of the portfolio page

### 2. Per-Token Trading
- Each selected token in the allocation summary has Buy/Sell buttons
- Buttons appear on hover for a clean interface
- Pre-fills the trade modal with the selected token

### 3. Trade Modal Integration
- Uses the existing `TradeModal` component
- Supports token selection and amount input
- Shows balance information
- Handles slippage tolerance

### 4. Automation Override
- Manual trades temporarily override automation
- Portfolio settings remain active after trade completion
- Conflict resolution ensures user safety

## Usage

### Opening a Manual Trade

```javascript
// Quick buy (no specific token)
openBuyModal();

// Quick sell (no specific token)
openSellModal();

// Buy a specific token
openBuyModal(token);

// Sell a specific token
openSellModal(token);
```

### Trade Flow

1. User clicks Buy or Sell button
2. Trade modal opens with pre-filled tokens (if applicable)
3. User selects tokens and enters amount
4. User confirms the trade
5. Manual trading service handles the execution
6. Portfolio reloads to reflect changes

## Integration Points

### Services Used
- `ManualTradingIntegrationService`: Handles manual override logic
- `TradeModal`: Provides the UI for trade execution
- `portfolioContractService`: Executes blockchain transactions
- `notify`: Shows user notifications

### State Management
- `showTradeModal`: Controls modal visibility
- `tradeModalDefaultTokenIn`: Pre-fills input token
- `tradeModalDefaultTokenOut`: Pre-fills output token
- `isManualTradingInitialized`: Tracks service initialization

### Event Handlers
- `handleManualTradeComplete()`: Called when trade succeeds
- `closeTradeModal()`: Called when modal is closed

## UI Components

### Manual Trading Card
Located at the top of the portfolio page, provides:
- Quick Buy button (green gradient)
- Quick Sell button (red gradient)
- Information about manual trading behavior

### Token List Actions
Each token in the allocation summary shows:
- Buy button (green, plus icon)
- Sell button (red, minus icon)
- Buttons appear on hover

## Safety Features

1. **Initialization Check**: Ensures manual trading service is ready
2. **User Notifications**: Informs users about automation override
3. **Portfolio Reload**: Refreshes data after trade completion
4. **Conflict Resolution**: Handled by ManualTradingIntegrationService

## Configuration

The manual trading service is initialized with:
```javascript
{
  confirmationTimeout: 30000,  // 30 seconds
  overrideCooldown: 60000      // 60 seconds
}
```

## Future Enhancements

- Add trade history view
- Show pending manual trades
- Add advanced order types (limit, stop-loss)
- Integrate with automation conflict resolution UI
- Add trade confirmation dialog for large amounts
