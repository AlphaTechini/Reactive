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
- `/contracts` → Solidity smart contracts (ERC-20 interactions + automation hooks).  
- `/frontend` → Svelte app (UI + wallet + charts).  
- `/backend` → Fastify server for orchestration + DB persistence.  
- `/scripts` → Deployment + testing scripts.  
- `/tests` → Unit & integration tests (mock trading + RCS simulation).  

---

## 🧪 Testing & Validation
- Mock Uniswap trades for development.  
- Simulated stop-loss and auto-sell scenarios.  
- RCS automation tested on Reactive Network testnet.  
- Edge cases: zero balance, network errors, multiple triggers.  

---

## 🚀 Deployment
- Backend: Deployed to Reactive Network mainnet.  
- Frontend: Deployed via Vercel/Netlify.  
- Contracts: Verified on Reactive Network explorer.  
- Wallet: MetaMask (Reactive Network configured).  

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
