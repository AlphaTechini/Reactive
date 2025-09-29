// Central Reactive Network configuration & contract address registry
// Update these constants with real deployed addresses on Reactive Mainnet.

export const REACTIVE_CHAIN_ID_DEC = 1597;
export const REACTIVE_CHAIN_ID_HEX = '0x' + REACTIVE_CHAIN_ID_DEC.toString(16);

import DEPLOYMENTS from './deployments.js';

export const REACTIVE_RPC_URL = 'https://mainnet-rpc.rnk.dev/';
export const REACTIVE_EXPLORER = 'https://reactscan.net/';

// Core token (REACT) + Portfolio Manager contract (user deposits held here)
// Prefer addresses emitted by the deployment script when available
export const REACT_TOKEN_ADDRESS = DEPLOYMENTS.reactToken || import.meta.env.VITE_REACT_TOKEN_ADDRESS || '0x000000000000000000000000000000000000dEaD';
export const PORTFOLIO_MANAGER_ADDRESS = DEPLOYMENTS.portfolioManager || import.meta.env.VITE_PORTFOLIO_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000001';

export const REACTIVE_NETWORK_PARAMS = {
  chainId: REACTIVE_CHAIN_ID_HEX,
  chainName: 'Reactive Mainnet',
  nativeCurrency: { name: 'Reactive', symbol: 'REACT', decimals: 18 },
  rpcUrls: [REACTIVE_RPC_URL],
  blockExplorerUrls: [REACTIVE_EXPLORER]
};

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

// Helper: supported base tokens for initial dropdown (can be replaced by on-chain discovery)
export const INITIAL_TOKEN_LIST = [
  { symbol: 'REACT', address: REACT_TOKEN_ADDRESS, decimals: 18, category: 'native' },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, category: 'alt' },
  { symbol: 'WBTC', address: '0x0000000000000000000000000000000000000002', decimals: 8, category: 'btc' },
  { symbol: 'USDC', address: '0x0000000000000000000000000000000000000003', decimals: 6, category: 'stable' }
];

export function isReactiveChain(chainId) {
  if (!chainId) return false;
  const dec = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
  return dec === REACTIVE_CHAIN_ID_DEC;
}
