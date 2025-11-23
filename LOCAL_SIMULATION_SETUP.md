# Local Simulation Mode Setup

## Overview

Simulation mode allows you to test all portfolio features using a local Hardhat network instead of waiting for slow testnet deployments.

## Quick Start

### 1. Start Hardhat Node

Open a terminal and run:
```bash
npx hardhat node
```

Keep this terminal running. You'll see 20 test accounts with 10,000 ETH each.

### 2. Deploy Contracts Locally

In a new terminal:
```bash
npx hardhat run scripts/deploy-local.js --network localhost
```

This will:
- Deploy FREACT token to localhost
- Claim test tokens
- Save deployment info to `deployments-local.json`
- Show you the contract address

### 3. Update Environment Variables

Add to your `.env` and `client/.env`:
```env
VITE_LOCAL_FREACT_ADDRESS=<address_from_deployment>
VITE_LOCAL_CHAIN_ID=1337
VITE_LOCAL_RPC=http://127.0.0.1:8545
```

### 4. Configure MetaMask

1. Add Hardhat Network to MetaMask:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`

2. Import a test account:
   - Copy any private key from the Hardhat node output
   - Import into MetaMask
   - You'll have 10,000 ETH for testing

### 5. Access Simulation Mode

Navigate to: `http://localhost:5173/simulated`

## Features Available in Simulation Mode

All features work exactly like live mode:
- ✅ Create portfolios
- ✅ Deposit/withdraw funds
- ✅ Set automation rules
- ✅ Manual trading
- ✅ FREACT faucet
- ✅ Portfolio management
- ✅ Risk management
- ✅ Rebalancing

## Advantages

1. **Instant Transactions** - No waiting for testnet confirmations
2. **Unlimited Funds** - Test accounts have 10,000 ETH
3. **Fast Iteration** - Deploy and test quickly
4. **No Testnet Issues** - No RPC timeouts or network congestion
5. **Complete Control** - Reset anytime by restarting the node

## Resetting

To start fresh:
1. Stop the Hardhat node (Ctrl+C)
2. Start it again: `npx hardhat node`
3. Redeploy contracts: `npx hardhat run scripts/deploy-local.js --network localhost`
4. Update the contract address in your `.env` files

## Troubleshooting

### MetaMask shows "Nonce too high"
- Reset your account in MetaMask: Settings → Advanced → Reset Account

### Can't connect to localhost
- Make sure Hardhat node is running
- Check the RPC URL is `http://127.0.0.1:8545`
- Try `http://localhost:8545` if 127.0.0.1 doesn't work

### Contract not found
- Redeploy contracts
- Update the contract address in `.env`
- Restart your frontend dev server

## Development Workflow

1. Start Hardhat node (once)
2. Deploy contracts (once, or when contracts change)
3. Develop and test features
4. Reset when needed

## Switching Between Modes

- **Live Mode**: Navigate to `/` (uses Reactive Testnet)
- **Simulation Mode**: Navigate to `/simulated` (uses Hardhat Local)

The banner at the top shows which mode you're in.
