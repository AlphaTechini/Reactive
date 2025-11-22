# Portfolio Contract Integration

This document explains how the frontend integrates with the EnhancedPortfolioManager smart contract for on-chain portfolio management.

## Overview

The portfolio management system uses a hybrid approach:
- **Off-chain storage**: Portfolio metadata (name, description, UI preferences) stored in backend API
- **On-chain storage**: Portfolio allocations and risk parameters stored on blockchain via smart contract

This provides the best of both worlds: fast UI updates with off-chain data, and trustless, transparent portfolio management with on-chain data.

## Architecture

```
┌─────────────────┐
│   Frontend UI   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────────────────────┐
│ API  │  │ PortfolioContract     │
│Store │  │ Service               │
└──────┘  └───────┬───────────────┘
                  │
          ┌───────▼────────────────┐
          │ EnhancedPortfolio      │
          │ Manager Contract       │
          └────────────────────────┘
```

## Key Components

### 1. PortfolioContractService

Located at: `client/src/lib/services/PortfolioContractService.js`

Main service for interacting with the smart contract. Provides methods for:
- Creating portfolios on-chain
- Reading portfolio allocations
- Updating allocations
- Setting risk parameters (stop-loss, take-profit)
- Getting token information and prices
- Subscribing to contract events

### 2. Smart Contract Integration Points

#### Portfolio Creation Flow

1. User creates portfolio in UI (stored off-chain)
2. User selects tokens and sets allocations
3. User clicks "Save to Blockchain"
4. `portfolioContractService.createPortfolio()` is called
5. MetaMask prompts for transaction approval
6. Transaction is mined and portfolio is stored on-chain
7. UI updates with transaction hash and block number

#### Portfolio Management Flow

1. User loads portfolio page
2. `portfolioContractService.getPortfolioAllocation()` fetches on-chain data
3. UI displays both off-chain metadata and on-chain allocations
4. User can modify allocations
5. Changes are saved to blockchain via `updatePortfolioAllocation()`
6. Contract events notify UI of successful updates

#### Risk Management Flow

1. User configures stop-loss and take-profit percentages
2. Settings saved locally (fast)
3. User clicks "Save to Blockchain"
4. `portfolioContractService.setRiskParameters()` is called
5. Contract stores risk parameters on-chain
6. Automation controller can read these parameters for automated trading

## Contract Functions Used

### Portfolio Allocation

```javascript
// Create/update portfolio allocation
setPortfolioAllocation(address[] tokens, uint256[] allocations)

// Get user's allocated tokens
getUserAllocatedTokens(address user) returns (address[])

// Get allocation for specific token
getUserTokenAllocation(address user, address token) returns (uint256)
```

### Risk Management

```javascript
// Set stop-loss percentage
setStopLoss(uint256 percentage)

// Set take-profit percentage
setTakeProfit(uint256 percentage)

// Get risk parameters
getUserRiskParameters(address user) returns (uint256 stopLoss, uint256 takeProfit, bool panicMode)
```

### Token Information

```javascript
// Get supported tokens
getSupportedTokens() returns (address[])

// Get token details
getTokenInfo(address token) returns (TokenInfo)

// Get token prices
getBatchTokenPrices(address[] tokens) returns (uint256[])
```

## Data Format

### Allocations

Allocations are stored as **basis points** (1 basis point = 0.01%):
- Frontend: `40%` → Contract: `4000` basis points
- Contract: `4000` basis points → Frontend: `40%`

The service handles this conversion automatically.

### Token Allocation Structure

```javascript
{
  address: "0x1234...",  // Token contract address
  symbol: "WETH",        // Token symbol (from contract)
  allocation: 40,        // Percentage (0-100)
  decimals: 18           // Token decimals
}
```

### Risk Parameters Structure

```javascript
{
  stopLoss: 10,      // 10% stop-loss
  takeProfit: 25,    // 25% take-profit
  panicMode: false   // Emergency mode status
}
```

## Event Handling

The service subscribes to contract events for real-time updates:

```javascript
portfolioContractService.subscribeToEvents({
  onAllocationUpdated: (event) => {
    // Handle portfolio allocation update
    console.log('Portfolio updated:', event);
  },
  
  onRiskParametersSet: (event) => {
    // Handle risk parameter update
    console.log('Risk params updated:', event);
  }
});
```

