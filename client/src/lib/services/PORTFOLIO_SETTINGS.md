# Portfolio Settings Service

The Portfolio Settings Service provides a comprehensive solution for managing portfolio-specific risk management and rebalancing settings. Each portfolio can have its own unique configuration, allowing users to customize their trading strategies per portfolio.

## Features

### Risk Management Settings

- **Stop-Loss Percentage**: Automatically sell when price drops by specified percentage
- **Take-Profit Percentage**: Automatically sell when price rises by specified percentage
- **Auto-Buy Percentage**: Automatically buy more when price drops (dollar-cost averaging)
- **Trailing Stop-Loss**: Stop-loss that follows price upward (advanced)

### Rebalancing Settings

- **Auto-Rebalance Toggle**: Enable/disable automatic portfolio rebalancing
- **Rebalance Threshold**: Trigger rebalancing when allocations drift by this percentage
- **Max Gas Percentage**: Defer rebalancing if gas costs exceed this percentage of trade value
- **Minimum Trade Value**: Skip trades below this USD value to save on gas

## Architecture

### Components

1. **PortfolioSettings.svelte**: UI component for managing settings
2. **PortfolioSettingsService.js**: Service for storing and applying settings
3. **RiskManagementService.js**: Executes risk management strategies
4. **RebalancingEngine.js**: Handles portfolio rebalancing

### Data Flow

```
User Input (UI)
    ↓
PortfolioSettings Component
    ↓
PortfolioSettingsService
    ├→ localStorage (persistence)
    ├→ RiskManagementService (apply risk settings)
    └→ RebalancingEngine (apply rebalancing settings)
```

## Usage

### Basic Usage

```javascript
import { portfolioSettingsService } from '$lib/services/PortfolioSettingsService.js';

// Load settings for a portfolio
const settings = portfolioSettingsService.loadSettings('portfolio-123');

// Modify settings
settings.stopLossPercent = 15;
settings.takeProfitPercent = 30;
settings.autoRebalanceEnabled = true;

// Save settings
portfolioSettingsService.saveSettings('portfolio-123', settings);
```

### Apply Settings to Services

```javascript
// Apply all settings (risk + rebalancing)
await portfolioSettingsService.applyAllSettings(portfolioId, portfolio);

// Or apply individually
await portfolioSettingsService.applyRiskSettings(portfolioId, portfolio);
await portfolioSettingsService.applyRebalancingSettings(portfolioId);
```

### Start Monitoring

```javascript
// Start monitoring a portfolio (applies settings and activates services)
await portfolioSettingsService.startMonitoring(portfolioId, portfolio);

// Check monitoring status
const status = portfolioSettingsService.getMonitoringStatus(portfolioId);

// Stop monitoring
portfolioSettingsService.stopMonitoring(portfolioId);
```

## Settings Schema

```javascript
{
  // Basic Risk Management
  stopLossPercent: 10,        // 1-50%
  takeProfitPercent: 20,      // 1-200%
  autoBuyPercent: 5,          // 1-50%
  
  // Rebalancing
  autoRebalanceEnabled: false,
  rebalanceThreshold: 5,      // 1-50%
  
  // Advanced Risk Management
  trailingStopEnabled: false,
  trailingStopPercent: 5,     // 1-50%, must be < stopLossPercent
  
  // Gas Optimization
  maxGasPercent: 2,           // 0.1-10%
  minTradeValue: 10,          // USD, minimum $1
  
  // Metadata
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

## Validation Rules

### Stop-Loss
- Must be between 1% and 50%
- Automatically converts all positions to USDC when triggered

### Take-Profit
- Must be between 1% and 200%
- Partially liquidates position (default 50%)

### Auto-Buy
- Must be between 1% and 50%
- Implements dollar-cost averaging strategy

### Rebalance Threshold
- Must be between 1% and 50%
- Triggers when any token drifts from target allocation

### Trailing Stop
- Must be between 1% and 50%
- Must be less than stop-loss percentage
- Follows price upward, locking in gains

### Gas Settings
- Max gas: 0.1% to 10% of trade value
- Min trade: At least $1 USD

## Integration with Risk Management Service

The Portfolio Settings Service integrates with the Risk Management Service to apply risk parameters:

```javascript
// For each token in portfolio
await riskManagementService.updateRiskParameters(tokenAddress, {
  stopLoss: {
    enabled: true,
    percent: settings.stopLossPercent / 100,
    basePrice: allocation.purchasePrice,
    liquidationPercent: 1.0  // 100% liquidation
  },
  takeProfit: {
    enabled: true,
    percent: settings.takeProfitPercent / 100,
    basePrice: allocation.purchasePrice,
    liquidationPercent: 0.5  // 50% liquidation
  }
});

