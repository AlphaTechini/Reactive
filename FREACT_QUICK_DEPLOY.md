# FREACT Token - Quick Deployment Reference

## 🚀 Quick Deploy (3 Steps)

### 1. Setup
```bash
# Add to .env file
PRIVATE_KEY=your_private_key_without_0x

# Get testnet tokens from faucet
# Visit: https://kopli.reactscan.net/faucet
```

### 2. Deploy
```bash
npx hardhat run scripts/deploy-freact.js --network reactiveTestnet
```

### 3. Verify
```bash
npx hardhat verify --network reactiveTestnet [CONTRACT_ADDRESS]
```

## 📋 Token Info

- **Symbol**: FREACT
- **Supply**: 1,000,000 FREACT
- **Claim**: 1,000 FREACT per claim
- **Cooldown**: 24 hours
- **Max/Address**: 10,000 FREACT
- **Value**: 1 FREACT = 1 USD

## 🧪 Test First (Optional)

```bash
npx hardhat test test/FREACTToken.test.js
```

Expected: 21 passing tests

## 📍 Network Details

- **Chain ID**: 5318008
- **RPC**: https://kopli-rpc.reactive.network
- **Explorer**: https://kopli.reactscan.net

## ✅ What Happens Automatically

After deployment, the script will:
- ✅ Deploy contract
- ✅ Test faucet claim
- ✅ Update `.env` files
- ✅ Save to `deployments.json`
- ✅ Display contract info

## 🔗 Contract Functions

**Users:**
- `claim()` - Get 1000 FREACT
- `canClaim(address)` - Check if can claim
- `balanceOf(address)` - Check balance

**Owner:**
- `refillFaucet(amount)` - Add more tokens
- `emergencyWithdraw(to, amount)` - Emergency access

## 📖 Full Guide

See `FREACT_DEPLOYMENT_GUIDE.md` for complete documentation.
