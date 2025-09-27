// Migrated contractService.js (basic portfolio manager)
import { ethers } from 'ethers';
import { walletService } from '$lib/stores/wallet.js';

const PORTFOLIO_MANAGER_ABI = [
  "function setStopLoss(uint256 _percentage) external",
  "function setTakeProfit(uint256 _percentage) external", 
  "function activatePanicMode() external",
  "function deactivatePanicMode() external",
  "function rebalancePortfolio(address[] memory tokens, uint256[] memory targetAllocations) external",
  "function getStopLoss() external view returns (uint256)",
  "function getTakeProfit() external view returns (uint256)",
  "function isPanicMode() external view returns (bool)",
  "function getPortfolioValue() external view returns (uint256)",
  "function getUserTokenBalance(address token) external view returns (uint256)",
  "event StopLossSet(address indexed user, uint256 percentage)",
  "event TakeProfitSet(address indexed user, uint256 percentage)",
  "event PanicModeTriggered(address indexed user)",
  "event PanicModeDeactivated(address indexed user)",
  "event PortfolioRebalanced(address indexed user, address[] tokens, uint256[] allocations)"
];

const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

class ContractService {
  constructor() { this.contract = null; this.provider = null; this.signer = null; }
  async initialize() { try { const wallet = walletService.store.get(); if (!wallet.isConnected || !wallet.provider) throw new Error('Wallet not connected'); this.provider = new ethers.BrowserProvider(wallet.provider); this.signer = await this.provider.getSigner(); this.contract = new ethers.Contract(CONTRACT_ADDRESS, PORTFOLIO_MANAGER_ABI, this.signer); return true; } catch (e) { console.error('Failed to initialize contract service:', e); throw e; } }
  async setStopLoss(p) { if (!this.contract) await this.initialize(); try { const bps = Math.floor(p * 100); const tx = await this.contract.setStopLoss(bps); await tx.wait(); return tx; } catch (e) { console.error('Failed to set stop loss:', e); throw e; } }
  async setTakeProfit(p) { if (!this.contract) await this.initialize(); try { const bps = Math.floor(p * 100); const tx = await this.contract.setTakeProfit(bps); await tx.wait(); return tx; } catch (e) { console.error('Failed to set take profit:', e); throw e; } }
  async activatePanicMode() { if (!this.contract) await this.initialize(); try { const tx = await this.contract.activatePanicMode(); await tx.wait(); return tx; } catch (e) { console.error('Failed to activate panic mode:', e); throw e; } }
  async deactivatePanicMode() { if (!this.contract) await this.initialize(); try { const tx = await this.contract.deactivatePanicMode(); await tx.wait(); return tx; } catch (e) { console.error('Failed to deactivate panic mode:', e); throw e; } }
  async rebalancePortfolio(tokens, allocations) { if (!this.contract) await this.initialize(); try { const bps = allocations.map(a => Math.floor(a * 100)); const tx = await this.contract.rebalancePortfolio(tokens, bps); await tx.wait(); return tx; } catch (e) { console.error('Failed to rebalance portfolio:', e); throw e; } }
  async getStopLoss() { if (!this.contract) await this.initialize(); try { const r = await this.contract.getStopLoss(); return r.toNumber() / 100; } catch (e) { console.error('Failed to get stop loss:', e); throw e; } }
  async getTakeProfit() { if (!this.contract) await this.initialize(); try { const r = await this.contract.getTakeProfit(); return r.toNumber() / 100; } catch (e) { console.error('Failed to get take profit:', e); throw e; } }
  async isPanicMode() { if (!this.contract) await this.initialize(); try { return await this.contract.isPanicMode(); } catch (e) { console.error('Failed to check panic mode:', e); throw e; } }
  async getPortfolioValue() { if (!this.contract) await this.initialize(); try { const v = await this.contract.getPortfolioValue(); return ethers.formatEther(v); } catch (e) { console.error('Failed to get portfolio value:', e); throw e; } }
  async getUserTokenBalance(token) { if (!this.contract) await this.initialize(); try { const b = await this.contract.getUserTokenBalance(token); return ethers.formatEther(b); } catch (e) { console.error('Failed to get token balance:', e); throw e; } }
  subscribeToEvents(callbacks = {}) { if (!this.contract) return; if (callbacks.onStopLossSet) this.contract.on('StopLossSet', (user, percentage, evt) => callbacks.onStopLossSet({ user, percentage: percentage.toNumber() / 100, transactionHash: evt.transactionHash, blockNumber: evt.blockNumber })); if (callbacks.onTakeProfitSet) this.contract.on('TakeProfitSet', (user, percentage, evt) => callbacks.onTakeProfitSet({ user, percentage: percentage.toNumber() / 100, transactionHash: evt.transactionHash, blockNumber: evt.blockNumber })); if (callbacks.onPanicModeTriggered) this.contract.on('PanicModeTriggered', (user, evt) => callbacks.onPanicModeTriggered({ user, transactionHash: evt.transactionHash, blockNumber: evt.blockNumber })); if (callbacks.onPanicModeDeactivated) this.contract.on('PanicModeDeactivated', (user, evt) => callbacks.onPanicModeDeactivated({ user, transactionHash: evt.transactionHash, blockNumber: evt.blockNumber })); if (callbacks.onPortfolioRebalanced) this.contract.on('PortfolioRebalanced', (user, tokens, allocations, evt) => callbacks.onPortfolioRebalanced({ user, tokens, allocations: allocations.map(a => a.toNumber() / 100), transactionHash: evt.transactionHash, blockNumber: evt.blockNumber })); }
  unsubscribeFromEvents() { if (this.contract) this.contract.removeAllListeners(); }
  async estimateGas(fn, ...args) { if (!this.contract) await this.initialize(); try { return await this.contract.estimateGas[fn](...args); } catch (e) { console.error(`Failed to estimate gas for ${fn}:`, e); throw e; } }
  async getTransactionReceipt(txHash) { if (!this.provider) await this.initialize(); try { return await this.provider.getTransactionReceipt(txHash); } catch (e) { console.error('Failed to get receipt:', e); throw e; } }
  formatContractError(error) { if (error?.reason) return error.reason; if (error?.data?.message) return error.data.message; if (error?.message) { const m = error.message; if (m.includes('user rejected transaction')) return 'Transaction was rejected by user'; if (m.includes('insufficient funds')) return 'Insufficient funds for transaction'; if (m.includes('gas')) return 'Transaction failed due to gas issues'; return m; } return 'Unknown contract error occurred'; }
}

export const contractService = new ContractService();