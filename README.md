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
- **Wallet Connection:** Secure MetaMask login.  
- **Token Support:** 20 popular altcoins, 10 top memecoins, USDC, USDT, BTC.  
- **Stop-Loss:** User defines % threshold to auto-sell.  
- **Auto-Sell (Take Profit):** Sell automatically when price increases by a set %.  
- **Panic Mode:** Convert all assets to stablecoins in crash scenarios.  
- **Balance Portfolio:** Maintain allocation by auto buy/sell.  
- **Automation:** RCS triggers execute trades when conditions are met.  
- **Charts & Monitoring:** Live data via Uniswap API + Plotly.js.  

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

**Scripts:**
```bash
# Get network information
node scripts/network-info.js

# Interact with deployed contracts
node scripts/interact.js
```

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
