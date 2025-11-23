# FREACT Deployment Troubleshooting

## Issue: Deployment Hangs Forever

Your deployment is hanging because the transaction is not being confirmed on the testnet. Here are the steps to debug and fix:

### Step 1: Test RPC Connection
```bash
npx hardhat run scripts/test-rpc.js --network reactiveTestnet
```

This will verify:
- RPC endpoint is responding
- You can query the blockchain
- Gas estimation works
- Your account has balance

### Step 2: Try Minimal Deployment
```bash
npx hardhat run scripts/deploy-freact-minimal.js --network reactiveTestnet
```

This script:
- Has a 60-second timeout
- Shows the transaction hash immediately
- Provides explorer links to check status
- Won't hang forever

### Step 3: Check Transaction on Explorer

If you get a transaction hash, check it on the explorer:
```
https://lasna.reactscan.net/tx/YOUR_TX_HASH
```

### Common Issues & Solutions

#### 1. Transaction Stuck in Mempool
**Symptoms:** Transaction hash appears but never confirms

**Solutions:**
- Wait longer (testnet can be slow)
- Increase gas price in hardhat.config.js
- Try deploying at a different time

#### 2. RPC Endpoint Not Responding
**Symptoms:** Script hangs before showing transaction hash

**Solutions:**
- Try alternative RPC: `https://lasna-rpc.rnk.dev/`
- Check testnet status on Discord/Telegram
- Wait and try again later

#### 3. Gas Estimation Fails
**Symptoms:** Error before deployment starts

**Solutions:**
- Manually set gasLimit in deployment script
- Check if contract compiles correctly
- Verify account has enough REACT tokens

### Alternative: Deploy Without Waiting

If the testnet is slow, you can deploy and not wait for confirmation:

```javascript
// In your script
const freactToken = await FREACTToken.deploy();
const txHash = freactToken.deploymentTransaction().hash;
console.log("Transaction:", txHash);
// Don't wait, just exit
process.exit(0);
```

Then check the transaction status manually on the explorer.

### Recommended Approach

1. Run `test-rpc.js` to verify connectivity
2. Run `deploy-freact-minimal.js` to deploy with timeout
3. If it times out, check the transaction hash on the explorer
4. If transaction succeeds, manually note the contract address
5. Update your .env files with the contract address

### Manual Contract Address Update

If deployment succeeds but script times out, add to `.env`:
```
VITE_FREACT_TOKEN_ADDRESS=0xYourContractAddress
```

And to `client/.env`:
```
VITE_FREACT_TOKEN_ADDRESS=0xYourContractAddress
```
