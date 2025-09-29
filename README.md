# 📂 Automated Trading Portfolio Web App (Reactive Network + RCS)

## 🔎 Project Summary
This project is a **portfolio management dApp** built on the **Reactive Network mainnet**, powered by **RCS (Reactive Contracts Service)** for automation.  
It allows users to connect with **MetaMask**, choose from a curated set of **ERC-20 tokens** (20 altcoins, 10 memecoins, USDC, USDT, and BTC), and apply automated portfolio strategies such as stop-loss, auto-sell, panic-mode, and balance reallocation.  

The app integrates with **Uniswap APIs** for buying tokens and price data, while charts are rendered with **Plotly.js** for real-time visualization.  

---

## 🎯 Objectives
- Build a secure, user-friendly portfolio web app.  
- Allow users to select and manage a fixed set of supported ERC-20 tokens.  
- Enable automated trading strategies via **RCS automation triggers**.  
- Fetch live token prices from **Uniswap** to avoid conflicts.  
- Provide real-time charts and clear portfolio visualization.  

---

## 🛠 Technologies & Tools
- **Frontend:** Svelte + TailwindCSS  
- **Backend:** Fastify (Node.js) + MongoDB  
- **Blockchain:** Reactive Network (EVM-compatible), RCS  
- **Smart Contracts:** Solidity (ERC-20 interactions)  
- **APIs:** Uniswap SDK/API (trading + price feeds)  
- **Wallet:** MetaMask integration  
- **Visualization:** Plotly.js (real-time charts)  
- **Version Control:** Git + GitHub  

---

## 🔐 Core Features
- **Wallet Connection:** Secure MetaMask login (signature-auth session).  
- **Token Support:** Curated fixed list (20 altcoins, 10 memecoins, USDC, USDT, BTC).  
- **Stop-Loss / Take-Profit:** Strategy configuration on-chain (execution path scaffolded).  
- **Panic Mode:** Emergency reallocation to stables.  
- **Portfolio Rebalancing:** Allocation targets (future automation extension).  
- **Secure Swaps:** All routing mediated by portfolio contract (no direct frontend Uniswap swap).  
- **Display-First Pricing:** Fetch → render candlesticks instantly → optional persistence + on-chain anchor.  
- **Candlestick Charts:** Plotly.js OHLC with live close updates every 15s.  
- **Ingestion Microservice:** `/price-ingest` service storing raw ticks + 1m candles (ClickHouse schema).  
- **LRU Price Cache:** Minimizes repeated Subgraph/API calls (30s TTL).  

---

## 📂 Project Structure
```
├── contracts/           # Solidity smart contracts
│   └── ReactiveContract.sol
├── frontend/           # Svelte + TailwindCSS app
│   ├── src/
│   │   ├── lib/        # Svelte components
│   │   │   ├── ContractInteraction.svelte
│   │   │   ├── PriceChart.svelte
│   │   │   ├── WalletConnection.svelte
│   │   │   └── uniswap.js
│   │   └── routes/     # SvelteKit routes
│   └── package.json
├── scripts/            # Deployment & interaction scripts
│   ├── deploy.js
│   ├── interact.js
│   └── network-info.js
├── price-ingest/       # Price ingestion microservice (Fastify + ClickHouse client)
│   ├── src/
│   │   ├── server.js   # /tick endpoint + flush loop
│   │   ├── clickhouse.js# Schema ensure & client factory
│   │   ├── aggregator.js# In-process 1m candle builder
│   │   └── config.js    # ENV config loader
│   └── package.json
├── tests/              # Smart contract tests
│   └── ReactiveContract.test.js
├── hardhat.config.js   # Hardhat configuration for Reactive Network
└── package.json        # Root package configuration
```

---

## 🛠 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git
- MetaMask browser extension

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Reactive
   ```

2. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Environment Setup:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your private keys and API keys to .env
   ```

4. **Configure MetaMask:**
   - Add Reactive Network to MetaMask
   - Network details in `scripts/network-info.js`

