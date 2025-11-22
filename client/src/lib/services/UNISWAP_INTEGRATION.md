# Uniswap V3 SDK Integration

This document describes the Uniswap V3 SDK integration for token swaps in the Reactive Portfolio Manager.

## Overview

The `UniswapSwapService` provides a comprehensive interface for executing token swaps using the Uniswap V3 protocol. It handles:

- Single token swaps
- Multi-token portfolio swaps
- Quote generation
- Gas estimation
- Slippage protection
- Progress tracking

## Installation

The required dependencies are already included in `package.json`:

```json
{
  "@uniswap/sdk-core": "^5.3.1",
  "@uniswap/v3-sdk": "^3.13.1"
}
```

## Configuration

Set the following environment variables in `.env`:

```env
VITE_UNISWAP_V3_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
VITE_UNISWAP_V3_QUOTER=0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
```

## Usage

### Basic Swap

```javascript
import { uniswapSwapService } from '$lib/services/UniswapSwapService.js';

// Initialize the service
await uniswapSwapService.initialize();

// Execute a swap
const result = await uniswapSwapService.executeSwap(
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  slippagePercent, // e.g., 1 for 1%
  feeTier // optional, defaults to MEDIUM (0.3%)
);

console.log('Swap completed:', result.transactionHash);
```

### Get Quote

```javascript
// Get a quote before swapping
const quote = await uniswapSwapService.getQuote(
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  feeTier
);

console.log('Expected output:', quote.amountOut);
console.log('Price impact:', quote.priceImpact);
```

### Portfolio Swaps

```javascript
// Define allocations
const allocations = [
  {
    tokenAddress: '0x...',
    tokenSymbol: 'BTC',
    tokenName: 'Bitcoin',
    percentage: 40
  },
  {
    tokenAddress: '0x...',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    percentage: 60
  }
];

// Execute swaps with progress tracking
const result = await uniswapSwapService.executePortfolioSwaps(
  depositAmount,
  allocations,
  slippagePercent,
  (progress) => {
    console.log(`${progress.token}: ${progress.message}`);
    console.log(`Progress: ${progress.progress}%`);
  }
);

console.log('Completed:', result.completed);
console.log('Failed:', result.failed);
```

### Gas Estimation

```javascript
const gasEstimate = await uniswapSwapService.estimateSwapGas(
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  slippagePercent
);

console.log('Estimated gas:', gasEstimate.gasLimit);
console.log('Estimated cost:', gasEstimate.estimatedCost, 'ETH');
```

## Fee Tiers

Uniswap V3 supports multiple fee tiers:

```javascript
import { FEE_TIERS } from '$lib/services/UniswapSwapService.js';

FEE_TIERS.LOWEST  // 0.01% (100)
FEE_TIERS.LOW     // 0.05% (500)
FEE_TIERS.MEDIUM  // 0.3% (3000) - default
FEE_TIERS.HIGH    // 1% (10000)
```

Choose the appropriate fee tier based on:
- Token pair liquidity
- Expected price impact
- Trading volume

## Components

### SwapProgressModal

A Svelte component for displaying swap progress:

```svelte
<script>
  import SwapProgressModal from '$lib/components/SwapProgressModal.svelte';
  
  let showModal = false;
  let swapProgress = [];
  let totalProgress = 0;
</script>

<SwapProgressModal 
  isOpen={showModal}
  swaps={swapProgress}
  totalProgress={totalProgress}
  onClose={() => showModal = false}
/>
```

### Swap Helper Utilities

```javascript
import SwapHelper from '$lib/utils/SwapHelper.js';

// Calculate token amounts
const amounts = SwapHelper.calculateTokenAmounts(totalDeposit, allocations);

// Validate allocations
const isValid = SwapHelper.validateAllocations(allocations);

// Auto-distribute equally
const allocations = SwapHelper.autoDistributeEqual(selectedTokens);

// Estimate gas for multiple swaps
const gasEstimate = SwapHelper.estimateMultiSwapGas(swapCount);
```

## Error Handling

The service provides comprehensive error handling:

