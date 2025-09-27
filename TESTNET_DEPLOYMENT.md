# Reactive DeFi Portfolio Manager - Testnet Deployment Guide

## 🌟 Overview

This project has been updated to use **Reactive Testnet** with **mock trading** and **webhook-triggered contract reactions**. No real funds are used - everything runs on free testnet tokens with percentage-based price movements.

## 🚀 Key Features

- **Testnet Deployment**: Uses Reactive Network testnet (free gas tokens)
- **Mock Trading**: Percentage-based price movements (no real swaps)
- **Webhook Triggers**: Smart contracts react via webhooks when conditions are met
- **Real-time Price Simulation**: 9 mock tokens with different volatility levels
- **Automated Reactions**: Stop-loss, take-profit, and rebalancing triggers

## 📋 Prerequisites

1. **Node.js** (v18+)
2. **MetaMask** browser extension
3. **Reactive Testnet Setup** (we'll configure this)

## 🛠️ Quick Start

### 1. Install Dependencies

```powershell
# From repo root
cd C:\Hackathons\Reactive
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Configure Environment

```powershell
# Copy environment template
copy .env.example .env
```

Edit `.env` file and add your testnet private key:
```bash
PRIVATE_KEY=your_testnet_private_key_here_without_0x_prefix
```

**Get Testnet Tokens:**
- Go to [Reactive Testnet Faucet](https://faucet.reactive.network) 
- Request free test tokens for your wallet address

### 3. Deploy to Testnet

```powershell
# Deploy contracts to Reactive testnet
npm run deploy:testnet
```

This will:
- Deploy PortfolioManager and AutomationController contracts
- Add 9 mock tokens (mBTC, mETH, mUSDC, etc.)
- Save addresses to `deployments.json`
- Display contract addresses and network info

### 4. Update Frontend Configuration

After deployment, update the contract address in the frontend:

**Option A - Quick Manual Update:**
1. Open `client/src/lib/secureContractService.js`
2. Replace the CONTRACT_ADDRESS with your deployed address:
   ```javascript
   const CONTRACT_ADDRESS = "0xYourDeployedAddressHere";
   ```

**Option B - Use Environment Variable:**
1. Add to your `.env` file:
   ```bash
   VITE_CONTRACT_ADDRESS=0xYourDeployedAddressHere
   ```

### 5. Start the Full System

```powershell
# Start webhook service + frontend together
npm run start:full
```

Or run separately:

```powershell
# Terminal 1: Start webhook service (price simulation)
npm run webhook

# Terminal 2: Start frontend dev server
cd client
npm run dev
```

### 6. Configure MetaMask

1. **Add Reactive Testnet Network:**
   - Network Name: `Reactive Testnet`
   - RPC URL: `https://kopli-rpc.reactive.network`
   - Chain ID: `5318008`
   - Currency Symbol: `REACT`
   - Block Explorer: `https://kopli.reactscan.net`

2. **Import Test Account:**
   - Use the same private key you added to `.env`
   - This account should have testnet REACT tokens for gas

## 🎯 Mock Trading System

### Price Simulation
- **9 Mock Tokens** with different volatility levels:
  - `mBTC` (5% volatility) - Mock Bitcoin
  - `mETH` (4% volatility) - Mock Ethereum  
  - `mUSDC/mUSDT` (0.1% volatility) - Mock Stablecoins
  - `mLINK, mSOL, mADA` (5-7% volatility) - Mock Altcoins
  - `mDOGE, mSHIB` (12-15% volatility) - Mock Memecoins

### Price Updates
- Prices update every **30 seconds** with realistic percentage movements
- Volatility based on real-world token characteristics
- No real trading - just percentage calculations

### Webhook Triggers
The system automatically checks for trigger conditions every minute:

- **Stop Loss**: Triggered on 5%+ price drops
- **Take Profit**: Triggered on 8%+ price gains  
- **Rebalancing**: User-defined allocation triggers

## 🔧 API Endpoints

### Webhook Service (Port 3001)

```bash
# Get current mock prices
GET http://localhost:3001/api/prices

# Get price history for charts
GET http://localhost:3001/api/price-history/:tokenAddress

# Manually trigger actions
POST http://localhost:3001/api/trigger-price-action
{
  "tokenAddress": "0x1111...",
  "action": "stop-loss",
  "userAddress": "0xYour...",
  "threshold": -0.05
}
```

## 🧪 Testing Workflows

### 1. Portfolio Setup
1. Connect MetaMask to Reactive testnet
2. Navigate to frontend (`http://localhost:5173`)
3. Set stop-loss and take-profit percentages
4. Configure portfolio allocation

### 2. Monitor Price Movements
1. Watch webhook service console for price updates
2. View price charts in frontend (updates every 30s)
3. Observe trigger conditions being checked

### 3. Test Automated Reactions
1. Wait for significant price movements (or manually trigger)
2. Check console logs for webhook triggers
3. Verify contract reactions in frontend

### 4. Manual Triggers
Use the webhook API to manually test triggers:

```powershell
# Example: Trigger stop-loss for mBTC
curl -X POST http://localhost:3001/api/trigger-price-action `
  -H "Content-Type: application/json" `
  -d '{
    "tokenAddress": "0x1111111111111111111111111111111111111111",
    "action": "stop-loss", 
    "userAddress": "0xYourAddress",
    "threshold": -0.05
  }'
```

## 📊 Frontend Features

### Dashboard
- Real-time mock price charts
- Portfolio allocation visualization  
- Profit/loss tracking (percentage-based)

### Trading Interface
- Mock token swaps with slippage simulation
- No real funds required - all percentage calculations
- Transaction simulation with mock gas costs

### Strategy Manager
- Set automated triggers (stop-loss, take-profit)
- Portfolio rebalancing rules
- Webhook status monitoring

## 🐛 Troubleshooting

### Common Issues

**1. Webhook Service Not Starting**
```bash
Error: Port 3001 already in use
```
Solution: Change `WEBHOOK_PORT` in `.env` or kill existing process

**2. Frontend Can't Connect to Contracts**
```bash
Error: Contract address is zero
```
Solution: Update `VITE_CONTRACT_ADDRESS` in `.env` or contract service file

**3. MetaMask Network Issues**
```bash
Error: Wrong network
```
Solution: Switch MetaMask to Reactive Testnet (Chain ID: 5318008)

**4. No Price Updates**
```bash
Webhook service unavailable
```
Solution: Ensure webhook service is running on correct port

### Getting Help

1. **Check Console Logs**: Both browser and webhook service
2. **Verify Network**: Ensure MetaMask is on Reactive testnet
3. **Check Deployments**: Verify contracts deployed successfully
4. **Test API**: Try webhook endpoints directly

## 🚀 Deployment Summary

You now have a complete testnet environment with:

✅ **Mock Trading System** - No real funds required  
✅ **Webhook Automation** - Smart contract reactions via HTTP triggers  
✅ **Real-time Price Simulation** - 9 tokens with different volatility  
✅ **Testnet Integration** - Free gas with Reactive Network  
✅ **Portfolio Management** - Stop-loss, take-profit, rebalancing  
✅ **Live Charts** - Real-time price visualization  

## 🎯 Next Steps

1. **Run the quick start commands above**
2. **Test the mock trading interface** 
3. **Set up automated triggers**
4. **Monitor webhook reactions**
5. **Experiment with different portfolio strategies**

Happy testing! 🚀