### Development

**Smart Contracts:**
```bash

### Deploying contracts to Reactive Mainnet

1. Add your deployer private key to the project root `.env` (never commit this file):

```
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
REACTIVE_NETWORK_RPC=https://mainnet-rpc.rnk.dev/
```

2. Compile and deploy (from project root):

```
npx hardhat compile
npx hardhat run scripts/deploy-reactive.js --network reactive
```

This writes `deployments/reactive-mainnet.json` containing `reactToken` and `portfolioManager` addresses which the frontend will load automatically. If you prefer, set the client env vars in `client/.env`:

```
VITE_REACT_TOKEN_ADDRESS=0x...
VITE_PORTFOLIO_MANAGER_ADDRESS=0x...
```

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Reactive Network
npx hardhat run scripts/deploy.js --network reactive
```

**Frontend:**
```bash
# Start development server
cd frontend
npm run dev
```

#### Switching Between Mock (Simulation) Mode and Real Network

The dApp can operate in two modes:

| Mode | USE_MOCK_TOKENS | Behavior |
|------|-----------------|----------|
| Mock / Simulation | `true` | Uses synthetic tokens & webhook price simulation. No real swaps. |
| Real Network | `false` | Expects real token addresses; no simulated prices. |

Environment variables impacting network:
```
VITE_REACTIVE_CHAIN_ID=5318008
VITE_REACTIVE_CHAIN_NAME="Reactive Network"
VITE_REACTIVE_SYMBOL=REACT
VITE_REACTIVE_RPC=https://kopli-rpc.reactive.network
VITE_REACTIVE_EXPLORER=https://kopli.reactscan.net
USE_MOCK_TOKENS=true
```

To switch to real network mode:
1. Set `USE_MOCK_TOKENS=false` (and `VITE_USE_MOCK_TOKENS=false` if referenced in frontend code).
2. Provide real token addresses and run the token registration script.
3. Restart both the deployment and frontend processes so Vite rebuilds with updated env.
4. MetaMask will prompt you to approve adding / switching to the Reactive Network if not already configured.

When in real mode the deploy script skips adding mock tokens; use the addTokens script or UI to register actual tokens.

#### Runtime Mode Toggle (Simulation ↔ Live)
The header includes a toggle that switches between Simulation and Live without rebuilding.

| Runtime Mode | Data Source | Swaps | Chart Behavior | Price Fetch |
|--------------|-------------|-------|----------------|------------|
| Simulation | Mock webhook + synthetic candles | Mock (no on-chain) | Synthetic or Uniswap-derived candles; auto 15s last-candle refresh | Interval + synthetic generation |
| Live | CoinGecko spot (5% threshold) | Placeholder (future real swap) | Sparse baseline candles updated on-demand / threshold | Manual button + threshold cache |

Details:
- Mode stored in `localStorage` (`reactiveAppMode`).
- Overrides build-time `VITE_USE_MOCK_TOKENS` after first user interaction.
- `secureContractService`: selects mock vs live logic; live path currently a placeholder emitting a simulated event.
- `TradeModal`: fetches spot price only when opened or user clicks Refresh; 5% change threshold logic in `coingeckoPriceService`.
- `PriceChart`: Simulation mode uses synthetic/uniswap feed; Live mode shows flat candle scaffolding with spot overlays and manual refresh.

Planned (optional future work): historical real candle aggregation, real swap routing integration, richer oracle redundancy (Chainlink / TWAP fallback).

**Scripts:**
```bash
# Get network information
node scripts/network-info.js

# Interact with deployed contracts
node scripts/interact.js
```

### Register Supported Tokens

Token placeholders live in `token-config.json` (20 altcoins, 10 memecoins, USDC, USDT). Replace each placeholder address with the real ERC-20 address on Reactive Network mainnet. Then run:

```bash
PORTFOLIO_MANAGER_ADDRESS=<deployed_contract_address> npx hardhat run scripts/addTokens.js --network reactive
```