```javascript
try {
  const result = await uniswapSwapService.executeSwap(...);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    // Handle insufficient balance
  } else if (error.message.includes('slippage')) {
    // Handle slippage exceeded
  } else if (error.message.includes('user rejected')) {
    // Handle user rejection
  } else {
    // Handle other errors
  }
}
```

## Progress Tracking

Portfolio swaps support real-time progress tracking:

```javascript
const result = await uniswapSwapService.executePortfolioSwaps(
  depositAmount,
  allocations,
  slippagePercent,
  (progress) => {
    switch (progress.status) {
      case 'pending':
        // Swap is queued
        break;
      case 'swapping':
        // Swap is in progress
        break;
      case 'completed':
        // Swap completed successfully
        break;
      case 'error':
        // Swap failed
        console.error(progress.error);
        break;
    }
  }
);
```

## Integration with Portfolio Pages

### Portfolio Management Page

The portfolio management page (`/portfolio/[id]`) integrates swap functionality:

1. User selects tokens and sets allocations
2. User saves allocations
3. User clicks "Execute Token Swaps"
4. SwapProgressModal shows real-time progress
5. Portfolio is updated with swap results

### Create Portfolio Page

The create portfolio page can optionally execute swaps immediately after creation.

## Best Practices

1. **Always get a quote first** - Check expected output before executing
2. **Use appropriate slippage** - 1% for stable pairs, 2-5% for volatile pairs
3. **Handle errors gracefully** - Some swaps may fail, handle partial success
4. **Sort by size** - Execute larger swaps first for better execution
5. **Monitor gas costs** - Estimate gas before executing multiple swaps
6. **Use correct fee tier** - Higher liquidity pairs can use lower fees
7. **Validate allocations** - Ensure percentages sum to 100%
8. **Track progress** - Provide user feedback during multi-swap execution

## Troubleshooting

### "Insufficient liquidity" error
- Try a different fee tier
- Reduce swap amount
- Check if pool exists for token pair

### "Slippage exceeded" error
- Increase slippage tolerance
- Wait for better market conditions
- Split large swaps into smaller ones

### "Transaction failed" error
- Check token approvals
- Verify sufficient balance
- Ensure correct token addresses

### Gas estimation fails
- Use default gas limit (300,000)
- Check network congestion
- Verify token contracts are valid

## Examples

See `client/src/lib/examples/UniswapSwapServiceExample.js` for comprehensive examples including:

- Single swap execution
- Quote generation
- Portfolio swaps with progress tracking
- Gas estimation
- Error handling
- Fee tier comparison
- Complete workflow

## Architecture

```
UniswapSwapService
├── initialize() - Set up provider and signer
├── getQuote() - Get swap quote from Quoter contract
├── approveToken() - Approve token spending
├── executeSwap() - Execute single swap
├── executePortfolioSwaps() - Execute multiple swaps
└── estimateSwapGas() - Estimate gas cost

SwapProgressModal (Svelte Component)
├── Progress bar
├── Swap list with status
├── Error handling
└── Transaction links

SwapHelper (Utilities)
├── calculateTokenAmounts()
├── validateAllocations()
├── autoDistributeEqual()
├── estimateMultiSwapGas()
└── sortAllocationsBySize()
```

## Testing

Test the integration in simulation mode first:

```javascript
import { appMode } from '$lib/stores/appMode.js';

// Set to simulation mode
appMode.set('simulation');

// Test swaps without real transactions
await uniswapSwapService.executePortfolioSwaps(...);

// Switch to live mode for real swaps
appMode.set('live');
```

## Future Enhancements

- [ ] Multi-hop swaps for better prices
- [ ] Automatic fee tier selection
- [ ] Price impact warnings
- [ ] Swap history tracking
- [ ] Failed swap retry mechanism
- [ ] Batch swap optimization
- [ ] MEV protection
- [ ] Limit orders support

## Support

For issues or questions:
1. Check the examples in `UniswapSwapServiceExample.js`
2. Review error messages in browser console
3. Verify environment variables are set correctly
4. Ensure wallet is connected and has sufficient balance
5. Check Uniswap V3 documentation: https://docs.uniswap.org/sdk/v3/overview
