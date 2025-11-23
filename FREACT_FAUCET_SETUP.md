# FREACT Faucet Setup Guide

## Overview
The FREACT faucet allows users to claim test tokens for your portfolio management dApp. This guide covers deployment and integration.

## What You've Got

### 1. Smart Contract
- **Location**: `contracts/FREACTToken.sol`
- **Features**:
  - 1,000,000 FREACT initial supply
  - Built-in faucet with 1,000 FREACT per claim
  - 24-hour cooldown between claims
  - 10,000 FREACT maximum per address
  - 1 FREACT = $1 USD (for easy calculations)

### 2. Frontend Service
- **Location**: `client/src/lib/services/FREACTFaucetService.js`
- **Features**:
  - Contract interaction methods
  - Gas balance checking
  - Claim status tracking
  - Countdown timers
  - User statistics

### 3. UI Components
- **Faucet Widget**: `client/src/lib/components/FaucetWidget.svelte`
  - Displays balances (FREACT & REACT)
  - Claim button with MetaMask integration
  - Gas warnings and faucet links
  - Countdown timer for next claim
  - Claim history

- **Faucet Page**: `client/src/routes/faucet/+page.svelte`
  - Dedicated faucet page
  - Instructions and rules
  - Useful links
  - Full-featured interface

## Deployment Steps

### Step 1: Deploy FREACT Contract

```bash
# Deploy to Reactive Lasna Testnet
npx hardhat run scripts/deploy-freact.js --network reactiveTestnet
```

This will output the contract address. **Save this address!**

### Step 2: Update Environment Variables

Edit `client/.env` and add the deployed contract address:

```env
VITE_FREACT_CONTRACT_ADDRESS=0xYourContractAddressHere
```

### Step 3: Test the Deployment

```bash
# Run the test script
npx hardhat test test/FREACTToken.test.js --network reactiveTestnet
```

### Step 4: Verify Contract (Optional)

```bash
npx hardhat verify --network reactiveTestnet YOUR_CONTRACT_ADDRESS
```

## Using the Faucet

### For Users:

1. **Connect Wallet**
   - Connect MetaMask to Reactive Lasna Testnet
   - Network: Reactive Lasna Testnet
   - Chain ID: 5318007
   - RPC: https://lasna-rpc.rnk.dev/

2. **Get Gas Tokens**
   - Visit: https://lasna.reactscan.net/faucet
   - Claim free testnet REACT for gas fees
   - You need ~0.01 REACT minimum

3. **Claim FREACT**
   - Visit your dApp's faucet page: `/faucet`
   - Click "Claim 1,000 FREACT"
   - Approve transaction in MetaMask
   - Wait for confirmation

4. **Build Portfolios**
   - Use FREACT to test portfolio features
   - 1 FREACT = $1 USD for easy math

### Faucet Rules:
- ✅ 1,000 FREACT per claim
- ⏰ 24-hour cooldown between claims
- 🎯 10,000 FREACT maximum per address
- 💰 1 FREACT = $1 USD (pegged for simulation)

## Integration Examples

### Add Faucet Widget to Any Page

```svelte
<script>
  import FaucetWidget from '$lib/components/FaucetWidget.svelte';
  
  const FREACT_ADDRESS = import.meta.env.VITE_FREACT_CONTRACT_ADDRESS;
</script>

<FaucetWidget contractAddress={FREACT_ADDRESS} />
```

### Compact Version

```svelte
<FaucetWidget contractAddress={FREACT_ADDRESS} compact={true} />
```

### Check User Balance

```javascript
import { freactFaucetService } from '$lib/services/FREACTFaucetService.js';

// Initialize
await freactFaucetService.initialize(contractAddress);

// Get balance
const balance = await freactFaucetService.getBalance(userAddress);
console.log(`User has ${balance} FREACT`);

// Check if can claim
const canClaim = await freactFaucetService.canClaim(userAddress);
```

## Gas Fee Explanation

### Two Different Tokens:

| Token | Purpose | How to Get |
|-------|---------|------------|
| **REACT** (testnet) | Pay gas fees for transactions | [Reactive Testnet Faucet](https://lasna.reactscan.net/faucet) |
| **FREACT** | Your app's test currency ($1 USD each) | Your faucet contract |

### Transaction Flow:
1. User needs testnet REACT for gas (~0.0001 REACT per tx)
2. User clicks "Claim FREACT"
3. MetaMask prompts: "Pay 0.0001 REACT gas fee"
4. Transaction executes
5. User receives 1,000 FREACT

## Navigation Integration

Add faucet link to your navigation:

```svelte
<nav>
  <a href="/">Home</a>
  <a href="/portfolios">Portfolios</a>
  <a href="/faucet">🎁 Get FREACT</a>
</nav>
```

## Troubleshooting

### "Insufficient REACT for gas"
- User needs testnet REACT tokens
- Direct them to: https://lasna.reactscan.net/faucet
- The widget automatically shows this warning

### "Cannot claim yet"
- User must wait 24 hours between claims
- Widget shows countdown timer automatically

### "Max claim limit reached"
- User has claimed 10,000 FREACT (maximum)
- This is by design to prevent abuse

### Contract not initialized
- Make sure `VITE_FREACT_CONTRACT_ADDRESS` is set in `.env`
- Verify contract is deployed to testnet
- Check network connection

## Admin Functions

### Refill Faucet (Owner Only)

```javascript
// If faucet runs low, owner can mint more
const tx = await contract.refillFaucet(ethers.parseEther('100000'));
await tx.wait();
```

### Emergency Withdraw (Owner Only)

```javascript
// Withdraw tokens from faucet
const tx = await contract.emergencyWithdraw(
  recipientAddress,
  ethers.parseEther('1000')
);
await tx.wait();
```

### Get Faucet Statistics

```javascript
const stats = await freactFaucetService.getFaucetStats();
console.log('Remaining supply:', stats.remainingSupply);
console.log('Total claims:', stats.totalClaims);
console.log('Unique users:', stats.uniqueUsers);
```

## Next Steps

1. ✅ Deploy FREACT contract to testnet
2. ✅ Update `.env` with contract address
3. ✅ Test claiming tokens
4. ✅ Add faucet link to navigation
5. ✅ Update documentation for users
6. ✅ Monitor faucet usage

## Support

- **Reactive Docs**: https://dev.reactive.network/
- **Testnet Explorer**: https://lasna.reactscan.net/
- **Testnet Faucet**: https://lasna.reactscan.net/faucet

---

**Ready to deploy?** Run the deployment script and update your `.env` file!
