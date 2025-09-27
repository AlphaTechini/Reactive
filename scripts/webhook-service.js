// Webhook service for triggering contract reactions based on price movements
import { ethers } from "hardhat";
import fs from "fs";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // Allow cross-origin requests from frontend
app.use(express.json());

let portfolioManager;
let automationController;

// Load deployed contract addresses
async function loadContracts() {
  if (fs.existsSync("deployments.json")) {
    const deployments = JSON.parse(fs.readFileSync("deployments.json"));
    const networkDeployment = deployments[network.name];
    
    if (networkDeployment) {
      const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
      portfolioManager = PortfolioManager.attach(networkDeployment.portfolioManager.contractAddress);
      
      const AutomationController = await ethers.getContractFactory("AutomationController");
      automationController = AutomationController.attach(networkDeployment.automationController.contractAddress);
      
      console.log("📋 Contracts loaded:");
      console.log("- PortfolioManager:", networkDeployment.portfolioManager.contractAddress);
      console.log("- AutomationController:", networkDeployment.automationController.contractAddress);
    }
  }
}

// Mock price simulation with percentage movements
const mockPrices = new Map();
const priceHistory = new Map();

// Initialize mock prices from supported tokens
const supportedTokens = [
  { symbol: "mBTC", address: "0x1111111111111111111111111111111111111111", basePrice: 45000, volatility: 0.05 },
  { symbol: "mETH", address: "0x2222222222222222222222222222222222222222", basePrice: 2800, volatility: 0.04 },
  { symbol: "mUSDC", address: "0x3333333333333333333333333333333333333333", basePrice: 1.00, volatility: 0.001 },
  { symbol: "mUSDT", address: "0x4444444444444444444444444444444444444444", basePrice: 1.00, volatility: 0.001 },
  { symbol: "mLINK", address: "0x5555555555555555555555555555555555555555", basePrice: 15.50, volatility: 0.06 },
  { symbol: "mSOL", address: "0x6666666666666666666666666666666666666666", basePrice: 95.00, volatility: 0.07 },
  { symbol: "mADA", address: "0x7777777777777777777777777777777777777777", basePrice: 0.45, volatility: 0.05 },
  { symbol: "mDOGE", address: "0x8888888888888888888888888888888888888888", basePrice: 0.08, volatility: 0.12 },
  { symbol: "mSHIB", address: "0x9999999999999999999999999999999999999999", basePrice: 0.000012, volatility: 0.15 }
];

// Initialize prices
supportedTokens.forEach(token => {
  mockPrices.set(token.address, {
    current: token.basePrice,
    base: token.basePrice,
    volatility: token.volatility,
    symbol: token.symbol,
    lastUpdate: Date.now()
  });
  priceHistory.set(token.address, []);
});

// Simulate price movements every 30 seconds
function simulatePriceMovements() {
  supportedTokens.forEach(token => {
    const priceData = mockPrices.get(token.address);
    if (priceData) {
      // Generate random percentage change based on volatility
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const percentageChange = randomFactor * priceData.volatility;
      
      // Apply change to current price
      const newPrice = priceData.current * (1 + percentageChange);
      
      // Update price data
      priceData.current = Math.max(newPrice, 0.0001); // Prevent negative prices
      priceData.lastUpdate = Date.now();
      
      // Store in history
      const history = priceHistory.get(token.address);
      history.push({
        price: priceData.current,
        change: percentageChange,
        timestamp: Date.now()
      });
      
      // Keep only last 100 price points
      if (history.length > 100) {
        history.shift();
      }
      
      console.log(`💹 ${priceData.symbol}: $${priceData.current.toFixed(6)} (${(percentageChange * 100).toFixed(2)}%)`);
    }
  });
}

