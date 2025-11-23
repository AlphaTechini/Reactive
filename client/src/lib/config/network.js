// Central Reactive Network configuration & contract address registry
// Update these constants with real deployed addresses on Reactive Mainnet.

// Mainnet Configuration
export const REACTIVE_MAINNET_CHAIN_ID_DEC = 1597;
export const REACTIVE_MAINNET_CHAIN_ID_HEX = '0x' + REACTIVE_MAINNET_CHAIN_ID_DEC.toString(16);
export const REACTIVE_MAINNET_RPC_URL = 'https://mainnet-rpc.rnk.dev/';
export const REACTIVE_MAINNET_EXPLORER = 'https://reactscan.net/';

// Testnet Configuration
export const REACTIVE_TESTNET_CHAIN_ID_DEC = 5318008;
export const REACTIVE_TESTNET_CHAIN_ID_HEX = '0x' + REACTIVE_TESTNET_CHAIN_ID_DEC.toString(16);
export const REACTIVE_TESTNET_RPC_URL = import.meta.env.VITE_TESTNET_RPC_URL || 'https://testnet-rpc.rnk.dev/';
export const REACTIVE_TESTNET_EXPLORER = import.meta.env.VITE_TESTNET_EXPLORER_URL || 'https://testnet.reactscan.net/';

// Legacy exports (default to mainnet for backward compatibility)
export const REACTIVE_CHAIN_ID_DEC = REACTIVE_MAINNET_CHAIN_ID_DEC;
export const REACTIVE_CHAIN_ID_HEX = REACTIVE_MAINNET_CHAIN_ID_HEX;
export const REACTIVE_RPC_URL = REACTIVE_MAINNET_RPC_URL;
export const REACTIVE_EXPLORER = REACTIVE_MAINNET_EXPLORER;

import DEPLOYMENTS from './deployments.js';

// Core token (REACT) + Portfolio Manager contract (user deposits held here)
// Prefer addresses emitted by the deployment script when available
export const REACT_TOKEN_ADDRESS = DEPLOYMENTS.reactToken || import.meta.env.VITE_REACT_TOKEN_ADDRESS || '0x000000000000000000000000000000000000dEaD';
export const PORTFOLIO_MANAGER_ADDRESS = DEPLOYMENTS.portfolioManager || import.meta.env.VITE_PORTFOLIO_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000001';

// Mainnet Network Parameters
export const REACTIVE_MAINNET_NETWORK_PARAMS = {
  chainId: REACTIVE_MAINNET_CHAIN_ID_HEX,
  chainName: 'Reactive Mainnet',
  nativeCurrency: { name: 'Reactive', symbol: 'REACT', decimals: 18 },
  rpcUrls: [REACTIVE_MAINNET_RPC_URL],
  blockExplorerUrls: [REACTIVE_MAINNET_EXPLORER]
};

// Testnet Network Parameters
export const REACTIVE_TESTNET_NETWORK_PARAMS = {
  chainId: REACTIVE_TESTNET_CHAIN_ID_HEX,
  chainName: 'Reactive Testnet',
  nativeCurrency: { name: 'Test Reactive', symbol: 'tREACT', decimals: 18 },
  rpcUrls: [REACTIVE_TESTNET_RPC_URL],
  blockExplorerUrls: [REACTIVE_TESTNET_EXPLORER]
};

// Local Hardhat Network Configuration (for simulation mode)
export const LOCAL_NETWORK_CHAIN_ID_DEC = 1337;
export const LOCAL_NETWORK_CHAIN_ID_HEX = '0x539';
export const LOCAL_NETWORK_RPC_URL = 'http://127.0.0.1:8545';

export const LOCAL_NETWORK_PARAMS = {
  chainId: LOCAL_NETWORK_CHAIN_ID_HEX,
  chainName: 'Hardhat Local',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: [LOCAL_NETWORK_RPC_URL],
  blockExplorerUrls: []
};

// Legacy export (default to mainnet for backward compatibility)
export const REACTIVE_NETWORK_PARAMS = REACTIVE_MAINNET_NETWORK_PARAMS;

/**
 * Get network configuration based on mode
 * @param {string} mode - 'live' or 'simulation'
 * @returns {Object} Network configuration object
 */
export function getNetworkConfig(mode) {
  if (mode === 'simulation') {
    return {
      chainId: REACTIVE_TESTNET_CHAIN_ID_HEX,
      chainIdDec: REACTIVE_TESTNET_CHAIN_ID_DEC,
      chainName: 'Reactive Testnet',
      rpcUrl: REACTIVE_TESTNET_RPC_URL,
      explorerUrl: REACTIVE_TESTNET_EXPLORER,
      nativeCurrency: { name: 'Test Reactive', symbol: 'tREACT', decimals: 18 },
      networkParams: REACTIVE_TESTNET_NETWORK_PARAMS
    };
  }
  
  // Default to mainnet for 'live' mode
  return {
    chainId: REACTIVE_MAINNET_CHAIN_ID_HEX,
    chainIdDec: REACTIVE_MAINNET_CHAIN_ID_DEC,
    chainName: 'Reactive Mainnet',
    rpcUrl: REACTIVE_MAINNET_RPC_URL,
    explorerUrl: REACTIVE_MAINNET_EXPLORER,
    nativeCurrency: { name: 'Reactive', symbol: 'REACT', decimals: 18 },
    networkParams: REACTIVE_MAINNET_NETWORK_PARAMS
  };
}

// Minimal ERC20 ABI (balance, decimals, symbol, approve flow)
export const ERC20_MIN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)'
];

// Portfolio interface (user deposits of REACT only)
export const PORTFOLIO_ABI = [
  'function deposit(uint256 amount) external',
  'function withdraw(uint256 amount) external',
  'function balanceOf(address user) view returns (uint256)',
  'event Deposited(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount)'
];

