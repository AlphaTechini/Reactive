# 🧪 Simulation Mode - Quick Start

## TL;DR

Test your portfolio app instantly without waiting for slow testnets!

```bash
# Terminal 1: Start Hardhat
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy-local.js --network localhost

# Terminal 3: Start frontend
cd client && pnpm dev

# Browser: Go to
http://localhost:5173/simulated
```

## Why Simulation Mode?

| Live Mode (Testnet) | Simulation Mode (Local) |
|---------------------|-------------------------|
| ❌ Slow (minutes per tx) | ✅ Instant (milliseconds) |
| ❌ Limited testnet tokens | ✅ Unlimited ETH (10,000 per account) |
| ❌ RPC timeouts | ✅ Always available |
| ❌ Deployment hangs | ✅ Deploys instantly |
| ❌ Network congestion | ✅ No congestion |

## Setup (5 minutes)

### 1. Start Hardhat Node
```bash
npx hardhat node
```

You'll see 20 accounts with private keys. Keep this running.

### 2. Deploy Contracts
```bash
npx hardhat run scripts/deploy-local.js --network localhost
```

Copy the FREACT token address from the output.

### 3. Update Environment
Add to `.env` and `client/.env`:
```env
VITE_LOCAL_FREACT_ADDRESS=0xYourAddressHere
```

### 4. Configure MetaMask

**Add Network:**
- Name: `Hardhat Local`
- RPC: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Symbol: `ETH`

**Import Account:**
- Copy any private key from Hardhat node output
- Import into MetaMask
- You now have 10,000 ETH!

### 5. Start Testing
Navigate to: `http://localhost:5173/simulated`

## Features

Everything works exactly like live mode:
- ✅ Create portfolios
- ✅ Deposit/withdraw
- ✅ Set automation rules
- ✅ Manual trading
- ✅ FREACT faucet
- ✅ Risk management
- ✅ Rebalancing

## Switching Modes

- **Live Mode:** `http://localhost:5173/` (Reactive Testnet)
- **Simulation Mode:** `http://localhost:5173/simulated` (Hardhat Local)

The purple banner shows you're in simulation mode.

## Resetting

To start fresh:
1. Stop Hardhat (Ctrl+C)
2. Start again: `npx hardhat node`
3. Redeploy: `npx hardhat run scripts/deploy-local.js --network localhost`
4. Update contract address in `.env`

## Common Issues

**"Nonce too high" in MetaMask**
→ Settings → Advanced → Reset Account

**Can't connect to localhost**
→ Make sure Hardhat node is running

**Contract not found**
→ Redeploy and update `.env` files

## Helper Scripts

**Windows:**
```bash
start-simulation.bat
```

**Mac/Linux:**
```bash
chmod +x start-simulation.sh
./start-simulation.sh
```

## Documentation

- Full setup: `LOCAL_SIMULATION_SETUP.md`
- Implementation details: `SIMULATION_MODE_IMPLEMENTATION.md`
- Testnet deployment: `DEPLOYMENT_FIX_SUMMARY.md`

## Tips

1. **Keep Hardhat running** - Don't restart unless you need to reset
2. **Import multiple accounts** - Test multi-user scenarios
3. **Use console logs** - Hardhat shows all transactions
4. **Reset when stuck** - Just restart the node

## Next Steps

1. Start Hardhat node
2. Deploy contracts
3. Configure MetaMask
4. Go to `/simulated`
5. Start testing!

No more waiting for testnets! 🚀