Requirements:
- For non-stablecoins an existing Uniswap V3 pool (token/USDC) at the specified `poolFee` must exist or `addToken` reverts.
- `poolFee` 0 is used for USDC itself.

### Wallet Authentication (Signature Session & Detection)
On load the app detects whether MetaMask is installed:

1. If MetaMask is present and the user previously authorized the site, it silently restores state (and will re-auth on interaction if session expired).
2. If not installed, the UI shows an Install MetaMask button (desktop: metamask.io/download, mobile: store link).
3. On Connect it requests accounts (`eth_requestAccounts`), checks/requests network switch to Reactive, then prompts a message signature for a 30‑minute auth session.

Stored in `localStorage`:
`reactiveAuthSession` – { address, signature, timestamp }
`reactiveWalletAddress` – last connected address (for quick UI prefill)

Security notes:
- Only a human-readable message is signed (no transactions / gas).
- Session auto-invalidates after 30 minutes; reconnect triggers re-sign.
- Using a different account triggers a fresh authentication flow.

### Secure On-Chain Swaps
All swaps execute via `EnhancedPortfolioManager.executeSwap`. Frontend helper `frontend/src/lib/uniswap.js` calls the contract—no client pathfinding or direct router invocation.

### Batch Token Script
File: `scripts/addTokens.js` — reads `token-config.json` and invokes `addToken` (owner only). Update `PORTFOLIO_MANAGER_ADDRESS` ENV before running.

### Future Improvements
- Owner UI for token registration
- Oracle integration for off-chain fallback pricing
- Automatic pool discovery & validation

---

## 🧪 Testing & Validation
- **Smart Contracts:** Mocha/Chai with Hardhat
- **Frontend:** Svelte testing utilities
- **Integration:** End-to-end wallet connection tests
- **RCS Automation:** Tested on Reactive Network testnet

---

## 🚀 Deployment
- **Smart Contracts:** Deployed to Reactive Network mainnet via Hardhat
- **Frontend:** Static deployment via Vercel/Netlify
- **Verification:** Contract verification on Reactive Network explorer  

---

## 🌐 Future Enhancements
- Multi-wallet support.  
- Expanded token support beyond fixed set.  
- Integration with Chainlink oracles as fallback.  
- AI-driven portfolio rebalancing.  
- Push notifications for triggered trades.  

---

## 📈 Skills Demonstrated
- Smart contract development (Solidity, ERC-20).  
- EVM automation with **Reactive Contracts Service (RCS)**.  
- Full-stack Web3 development (Svelte + Fastify + MongoDB).  
- API integration (Uniswap SDK).  
- Secure wallet interaction (MetaMask).  
- Real-time data visualization (Plotly.js).  

---

## 📊 Display-First Price Architecture

Rationale: Avoid blocking UI on persistence or on-chain writes; minimize gas & storage churn.

Flow:
1. Frontend calls `uniswapPriceFeed.getCandles()` → returns cached or fetched OHLC set (Subgraph → fallback synthetic).  
2. Chart renders immediately (Plotly candlestick).  
3. A 15s polling loop fetches `getLatestPrice()` updating only the last candle close.  
4. After each successful visual update, a non-blocking beacon (`/ingest/tick`) ships the tick to the ingestion service.  
5. User may optionally click “Store On-Chain” to invoke `updateTokenPrice` (contract maintains canonical anchor snapshots).  

Benefits:
- Decouples UX latency from persistence.
- Lets you filter/epsilon-suppress writes server-side in future.
- On-chain anchoring becomes intentional & rate-limited.

### Caching Layer
`uniswapPriceFeed` uses an LRU map (max 100 entries) + 30s TTL to avoid redundant Subgraph queries across timeframe changes and token switches.

