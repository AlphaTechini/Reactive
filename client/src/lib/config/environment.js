/**
 * Environment Configuration
 * 
 * Centralizes all environment variables and configuration for the application
 */

// API Endpoints
export const API_CONFIG = {
  priceIngestUrl: import.meta.env.VITE_PRICE_INGEST_API_URL || 'http://localhost:3001/api/prices',
  coingeckoUrl: import.meta.env.VITE_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  uniswapUrl: import.meta.env.VITE_UNISWAP_API_URL || 'http://localhost:3001/api/uniswap-prices'
};

// Smart Contract Addresses
export const CONTRACT_ADDRESSES = {
  portfolioManager: import.meta.env.VITE_PORTFOLIO_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000',
  automationController: import.meta.env.VITE_AUTOMATION_CONTROLLER_ADDRESS || '0x0000000000000000000000000000000000000000'
};

// Network Configuration
export const NETWORK_CONFIG = {
  name: import.meta.env.VITE_NETWORK_NAME || 'reactive-testnet',
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '1'),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://rpc.reactive.network',
  // Testnet-specific configuration
  testnet: {
    rpcUrl: import.meta.env.VITE_TESTNET_RPC_URL || 'https://testnet-rpc.rnk.dev/',
    explorerUrl: import.meta.env.VITE_TESTNET_EXPLORER_URL || 'https://testnet.reactscan.net/',
    chainId: parseInt(import.meta.env.VITE_TESTNET_CHAIN_ID || '5318008')
  }
};

// Service Configuration
export const SERVICE_CONFIG = {
  enablePriceCaching: import.meta.env.VITE_ENABLE_PRICE_CACHING !== 'false',
  priceCacheTTL: parseInt(import.meta.env.VITE_PRICE_CACHE_TTL || '30000'),
  priceStalenessThreshold: parseInt(import.meta.env.VITE_PRICE_STALENESS_THRESHOLD || '300000')
};

// Rebalancing Configuration
export const REBALANCING_CONFIG = {
  defaultDriftThreshold: parseFloat(import.meta.env.VITE_DEFAULT_DRIFT_THRESHOLD || '0.05'),
  defaultMaxGasPercent: parseFloat(import.meta.env.VITE_DEFAULT_MAX_GAS_PERCENT || '0.02'),
  defaultMinTradeValue: parseFloat(import.meta.env.VITE_DEFAULT_MIN_TRADE_VALUE || '10')
};

// Risk Management Configuration
export const RISK_CONFIG = {
  defaultTrailingStopPercent: parseFloat(import.meta.env.VITE_DEFAULT_TRAILING_STOP_PERCENT || '0.05'),
  defaultStopLossPercent: parseFloat(import.meta.env.VITE_DEFAULT_STOP_LOSS_PERCENT || '0.10'),
  panicModeTimeout: parseInt(import.meta.env.VITE_PANIC_MODE_TIMEOUT || '60000')
};

// Error Handling Configuration
export const ERROR_HANDLING_CONFIG = {
  maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES || '3'),
  baseRetryDelay: parseInt(import.meta.env.VITE_BASE_RETRY_DELAY || '1000'),
  enableHealthChecks: import.meta.env.VITE_ENABLE_HEALTH_CHECKS !== 'false'
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',
  enableSounds: import.meta.env.VITE_ENABLE_SOUNDS === 'true',
  enableDesktopNotifications: import.meta.env.VITE_ENABLE_DESKTOP_NOTIFICATIONS === 'true',
  autoHideDelay: parseInt(import.meta.env.VITE_AUTO_HIDE_DELAY || '5000')
};

// Feature Flags
export const FEATURE_FLAGS = {
  enableManualTrading: import.meta.env.VITE_ENABLE_MANUAL_TRADING !== 'false',
  enableAutomatedTrading: import.meta.env.VITE_ENABLE_AUTOMATED_TRADING !== 'false',
  enableRiskManagement: import.meta.env.VITE_ENABLE_RISK_MANAGEMENT !== 'false',
  enablePanicMode: import.meta.env.VITE_ENABLE_PANIC_MODE !== 'false'
};

// Development Configuration
export const DEV_CONFIG = {
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info'
};

// Export all configuration
export const CONFIG = {
  api: API_CONFIG,
  contracts: CONTRACT_ADDRESSES,
  network: NETWORK_CONFIG,
  service: SERVICE_CONFIG,
  rebalancing: REBALANCING_CONFIG,
  risk: RISK_CONFIG,
  errorHandling: ERROR_HANDLING_CONFIG,
  notifications: NOTIFICATION_CONFIG,
  features: FEATURE_FLAGS,
  dev: DEV_CONFIG
};

export default CONFIG;