// If trailing stop enabled
if (settings.trailingStopEnabled) {
  await riskManagementService.setTrailingStopLoss(
    tokenAddress,
    settings.trailingStopPercent / 100,
    settings.stopLossPercent / 100,
    { liquidationPercent: 0.75 }  // 75% liquidation
  );
}
```

## Integration with Rebalancing Engine

The Portfolio Settings Service configures the Rebalancing Engine:

```javascript
if (settings.autoRebalanceEnabled) {
  rebalancingEngine.setConfiguration({
    driftThreshold: settings.rebalanceThreshold / 100,
    maxGasPercent: settings.maxGasPercent / 100,
    minTradeValue: settings.minTradeValue
  });
}
```

## Storage

Settings are stored in localStorage with the key format:
```
portfolio_settings_{portfolioId}
```

This allows:
- Per-portfolio settings isolation
- Persistence across sessions
- Easy export/import functionality

## UI Component

The `PortfolioSettings.svelte` component provides:

- Intuitive sliders and inputs for all settings
- Real-time validation
- Visual feedback (color-coded ranges)
- Advanced settings toggle
- Reset to defaults button
- Save/load functionality

### Component Props

```svelte
<PortfolioSettings 
  portfolioId={portfolioId}
  onSave={(settings) => {
    // Handle settings save
  }}
/>
```

## Examples

See `client/src/lib/examples/PortfolioSettingsExample.js` for comprehensive examples including:

1. Basic settings management
2. Applying risk settings
3. Applying rebalancing settings
4. Starting portfolio monitoring
5. Advanced settings with trailing stop
6. Settings validation
7. Export/import settings
8. Multiple portfolios with different settings

## Best Practices

### Conservative Portfolio
```javascript
{
  stopLossPercent: 8,
  takeProfitPercent: 15,
  autoBuyPercent: 3,
  autoRebalanceEnabled: true,
  rebalanceThreshold: 3,
  trailingStopEnabled: false,
  maxGasPercent: 1,
  minTradeValue: 5
}
```

### Moderate Portfolio
```javascript
{
  stopLossPercent: 12,
  takeProfitPercent: 25,
  autoBuyPercent: 5,
  autoRebalanceEnabled: true,
  rebalanceThreshold: 5,
  trailingStopEnabled: true,
  trailingStopPercent: 8,
  maxGasPercent: 2,
  minTradeValue: 10
}
```

### Aggressive Portfolio
```javascript
{
  stopLossPercent: 20,
  takeProfitPercent: 50,
  autoBuyPercent: 10,
  autoRebalanceEnabled: true,
  rebalanceThreshold: 10,
  trailingStopEnabled: true,
  trailingStopPercent: 15,
  maxGasPercent: 3,
  minTradeValue: 20
}
```

## API Reference

### PortfolioSettingsService

#### Methods

- `loadSettings(portfolioId)`: Load settings for a portfolio
- `saveSettings(portfolioId, settings)`: Save settings with validation
- `getSettings(portfolioId)`: Get current settings
- `getDefaultSettings()`: Get default settings template
- `validateSettings(settings)`: Validate settings object
- `applyRiskSettings(portfolioId, portfolio)`: Apply to RiskManagementService
- `applyRebalancingSettings(portfolioId)`: Apply to RebalancingEngine
- `applyAllSettings(portfolioId, portfolio)`: Apply all settings
- `startMonitoring(portfolioId, portfolio)`: Start monitoring with settings
- `stopMonitoring(portfolioId)`: Stop monitoring
- `isMonitoring(portfolioId)`: Check if monitoring
- `getMonitoringStatus(portfolioId)`: Get monitoring status
- `getMonitoredPortfolios()`: Get all monitored portfolio IDs
- `resetSettings(portfolioId)`: Reset to defaults
- `deleteSettings(portfolioId)`: Delete settings
- `exportSettings(portfolioId)`: Export as JSON string
- `importSettings(portfolioId, json)`: Import from JSON string
- `getSettingsSummary(portfolioId)`: Get formatted summary

## Error Handling

The service includes comprehensive error handling:

```javascript
try {
  await portfolioSettingsService.applyAllSettings(portfolioId, portfolio);
} catch (error) {
  if (error.message.includes('validation')) {
    // Handle validation error
  } else if (error.message.includes('not initialized')) {
    // Handle service initialization error
  } else {
    // Handle other errors
  }
}
```

## Testing

Run examples in browser console:
```javascript
// Run all examples
await window.portfolioSettingsExamples.runAllExamples();

// Run specific example
await window.portfolioSettingsExamples.example1_BasicSettingsManagement();
```

## Future Enhancements

Potential future features:
- Time-based settings (different settings for different times)
- Market condition-based adjustments
- Multi-level take-profit (partial exits at different levels)
- Advanced trailing stop strategies (ATR-based, percentage-based)
- Settings templates/presets
- Settings history and rollback
- A/B testing different settings
- Performance analytics per settings configuration
