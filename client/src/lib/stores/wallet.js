// Migrated wallet store with unified walletService API
import { writable, get } from 'svelte/store';
import { ethers } from 'ethers';
import { notify } from '$lib/notify.js';
import { authenticate, clearSession } from '$lib/authService.js';

// Reactive Network configuration
const REACTIVE_NETWORK = {
  chainId: '0x512358', // 5318008 in hex
  chainName: 'Reactive Network',
  nativeCurrency: { name: 'Reactive', symbol: 'REACT', decimals: 18 },
  rpcUrls: ['https://kopli-rpc.reactive.network'],
  blockExplorerUrls: ['https://kopli.reactscan.net']
};

// Public stores (similar surface to original wallet.js behavior cluster)
export const walletConnected = writable(false);
export const walletAddress = writable('');
export const walletBalance = writable('0');
export const provider = writable(null);
export const signer = writable(null);
export const networkCorrect = writable(false);
export const isConnecting = writable(false);

// Internal aggregate store to ease get() usage by services
const aggregate = writable({ isConnected:false, provider:null });

class WalletService {
  constructor() { this.provider = null; this.signer = null; this.address=''; this.isMetaMaskInstalled=false; }
  async init() { if (typeof window !== 'undefined' && window.ethereum) { this.isMetaMaskInstalled = true; window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this)); window.ethereum.on('chainChanged', this.handleChainChanged.bind(this)); window.ethereum.on('disconnect', this.handleDisconnect.bind(this)); const accounts = await window.ethereum.request({ method:'eth_accounts' }); if (accounts.length>0) await this.connect(); } }
  async connect() { if (!this.isMetaMaskInstalled) { notify.error('MetaMask is not installed. Please install MetaMask to continue.'); window.open('https://metamask.io/download/','_blank'); return false; } try { isConnecting.set(true); const accounts = await window.ethereum.request({ method:'eth_requestAccounts' }); if (accounts.length===0) throw new Error('No accounts found'); this.provider = new ethers.BrowserProvider(window.ethereum); this.signer = await this.provider.getSigner(); this.address = accounts[0]; provider.set(this.provider); signer.set(this.signer); walletAddress.set(this.address); walletConnected.set(true); await this.checkNetwork(); await this.updateBalance(); try { await authenticate(); notify.success('Wallet connected & authenticated'); } catch (authErr) { console.error('Auth signature failed:', authErr); notify.error('Authentication signature declined'); } aggregate.set({ isConnected:true, provider:get(provider), address:this.address }); return true; } catch (error) { console.error('Failed to connect wallet:', error); notify.error(`Failed to connect wallet: ${error.message}`); aggregate.set({ isConnected:false, provider:null }); return false; } finally { isConnecting.set(false); } }
  async disconnect() { this.provider=null; this.signer=null; this.address=''; provider.set(null); signer.set(null); walletAddress.set(''); walletConnected.set(false); networkCorrect.set(false); walletBalance.set('0'); clearSession(); aggregate.set({ isConnected:false, provider:null }); notify.success('Wallet disconnected & session cleared'); }
  async checkNetwork() { if (!this.provider) return false; try { const net = await this.provider.getNetwork(); const isCorrect = net.chainId === 5318008; networkCorrect.set(isCorrect); if (!isCorrect) { notify.error('Please switch to Reactive Network'); await this.switchToReactiveNetwork(); } return isCorrect; } catch (e) { console.error('Failed to check network:', e); return false; } }
  async switchToReactiveNetwork() { if (!window.ethereum) return false; try { await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId: REACTIVE_NETWORK.chainId }] }); networkCorrect.set(true); notify.success('Switched to Reactive Network'); return true; } catch (switchError) { if (switchError.code === 4902) { try { await window.ethereum.request({ method:'wallet_addEthereumChain', params:[REACTIVE_NETWORK] }); networkCorrect.set(true); notify.success('Reactive Network added and switched'); return true; } catch (addError) { console.error('Failed to add network:', addError); notify.error('Failed to add Reactive Network to MetaMask'); return false; } } else { console.error('Failed to switch network:', switchError); notify.error('Failed to switch to Reactive Network'); return false; } } }
  async updateBalance() { if (!this.provider || !this.address) return; try { const balance = await this.provider.getBalance(this.address); walletBalance.set(ethers.formatEther(balance)); } catch (e) { console.error('Failed to get balance:', e); } }
  async handleAccountsChanged(accounts) { if (accounts.length===0) { await this.disconnect(); } else if (accounts[0] !== this.address) { this.address = accounts[0]; walletAddress.set(this.address); await this.updateBalance(); notify.success('Account switched'); } }
  async handleChainChanged() { window.location.reload(); }
  async handleDisconnect() { await this.disconnect(); }
  // Formatting helpers
  formatAddress(addr){ if(!addr) return ''; return `${addr.slice(0,6)}...${addr.slice(-4)}`; }
  formatBalance(bal){ if(!bal) return '0'; const num = parseFloat(bal); if(num===0) return '0'; if(num<0.0001) return '< 0.0001'; if(num<1) return num.toFixed(4); if(num<10) return num.toFixed(3); if(num<100) return num.toFixed(2); return num.toFixed(1); }
  isValidAddress(a){ return ethers.isAddress(a); }
  // Expose aggregated store for services expecting walletStore
  get store(){ return { subscribe: aggregate.subscribe, get: () => get(aggregate) }; }
}

export const walletService = new WalletService();
export const walletStore = walletService.store;