## Error Handling

The service provides user-friendly error messages:

```javascript
try {
  await portfolioContractService.createPortfolio(allocations);
} catch (error) {
  // Error messages are formatted for users:
  // - "Transaction was rejected by user"
  // - "Insufficient funds for transaction"
  // - "Total allocation must equal 100%"
  // - "One or more tokens are not supported"
  console.error(error.message);
}
```

## Usage Examples

### Create Portfolio

```javascript
import { portfolioContractService } from '$lib/services/PortfolioContractService.js';

const allocations = [
  { address: '0xWETH...', allocation: 40 },
  { address: '0xUSDC...', allocation: 30 },
  { address: '0xDAI...', allocation: 30 }
];

const result = await portfolioContractService.createPortfolio(allocations);
console.log('Created! TX:', result.transactionHash);
```

### Get Portfolio

```javascript
const userAddress = '0x...';
const allocations = await portfolioContractService.getPortfolioAllocation(userAddress);

allocations.forEach(alloc => {
  console.log(`${alloc.symbol}: ${alloc.allocation}%`);
});
```

### Set Risk Parameters

```javascript
await portfolioContractService.setRiskParameters({
  stopLoss: 10,    // 10%
  takeProfit: 25   // 25%
});
```

### Get Token Prices

```javascript
const tokenAddresses = ['0xWETH...', '0xUSDC...'];
const prices = await portfolioContractService.getTokenPrices(tokenAddresses);

console.log('WETH price:', prices['0xWETH...']);
```

## Integration with UI Components

### Portfolio Creation Page

`client/src/routes/create-portfolio/+page.svelte`

- Creates portfolio metadata off-chain
- Redirects to portfolio management page
- On-chain creation happens when user sets allocations

### Portfolio Management Page

`client/src/routes/portfolio/[id]/+page.svelte`

- Loads on-chain allocations on mount
- Provides "Save to Blockchain" button
- Syncs local state with blockchain data
- Subscribes to contract events for updates

### Portfolio Settings Component

`client/src/lib/components/PortfolioSettings.svelte`

- Loads risk parameters from blockchain
- Provides "Save to Blockchain" button for risk settings
- Shows on-chain status indicator

## Environment Configuration

Set the contract address in your `.env` file:

```bash
# Enhanced Portfolio Manager contract address
VITE_ENHANCED_PORTFOLIO_MANAGER_ADDRESS=0x...

# Or use the generic contract address variable
VITE_CONTRACT_ADDRESS=0x...
```

## Testing

See `client/src/lib/examples/PortfolioContractServiceExample.js` for comprehensive usage examples.

## Security Considerations

1. **Transaction Approval**: All state-changing operations require MetaMask approval
2. **Validation**: Allocations are validated to sum to 100% before submission
3. **Error Handling**: All contract errors are caught and formatted for users
4. **Event Verification**: Contract events are used to verify successful transactions
5. **Read-Only Fallback**: Service can operate in read-only mode if wallet not connected

## Future Enhancements

- [ ] Batch operations for gas optimization
- [ ] Transaction queue management
- [ ] Offline transaction signing
- [ ] Multi-signature support
- [ ] Gas price estimation and optimization
- [ ] Transaction history tracking
- [ ] Portfolio snapshots on-chain

## Troubleshooting

### "Wallet not connected" error
- Ensure MetaMask is installed and connected
- Check that wallet is on the correct network

### "Token not supported" error
- Verify token addresses are correct
- Check that tokens are added to the contract via `addToken()`

### "Total allocation must equal 100%" error
- Verify allocations sum to exactly 100%
- Check for rounding errors in percentage calculations

### Transaction fails with "gas" error
- Increase gas limit in MetaMask
- Check wallet has sufficient funds for gas

### Events not firing
- Ensure contract service is initialized
- Check that event subscription was successful
- Verify wallet is connected

## Support

For issues or questions:
1. Check the examples in `PortfolioContractServiceExample.js`
2. Review contract ABI in `PortfolioContractService.js`
3. Check browser console for detailed error messages
4. Verify contract deployment in `deployments.json`
