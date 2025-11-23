# FREACT Token Deployment Guide

## Overview

This guide walks through deploying the FREACT (Fake React) token to the Reactive testnet. FREACT is a test token designed for simulation mode with built-in faucet functionality.

## Token Specifications

- **Name**: Fake React
- **Symbol**: FREACT
- **Decimals**: 18
- **Initial Supply**: 1,000,000 FREACT
- **Pegged Value**: 1 FREACT = 1 USD (for easy calculations)
- **Network**: Reactive Testnet (Kopli)

## Faucet Configuration

- **Claim Amount**: 1,000 FREACT per claim
- **Cooldown Period**: 24 hours between claims
- **Max Per Address**: 10,000 FREACT total
- **Distribution**: Frontend-controlled (no external faucet needed)

## Prerequisites

### 1. Get Testnet REACT Tokens

You need testnet REACT tokens to pay for gas fees. Get them from the Reactive testnet faucet:

1. Visit: https://kopli.reactscan.net/faucet (or check Reactive documentation for faucet URL)
2. Enter your wallet address
3. Request testnet REACT tokens

### 2. Configure Environment

Add your private key to the `.env` file:

```bash
# Add to .env file (DO NOT commit this file!)
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Testnet configuration (already set)
VITE_REACTIVE_RPC=https://kopli-rpc.reactive.network
VITE_REACTIVE_CHAIN_ID=5318008
```

**⚠️ SECURITY WARNING**: Never commit your private key to version control!

## Deployment Steps

### Step 1: Compile the Contract

```bash
npx hardhat compile
```

This should compile successfully with no errors.

### Step 2: Run Tests (Optional but Recommended)

```bash
npx hardhat test test/FREACTToken.test.js
```

All 21 tests should pass.

### Step 3: Deploy to Testnet

```bash
npx hardhat run scripts/deploy-freact.js --network reactiveTestnet
```

The deployment script will:
1. Deploy the FREACT token contract
2. Test a faucet claim
3. Save deployment info to `deployments.json`
4. Update environment files with the token address
5. Display contract information and next steps

### Step 4: Verify Deployment

After deployment, you'll see output like:

```
✅ FREACTToken deployed to: 0x...

📊 Token Information:
   Name: Fake React
   Symbol: FREACT
   Decimals: 18
   Total Supply: 1000000.0 FREACT
   Faucet Balance: 999000.0 FREACT

🚰 Faucet Configuration:
   Claim Amount: 1000.0 FREACT
   Max Per Address: 10000.0 FREACT
   Cooldown Period: 24 hours
```

### Step 5: Verify Contract on Block Explorer

Visit the Reactive testnet block explorer:

```
https://kopli.reactscan.net/address/[YOUR_CONTRACT_ADDRESS]
```

You can verify the contract source code using:

```bash
npx hardhat verify --network reactiveTestnet [CONTRACT_ADDRESS]
```

## Post-Deployment Configuration

The deployment script automatically updates:

1. **Root `.env` file**: Adds `VITE_FREACT_TOKEN_ADDRESS`
2. **Root `.env.example` file**: Adds example configuration
3. **Client `.env` file**: Adds token address for frontend
4. **Client `.env.example` file**: Adds example configuration
5. **`deployments.json`**: Saves complete deployment information

## Testing the Faucet

### From Hardhat Console

```bash
npx hardhat console --network reactiveTestnet
```

```javascript
const FREACTToken = await ethers.getContractFactory("FREACTToken");
const freact = await FREACTToken.attach("YOUR_CONTRACT_ADDRESS");

// Check if you can claim
await freact.canClaim("YOUR_ADDRESS");

// Claim tokens
await freact.claim();

// Check balance
const balance = await freact.balanceOf("YOUR_ADDRESS");
console.log(ethers.formatEther(balance), "FREACT");
```

### From Frontend (After Integration)

The frontend will provide a "Claim FREACT" button that calls the `claim()` function.

## Contract Functions

### User Functions

- `claim()`: Claim 1000 FREACT (24hr cooldown)
- `canClaim(address)`: Check if address can claim
- `getNextClaimTime(address)`: Get next available claim time
- `getRemainingAllowance(address)`: Get remaining claimable amount
- `getClaimHistory(address)`: Get claim history for address
- `getFaucetStats()`: Get overall faucet statistics

### Owner Functions (Admin Only)

- `refillFaucet(uint256 amount)`: Add more FREACT to faucet
- `emergencyWithdraw(address to, uint256 amount)`: Emergency withdrawal

## Troubleshooting

### "Insufficient funds for gas"

- Make sure you have testnet REACT tokens
- Get more from the faucet

### "FREACT: Cannot claim yet"

- You must wait 24 hours between claims
- Check `getNextClaimTime()` to see when you can claim again

### "FREACT: Max claim limit reached"

- Each address can only claim 10,000 FREACT total
- Use a different address or ask admin to refill your allowance

### "FREACT: Faucet empty"

- The faucet has run out of tokens
- Contact the contract owner to refill

## Network Configuration

### Reactive Testnet (Kopli)

- **Chain ID**: 5318008
- **RPC URL**: https://kopli-rpc.reactive.network
- **Block Explorer**: https://kopli.reactscan.net
- **Native Token**: REACT (testnet)

### Adding to MetaMask

The frontend will automatically prompt users to add the network, but you can add it manually:

1. Open MetaMask
2. Click "Add Network"
3. Enter the details above
4. Save

## Integration with Frontend

After deployment, the frontend can:

1. **Display FREACT Balance**: Show user's FREACT balance
2. **Claim Button**: Allow users to claim from faucet
3. **Cooldown Timer**: Show time until next claim
4. **Portfolio Creation**: Use FREACT to create simulation portfolios
5. **Trading**: Buy/sell assets using FREACT

## Security Considerations

- ✅ Built-in rate limiting (24hr cooldown)
- ✅ Maximum claim limit per address (10,000 FREACT)
- ✅ Owner-only admin functions
- ✅ Emergency withdrawal capability
- ✅ No real value (testnet only)

## Next Steps

After successful deployment:

1. ✅ Contract deployed and verified
2. ⏭️ Implement FREACTTokenService (Task 4)
3. ⏭️ Implement FREACTFaucetService (Task 5)
4. ⏭️ Create simulation portfolio contract (Task 6)
5. ⏭️ Update frontend UI for FREACT integration

## Support

For issues or questions:
- Check the Reactive Network documentation
- Review the contract source code in `contracts/FREACTToken.sol`
- Run tests to verify functionality
- Check deployment logs in `deployments.json`
