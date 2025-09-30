// Simple webhook server for price alerts
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Store price alerts and mock prices
let priceAlerts = [];
let mockPrices = {};

// Mock price data for simulation mode
const initializeMockPrices = () => {
  mockPrices = {
    '0x1111111111111111111111111111111111111111': { current: 45000, symbol: 'BTC' },
    '0x2222222222222222222222222222222222222222': { current: 3200, symbol: 'ETH' },
    '0x3333333333333333333333333333333333333333': { current: 15.5, symbol: 'LINK' },
    '0x4444444444444444444444444444444444444444': { current: 0.45, symbol: 'ADA' },
    '0x5555555555555555555555555555555555555555': { current: 7.2, symbol: 'DOT' },
    '0x6666666666666666666666666666666666666666': { current: 110, symbol: 'SOL' },
    '0x7777777777777777777777777777777777777777': { current: 6.8, symbol: 'UNI' },
    '0x8888888888888888888888888888888888888888': { current: 1.0, symbol: 'USDC' },
    '0x9999999999999999999999999999999999999999': { current: 1.0, symbol: 'USDT' }
  };
};

// Initialize mock prices
initializeMockPrices();

// Simulate price volatility (add random fluctuations)
const simulatePriceChanges = () => {
  for (const address in mockPrices) {
    const priceData = mockPrices[address];
    if (priceData.symbol !== 'USDC' && priceData.symbol !== 'USDT') {
      // Add random price change (-5% to +5%)
      const changePercent = (Math.random() - 0.5) * 0.1; // -5% to +5%
      priceData.current *= (1 + changePercent);
      priceData.change = changePercent * 100;
      priceData.lastUpdate = Date.now();
      
      // Check for alerts
      checkPriceAlerts(address, priceData);
    }
  }
};

// Check if any price changes trigger alerts
const checkPriceAlerts = (address, priceData) => {
  priceAlerts.forEach(alert => {
    if (alert.tokenAddress === address && alert.enabled) {
      const absChange = Math.abs(priceData.change || 0);
      if (absChange >= alert.threshold) {
        console.log(`🚨 Price alert triggered for ${priceData.symbol}: ${priceData.change?.toFixed(2)}% change`);
        
        // You could send notifications here (email, discord, telegram, etc.)
        notifyPriceAlert(alert, priceData);
      }
    }
  });
};

// Send notification for price alert
const notifyPriceAlert = (alert, priceData) => {
  console.log(`📱 Sending notification: ${priceData.symbol} changed by ${priceData.change?.toFixed(2)}%`);
  
  // In a real implementation, you would send:
  // - Email notifications
  // - Discord/Telegram messages
  // - Push notifications
  // - SMS alerts
  // etc.
};

// API Routes

// Get mock prices for simulation mode
app.get('/api/prices', (req, res) => {
  res.json(mockPrices);
});

// Receive price alert from frontend
app.post('/api/price-alerts', (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'price_alert') {
    console.log('🔔 Price alert received:', data);
    
    // Log the alert
    console.log(`Alert: ${data.token} changed ${data.changePercent.toFixed(2)}% (${data.previousPrice} → ${data.currentPrice})`);
    
    res.json({ status: 'success', message: 'Price alert received' });
  } else {
    res.status(400).json({ status: 'error', message: 'Invalid alert type' });
  }
});

// Set price alert threshold
app.post('/api/set-alert', (req, res) => {
  const { tokenAddress, threshold, enabled = true } = req.body;
  
  if (!tokenAddress || !threshold) {
    return res.status(400).json({ status: 'error', message: 'Missing tokenAddress or threshold' });
  }
  
  // Remove existing alert for this token
  priceAlerts = priceAlerts.filter(alert => alert.tokenAddress !== tokenAddress);
  
  // Add new alert
  priceAlerts.push({
    id: Date.now(),
    tokenAddress,
    threshold: Math.abs(threshold),
    enabled,
    createdAt: new Date().toISOString()
  });
  
  console.log(`🔔 Alert set for ${tokenAddress}: ${threshold}% threshold`);
  res.json({ status: 'success', message: 'Alert set successfully' });
});

// Remove price alert
app.delete('/api/alerts/:tokenAddress', (req, res) => {
  const { tokenAddress } = req.params;
  
  priceAlerts = priceAlerts.filter(alert => alert.tokenAddress !== tokenAddress);
  
  console.log(`🔕 Alert removed for ${tokenAddress}`);
  res.json({ status: 'success', message: 'Alert removed successfully' });
});

// Get all active alerts
app.get('/api/alerts', (req, res) => {
  res.json(priceAlerts);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Webhook server running at http://localhost:${port}`);
  console.log(`📊 Mock prices initialized for ${Object.keys(mockPrices).length} tokens`);
  
  // Start price simulation (every 48 seconds to match frontend)
  setInterval(simulatePriceChanges, 48000);
  console.log(`⏰ Price simulation started (48-second intervals)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Webhook server shutting down...');
  process.exit(0);
});