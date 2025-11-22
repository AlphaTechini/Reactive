# Blockchain Integration Testing Guide

This guide helps you test the smart contract integration for portfolio management.

## Prerequisites

1. **MetaMask installed** and configured
2. **Wallet connected** to the correct network (Reactive Network)
3. **Contract deployed** and address set in environment variables
4. **Test tokens** available in your wallet
5. **Gas tokens** (REACT) for transaction fees

## Environment Setup

Ensure your `.env` file has the correct contract address:

```bash
VITE_ENHANCED_PORTFOLIO_MANAGER_ADDRESS=0x...
VITE_REACTIVE_CHAIN_ID=1597
VITE_REACTIVE_NETWORK=reactive
```

## Test Scenarios

### 1. Portfolio Creation Flow

**Steps:**
1. Navigate to home page (`/`)
2. Connect MetaMask wallet
3. Click "Create Portfolio"
4. Fill in portfolio details:
   - Name: "Test Portfolio"
   - Description: "Testing blockchain integration"
   - Deposit: 1.0 REACT
5. Click "Create Portfolio"
6. Verify redirect to portfolio management page

**Expected Results:**
- ✅ Portfolio created in backend
- ✅ Portfolio ID generated
- ✅ Redirect to `/portfolio/[id]`
- ✅ `onChain: false` initially

### 2. Token Selection and Allocation

**Steps:**
1. On portfolio management page
2. Select 3 tokens from the list
3. Set allocations:
   - Token 1: 40%
   - Token 2: 35%
   - Token 3: 25%
4. Click "Auto Distribute" to test equal distribution
5. Manually adjust to desired percentages
6. Click "Save Allocations" (saves to backend)

**Expected Results:**
- ✅ Total allocation shows 100%
- ✅ No validation errors
- ✅ Allocations saved to backend
- ✅ Success notification shown

### 3. Save to Blockchain

**Steps:**
1. After setting allocations, click "Save to Blockchain"
2. MetaMask popup appears
3. Review transaction details:
   - Gas estimate
   - Token addresses
   - Allocation values (in basis points)
4. Approve transaction
5. Wait for confirmation

**Expected Results:**
- ✅ MetaMask shows transaction
- ✅ Transaction submitted successfully
- ✅ "Waiting for confirmation" notification
- ✅ Success notification after mining
- ✅ Transaction hash displayed
- ✅ `onChain: true` in portfolio data
- ✅ Block number recorded

**Check Blockchain:**
```javascript
// In browser console
const service = await import('./src/lib/services/PortfolioContractService.js');
const allocations = await service.portfolioContractService.getPortfolioAllocation('YOUR_ADDRESS');
console.log('On-chain allocations:', allocations);
```

### 4. Load On-Chain Portfolio

**Steps:**
1. Refresh the portfolio page
2. Observe loading states
3. Check that allocations are loaded from blockchain

**Expected Results:**
- ✅ Loading indicator shown
- ✅ On-chain data fetched
- ✅ Allocations match what was saved
- ✅ Token symbols displayed correctly
- ✅ Percentages match (converted from basis points)

### 5. Update Portfolio Allocation

**Steps:**
1. Modify existing allocations:
   - Token 1: 50% (was 40%)
   - Token 2: 30% (was 35%)
   - Token 3: 20% (was 25%)
2. Click "Save to Blockchain"
3. Approve transaction in MetaMask
4. Wait for confirmation

**Expected Results:**
- ✅ Update transaction submitted
- ✅ New allocations saved on-chain
- ✅ `PortfolioRebalanced` event emitted
- ✅ UI updates with new values
- ✅ New transaction hash recorded

### 6. Risk Parameters - Stop Loss

**Steps:**
1. Scroll to "Portfolio Settings" section
2. Set stop-loss: 10%
3. Click "Save Settings" (saves locally)
4. Click "Save to Blockchain"
5. Approve transaction in MetaMask

**Expected Results:**
- ✅ Local save succeeds immediately
- ✅ Blockchain transaction submitted
- ✅ `StopLossSet` event emitted
- ✅ Stop-loss stored on-chain
- ✅ Success notification shown

**Verify:**
```javascript
// In browser console
const service = await import('./src/lib/services/PortfolioContractService.js');
const riskParams = await service.portfolioContractService.getRiskParameters('YOUR_ADDRESS');
console.log('Stop Loss:', riskParams.stopLoss + '%');
```

### 7. Risk Parameters - Take Profit

**Steps:**
1. Set take-profit: 25%
2. Click "Save to Blockchain"
3. Approve transaction

**Expected Results:**
- ✅ Transaction submitted
- ✅ `TakeProfitSet` event emitted
- ✅ Take-profit stored on-chain

### 8. Sync from Blockchain

**Steps:**
1. Clear local allocations (or use different browser)
2. Load portfolio page
3. Click "Sync from Blockchain" button
4. Observe data loading

**Expected Results:**
- ✅ Allocations loaded from blockchain
- ✅ Local state updated
- ✅ UI reflects blockchain data
- ✅ Success notification shown

### 9. Event Subscriptions

**Steps:**
1. Open browser console
2. Keep portfolio page open
3. In another tab/window, update portfolio
4. Observe console logs in first tab

**Expected Results:**
- ✅ Event logged in console
- ✅ Notification shown in UI
- ✅ Data automatically refreshed

### 10. Error Handling - Invalid Allocation

**Steps:**
1. Set allocations that don't sum to 100%:
   - Token 1: 40%
   - Token 2: 40%
   - (Total: 80%)