### Ingestion Service Overview (`price-ingest/`)
- Technology: Fastify + ClickHouse client.
- Endpoint: `POST /tick` (body: token_address, symbol, price, source, ts?).
- Writes to `raw_ticks` (TTL 7 days). In-process aggregator flushes *finished* minute buckets to `candles_1m` (TTL 90 days).
- Future: Replace aggregator with ClickHouse materialized views (raw → 1m → 5m → 1h) for server-side rollups.

Schema Highlights:
- `raw_ticks`: (token_address, symbol, event_time, price, source, liquidity, pool_fee).
- `candles_1m`: (token_address, bucket_start, open, high, low, close, volume_usd, trades) ReplacingMergeTree.

### AWS Deployment Outline
| Component | Service | Notes |
|-----------|---------|-------|
| Ingestion API | ECS Fargate | Autoscale on CPU / mem | 
| ClickHouse | ClickHouse Cloud or EC2 | Use gp3; enable TTL merges |
| Frontend | CloudFront + S3 (or Vercel) | Add `/tick` route via API Gateway/ALB |
| Auth | x-auth-token header | Rotate via SSM Parameter Store |
| Metrics | CloudWatch logs + ClickHouse system tables | Add anomaly alarms |

Optional: Use API Gateway + Lambda (container) if ingestion rate modest (<2k rps) before moving to ECS.

### Retention & Downsampling (Planned)
- 1s ticks: 7 days
- 1m candles: 90 days
- 5m candles: 1 year (future MV)
- 1h candles: long-term (archival / S3 parquet export)

### Security Notes
- Add `INGEST_AUTH_TOKEN` and send as `x-auth-token` header in beacon.
- Apply IP allowlist (CloudFront WAF) to ingestion if needed.
- Sanitize & validate input (Zod already in service).

### On-Chain Storage Strategy
Store only periodic or threshold-triggered prices (e.g., on hourly close or >X% delta) to reduce gas + chain noise. UI button already defers until user action.

---
## 🤖 RCS Automation (Triggers)

An on-chain companion contract `AutomationController` manages per-user strategy thresholds without bloating the core portfolio manager. It is intended to be driven by an off-chain RCS (Reactive Contracts Service) evaluator bot.

### Components
| Contract | Purpose |
|----------|---------|
| `EnhancedPortfolioManager` | Holds core portfolio logic, price updates, swaps |
| `AutomationController` | Stores user strategies (stop-loss / take-profit), exposes evaluation entrypoints |

### Strategy Fields
| Field | Meaning |
|-------|---------|
| stopLossBps | Drop from entry (basis points) to trigger sell |
| takeProfitBps | Gain from entry (bps) to trigger sell |
| coolDown | Min seconds between executions |
| sellPortionBps | Portion of user balance to liquidate (bps) |
| entryPrice | Captured when enabling strategy |

### Evaluation Flow
1. Off-chain bot fetches candidate users/tokens.
2. Calls `evaluate(user, token)` (only operator allowed) which:
   - Reads current price from portfolio manager.
   - Compares against thresholds.
   - If triggered, transfers portion of user token (requires prior approval) and emits `StrategyExecuted`.
3. Future enhancement: invoke actual swap path to stable (USDC) automatically.

### Security Considerations
- Users must approve `AutomationController` to move the specific token amount (risk minimized by partial allowance vs unlimited).
- Operator address restricted; rotate via `setOperator`.
- Cooldown prevents rapid repeated executions (spam / sandwich risk).
- No external price dependency besides portfolio’s price function (single source of truth). Diversify later with median-of-N oracles if needed.

### Gas & Frequency
- Bot should batch using `batchEvaluate` to amortize gas.
- Suggested cadence: 30–60s for volatile assets; longer for stablecoins.
- Add dynamic backoff if no strategies triggered in recent cycles.

### Roadmap Enhancements
- Integrate direct swap invocation once custody model updated (e.g., portfolio vault pattern).
- Add trailing stop parameters.
- Add multi-threshold ladder (scale-out sells).
- Emit performance metrics events for off-chain analytics.

---
