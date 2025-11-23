# Complete Startup Guide

## Your Project Architecture

Your project has **2 main services** that need to run:

1. **Price Ingest Service** (`price-ingest/`) - Backend API for prices and portfolio data
2. **Client** (`client/`) - Frontend Svelte application

Plus optional blockchain services for smart contracts.

---

## Quick Start (2 Services)

### Terminal 1: Start Price Service (Backend)
```bash
cd price-ingest
npm start
# or
npm run price-server
```

**What it does**:
- Runs on `http://localhost:3001`
- Provides API endpoints for:
  - `/api/prices` - Token prices
  - `/api/portfolios` - Portfolio CRUD operations
  - `/api/users` - User data storage (IPFS)
- Fetches live prices from external APIs
- Stores data in JSON files (`storage/` folder)

### Terminal 2: Start Frontend
```bash
cd client
pnpm run dev
```

**What it does**:
- Runs on `http://localhost:5173` (or similar)
- Svelte/SvelteKit development server
- Hot reload enabled
- Connects to price service at `localhost:3001`

---

## Full Startup Commands

### Option 1: Manual (Recommended for Development)

**Terminal 1 - Price Service:**
```bash
cd price-ingest
npm install  # First time only
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
pnpm install  # First time only
pnpm run dev
```

### Option 2: Using Root Script (If Available)
```bash
# From project root
npm run start:full
```

This should start both services concurrently (check `scripts/start-full.js`).

---

## What Each Service Does

### 1. Price Ingest Service (Backend)
**Location**: `price-ingest/`
**Port**: `3001`
**Main File**: `src/priceServerFastify.js`

**Endpoints**:
- `GET /api/prices` - Get all token prices
- `GET /api/prices/:symbol` - Get specific token price
- `POST /api/portfolios` - Create portfolio
- `GET /api/portfolios/:walletAddress` - Get user's portfolios
- `GET /api/portfolios/:walletAddress/:portfolioId` - Get specific portfolio
- `PUT /api/portfolios/:walletAddress/:portfolioId` - Update portfolio
- `POST /api/users/:address` - Store user data to IPFS

**Data Storage**:
- Uses JSON files in `price-ingest/storage/`
- Each wallet address gets its own JSON file
- Price cache stored in `price-cache.json`

### 2. Client (Frontend)
**Location**: `client/`
**Port**: `5173` (default Vite port)
**Framework**: SvelteKit + Svelte 5

**Features**:
- Wallet connection (MetaMask)
- Portfolio creation and management
- Token selection with live prices
- Trading interface
- Dashboard and analytics

---

## Environment Variables

### Price Service (.env in `price-ingest/`)
```env
PORT=3001
NODE_ENV=development
# Add any API keys for price feeds here
```

### Client (.env in `client/`)
```env
VITE_REACTIVE_CHAIN_ID=1597
VITE_REACTIVE_CHAIN_NAME=Reactive Mainnet
VITE_REACTIVE_SYMBOL=REACT
VITE_REACTIVE_RPC=https://mainnet-rpc.rnk.dev/
VITE_REACTIVE_EXPLORER=https://reactscan.net/
```

---

## Troubleshooting

### Price Service Won't Start
```bash
cd price-ingest
rm -rf node_modules
npm install
npm start
```

### Frontend Won't Start
```bash
cd client
rm -rf node_modules .svelte-kit node_modules/.vite
pnpm install
pnpm run dev
```

### Ports Already in Use
- Price service: Change port in `price-ingest/.env` (default 3001)
- Frontend: Vite will auto-increment (5173 → 5174 → 5175...)

### Prices Not Loading
1. Check price service is running: `http://localhost:3001/api/prices`
2. Check browser console for CORS errors
3. Verify `.env` files are configured correctly

---

## Optional: Blockchain Services

### For Smart Contract Development
```bash
# Terminal 3 - Local Hardhat Node (optional)
npx hardhat node

# Terminal 4 - Deploy Contracts (optional)
npm run deploy
```

**Note**: Blockchain services are optional for frontend development. The app works without them in "simulation mode".

---

## Development Workflow

### Daily Startup
1. Open 2 terminals
2. Terminal 1: `cd price-ingest && npm start`
3. Terminal 2: `cd client && pnpm run dev`
4. Open browser to `http://localhost:5173`

### Making Changes
- **Frontend changes**: Auto-reload (Vite HMR)
- **Backend changes**: Restart price service (or use `npm run dev` for auto-restart)

### Testing
- Frontend: Open browser dev tools, check console
- Backend: Visit `http://localhost:3001/api/prices` directly
- Check `price-ingest/storage/` for saved data

---

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Price Service (Backend) | 3001 | http://localhost:3001 |
| Frontend (Client) | 5173 | http://localhost:5173 |
| Hardhat Node (Optional) | 8545 | http://localhost:8545 |

---

## First Time Setup Checklist

- [ ] Install Node.js (v18 or higher)
- [ ] Install pnpm: `npm install -g pnpm`
- [ ] Clone/download project
- [ ] Install price service: `cd price-ingest && npm install`
- [ ] Install frontend: `cd client && pnpm install`
- [ ] Copy `.env.example` to `.env` in both folders
- [ ] Start price service: `cd price-ingest && npm start`
- [ ] Start frontend: `cd client && pnpm run dev`
- [ ] Install MetaMask browser extension
- [ ] Open `http://localhost:5173` in browser

---

## Quick Health Check

After starting both services, verify they're working:

1. **Price Service**: Visit http://localhost:3001/api/prices
   - Should see JSON with token prices

2. **Frontend**: Visit http://localhost:5173
   - Should see the app homepage
   - Check browser console for errors

3. **Integration**: In the app, check if token prices load
   - Go to portfolio page
   - Token list should show prices

---

## Need Help?

Common issues:
- **"Cannot find module"**: Run `npm install` or `pnpm install`
- **"Port already in use"**: Kill the process or change port
- **"CORS error"**: Price service not running or wrong URL
- **"Prices show $0.00"**: Price service not fetching data (check API keys)