// Uniswap-like router address (if you have a deployed router on Reactive; otherwise leave null)
export const SWAP_ROUTER_ADDRESS = import.meta.env.VITE_SWAP_ROUTER_ADDRESS || null;

// Helper: supported base tokens for initial dropdown with correct ERC20 addresses
export const INITIAL_TOKEN_LIST = [
  // Core Assets (2)
  { symbol: 'BTC', name: 'Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8, category: 'core' }, // WBTC address
  { symbol: 'ETH', name: 'Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, category: 'core' }, // WETH address
  
  // Stablecoins (1)
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, category: 'stable' },
  
  // Altcoins (20)
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, category: 'alt' },
  { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, category: 'alt' },
  { symbol: 'SNX', name: 'Synthetix', address: '0xC011A72400E58ec99Ee497CF89E3775d4bd732F', decimals: 18, category: 'alt' },
  { symbol: 'SUSHI', name: 'SushiSwap', address: '0x6B3595068778DD592e39A122f4f5A5cF09C90fE2', decimals: 18, category: 'alt' },
  { symbol: 'CRV', name: 'Curve DAO', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18, category: 'alt' },
  { symbol: 'MKR', name: 'Maker', address: '0x9f8F72aA9304c8B593d555F12ef6589cC3A579A2', decimals: 18, category: 'alt' },
  { symbol: 'COMP', name: 'Compound', address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', decimals: 18, category: 'alt' },
  { symbol: 'YFI', name: 'yearn.finance', address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', decimals: 18, category: 'alt' },
  { symbol: 'GRT', name: 'The Graph', address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', decimals: 18, category: 'alt' },
  { symbol: 'SAND', name: 'The Sandbox', address: '0x3845badAde8e6dFF049820680d1F14bD0F3903A5d', decimals: 18, category: 'alt' },
  { symbol: 'MANA', name: 'Decentraland', address: '0x0f5D2fB29fb7D3CFeE444a200298f468908cC39D', decimals: 18, category: 'alt' },
  { symbol: 'LDO', name: 'Lido DAO', address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18, category: 'alt' },
  { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18, category: 'alt' },
  { symbol: 'ARB', name: 'Arbitrum', address: '0x912ce59144191c1204e64559fe8253a0e49e6548', decimals: 18, category: 'alt' },
  { symbol: 'BAL', name: 'Balancer', address: '0xba100000625a3754423978a60c9317c58a424e3d', decimals: 18, category: 'alt' },
  { symbol: 'FXS', name: 'Frax Share', address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', decimals: 18, category: 'alt' },
  { symbol: 'IMX', name: 'Immutable X', address: '0xf57e7e7c23978c3caec3c3548e3d615c346e79ff', decimals: 18, category: 'alt' },
  { symbol: '1INCH', name: '1inch', address: '0x111111111117dc0aa78b770fa6a738034120c302', decimals: 18, category: 'alt' },
  { symbol: 'RNDR', name: 'Render', address: '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24', decimals: 18, category: 'alt' },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, category: 'alt' },
  
  // Memecoins (10)
  { symbol: 'DOGE', name: 'Dogecoin', address: '0x420693bF3bF2a5c07cc5bA2eF2E4A4f9E3e7d3F0', decimals: 8, category: 'meme' },
  { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, category: 'meme' },
  { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, category: 'meme' },
  { symbol: 'FLOKI', name: 'Floki Inu', address: '0xcf0c122c6b73ff809c693db761e7baebe62b6a2e', decimals: 9, category: 'meme' },
  { symbol: 'ELON', name: 'Dogelon Mars', address: '0x761d38e5ddf6ccf6cf7c55759d5210750b5d60f3', decimals: 18, category: 'meme' },
  { symbol: 'AKITA', name: 'Akita Inu', address: '0x3301ee63fb29f863f2333bd4466acb46cd8323e6', decimals: 18, category: 'meme' },
  { symbol: 'VINU', name: 'Vita Inu', address: '0xafcdd4f666c84fed1d8bd825aa762e3714f652c9', decimals: 18, category: 'meme' },
  { symbol: 'SAITAMA', name: 'Saitama V2', address: '0x2c297021ff013dfb9d45c88dbd8e24a3e61040b3', decimals: 9, category: 'meme' },
  
  // Reactive Native
  { symbol: 'REACT', name: 'Reactive Token', address: REACT_TOKEN_ADDRESS, decimals: 18, category: 'reactive' }
];

/**
 * Check if a chain ID is a Reactive chain (mainnet or testnet)
 * @param {string|number} chainId - Chain ID to check
 * @returns {boolean} True if the chain is Reactive mainnet or testnet
 */
export function isReactiveChain(chainId) {
  if (!chainId) return false;
  const dec = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
  return dec === REACTIVE_MAINNET_CHAIN_ID_DEC || dec === REACTIVE_TESTNET_CHAIN_ID_DEC;
}

/**
 * Check if a chain ID is Reactive mainnet
 * @param {string|number} chainId - Chain ID to check
 * @returns {boolean} True if the chain is Reactive mainnet
 */
export function isReactiveMainnet(chainId) {
  if (!chainId) return false;
  const dec = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
  return dec === REACTIVE_MAINNET_CHAIN_ID_DEC;
}

/**
 * Check if a chain ID is Reactive testnet
 * @param {string|number} chainId - Chain ID to check
 * @returns {boolean} True if the chain is Reactive testnet
 */
export function isReactiveTestnet(chainId) {
  if (!chainId) return false;
  const dec = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
  return dec === REACTIVE_TESTNET_CHAIN_ID_DEC;
}