// Check if any user conditions are met and trigger webhooks
async function checkTriggerConditions() {
  if (!portfolioManager || !automationController) return;
  
  try {
    // This would normally query user positions and check stop-loss/take-profit conditions
    // For demo, we'll simulate some triggers based on price movements
    
    for (const [address, priceData] of mockPrices) {
      const history = priceHistory.get(address);
      if (history.length < 2) continue;
      
      const currentPrice = priceData.current;
      const previousPrice = history[history.length - 2].price;
      const priceChange = (currentPrice - previousPrice) / previousPrice;
      
      // Simulate stop-loss trigger (5% drop)
      if (priceChange < -0.05) {
        console.log(`🚨 Stop-loss triggered for ${priceData.symbol}: ${(priceChange * 100).toFixed(2)}% drop`);
        await triggerStopLoss(address, priceChange);
      }
      
      // Simulate take-profit trigger (8% gain)
      if (priceChange > 0.08) {
        console.log(`🎯 Take-profit triggered for ${priceData.symbol}: ${(priceChange * 100).toFixed(2)}% gain`);
        await triggerTakeProfit(address, priceChange);
      }
    }
  } catch (error) {
    console.error("Error checking trigger conditions:", error);
  }
}

// Webhook endpoints
app.get('/api/prices', (req, res) => {
  const prices = {};
  for (const [address, data] of mockPrices) {
    prices[address] = {
      symbol: data.symbol,
      current: data.current,
      base: data.base,
      change: ((data.current - data.base) / data.base) * 100,
      lastUpdate: data.lastUpdate
    };
  }
  res.json(prices);
});

app.get('/api/price-history/:address', (req, res) => {
  const { address } = req.params;
  const history = priceHistory.get(address) || [];
  res.json(history);
});

app.post('/api/trigger-price-action', async (req, res) => {
  const { tokenAddress, action, userAddress, threshold } = req.body;
  
  try {
    console.log(`🎯 Manual trigger: ${action} for ${tokenAddress} by ${userAddress}`);
    
    // Execute the appropriate action
    let tx;
    switch (action) {
      case 'stop-loss':
        tx = await triggerStopLoss(tokenAddress, threshold);
        break;
      case 'take-profit':
        tx = await triggerTakeProfit(tokenAddress, threshold);
        break;
      case 'rebalance':
        tx = await triggerRebalance(userAddress);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.json({ 
      success: true, 
      transaction: tx?.hash || 'simulated',
      message: `${action} triggered successfully`
    });
    
  } catch (error) {
    console.error('Webhook trigger failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger functions (these would interact with actual contracts)
async function triggerStopLoss(tokenAddress, priceChange) {
  console.log(`🔴 Executing stop-loss for token ${tokenAddress}`);
  // In a real implementation, this would call the smart contract
  // For now, we'll just log the action
  return { hash: `0x${Math.random().toString(16).substr(2, 8)}` };
}

async function triggerTakeProfit(tokenAddress, priceChange) {
  console.log(`🟢 Executing take-profit for token ${tokenAddress}`);
  // In a real implementation, this would call the smart contract
  return { hash: `0x${Math.random().toString(16).substr(2, 8)}` };
}

async function triggerRebalance(userAddress) {
  console.log(`⚖️ Executing portfolio rebalance for user ${userAddress}`);
  // In a real implementation, this would call the smart contract
  return { hash: `0x${Math.random().toString(16).substr(2, 8)}` };
}

// Start the service
async function startWebhookService() {
  await loadContracts();
  
  // Start price simulation
  setInterval(simulatePriceMovements, 30000); // Every 30 seconds
  setInterval(checkTriggerConditions, 60000);  // Check triggers every minute
  
  const PORT = process.env.WEBHOOK_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Webhook service running on port ${PORT}`);
    console.log(`📊 Price simulation started with ${supportedTokens.length} mock tokens`);
    console.log(`🔗 Endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/prices`);
    console.log(`   GET  http://localhost:${PORT}/api/price-history/:address`);
    console.log(`   POST http://localhost:${PORT}/api/trigger-price-action`);
  });
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWebhookService().catch(console.error);
}

export { startWebhookService, mockPrices, priceHistory };