2. Try to save to blockchain

**Expected Results:**
- ✅ Validation error shown
- ✅ "Total allocation must equal 100%" message
- ✅ Transaction not submitted
- ✅ No MetaMask popup

### 11. Error Handling - Transaction Rejection

**Steps:**
1. Set valid allocations
2. Click "Save to Blockchain"
3. Reject transaction in MetaMask

**Expected Results:**
- ✅ "Transaction was rejected by user" message
- ✅ No error thrown
- ✅ UI remains functional
- ✅ Can retry transaction

### 12. Error Handling - Insufficient Gas

**Steps:**
1. Ensure wallet has very low gas balance
2. Try to save to blockchain
3. Observe error handling

**Expected Results:**
- ✅ "Insufficient funds" error shown
- ✅ User-friendly message displayed
- ✅ Suggestion to add funds

### 13. Multiple Portfolios

**Steps:**
1. Create second portfolio
2. Set different allocations
3. Save to blockchain
4. Switch between portfolios
5. Verify each loads correct data

**Expected Results:**
- ✅ Each portfolio has separate on-chain data
- ✅ Switching portfolios loads correct allocations
- ✅ No data mixing between portfolios

### 14. Token Price Queries

**Steps:**
1. Open browser console
2. Query token prices:

```javascript
const service = await import('./src/lib/services/PortfolioContractService.js');
const tokens = ['0xWETH...', '0xUSDC...'];
const prices = await service.portfolioContractService.getTokenPrices(tokens);
console.log('Prices:', prices);
```

**Expected Results:**
- ✅ Prices returned from contract
- ✅ Values in correct format (18 decimals)
- ✅ Stablecoins show ~$1.00

### 15. Supported Tokens Query

**Steps:**
```javascript
const service = await import('./src/lib/services/PortfolioContractService.js');
const tokens = await service.portfolioContractService.getSupportedTokens();
console.log('Supported tokens:', tokens);
```

**Expected Results:**
- ✅ List of supported tokens returned
- ✅ Each token has symbol, decimals, category
- ✅ Matches contract configuration

## Performance Testing

### Load Time Test

**Measure:**
1. Time to load portfolio page
2. Time to fetch on-chain data
3. Time to display complete portfolio

**Targets:**
- Page load: < 2 seconds
- Blockchain fetch: < 3 seconds
- Total time: < 5 seconds

### Transaction Time Test

**Measure:**
1. Time from "Save to Blockchain" click to MetaMask popup
2. Time from approval to confirmation
3. Time from confirmation to UI update

**Typical Times:**
- MetaMask popup: < 1 second
- Transaction mining: 10-30 seconds (network dependent)
- UI update: < 1 second after confirmation

## Debugging

### Enable Verbose Logging

```javascript
// In browser console
localStorage.setItem('DEBUG', 'portfolio:*');
```

### Check Contract Connection

```javascript
const service = await import('./src/lib/services/PortfolioContractService.js');
await service.portfolioContractService.initialize();
console.log('Contract initialized');
```

### View Contract Events

```javascript
const service = await import('./src/lib/services/PortfolioContractService.js');
const unsubscribe = service.portfolioContractService.subscribeToEvents({
  onAllocationUpdated: (e) => console.log('Allocation updated:', e),
  onRiskParametersSet: (e) => console.log('Risk params set:', e)
});
// Later: unsubscribe();
```

### Check Wallet Connection

```javascript
import { walletAddress } from './src/lib/stores/wallet.js';
import { get } from 'svelte/store';
console.log('Wallet address:', get(walletAddress));
```

## Common Issues

### Issue: "Wallet not connected"
**Solution:** 
- Ensure MetaMask is installed
- Click "Connect Wallet" button
- Approve connection in MetaMask

### Issue: "Contract not found"
**Solution:**
- Check `VITE_ENHANCED_PORTFOLIO_MANAGER_ADDRESS` in `.env`
- Verify contract is deployed to current network
- Check network in MetaMask matches app network

### Issue: "Token not supported"
**Solution:**
- Verify token address is correct
- Check token is added to contract via `addToken()`
- Use only tokens from `getSupportedTokens()`

### Issue: Transaction fails silently
**Solution:**
- Check browser console for errors
- Verify gas limit is sufficient
- Check wallet has enough gas tokens
- Try increasing gas limit in MetaMask

### Issue: Events not firing
**Solution:**
- Verify event subscription was successful
- Check wallet is connected
- Ensure contract service is initialized
- Try refreshing page

## Success Criteria

All tests pass when:

- ✅ Portfolio can be created on-chain
- ✅ Allocations are stored and retrieved correctly
- ✅ Risk parameters are saved to blockchain
- ✅ Updates are reflected on-chain
- ✅ Events fire and UI updates automatically
- ✅ Error handling works for all edge cases
- ✅ Multiple portfolios work independently
- ✅ Token queries return correct data
- ✅ Performance meets targets
- ✅ No console errors during normal operation

## Next Steps

After successful testing:

1. Document any issues found
2. Create bug reports for failures
3. Optimize gas usage if needed
4. Add more comprehensive error messages
5. Implement suggested enhancements
6. Proceed to Task 11 (Manual Trading)

## Support

For issues during testing:
1. Check browser console for errors
2. Review `PORTFOLIO_CONTRACT_INTEGRATION.md`
3. Check examples in `PortfolioContractServiceExample.js`
4. Verify contract deployment in `deployments.json`
5. Test with different wallets/accounts
