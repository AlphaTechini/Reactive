// Migrated wallet store with unified walletService API
import { writable, get } from 'svelte/store';
import { ethers } from 'ethers';
import { notify } from '$lib/notify.js';
import { authenticate, clearSession } from '$lib/authService.js';

// Reactive Network configuration (parameterized via Vite env for real network vs testnet)
const ENV_CHAIN_ID_DEC = Number(import.meta.env.VITE_REACTIVE_CHAIN_ID || '5318008');
const REACTIVE_CHAIN_ID_HEX = '0x' + ENV_CHAIN_ID_DEC.toString(16);
const REACTIVE_NETWORK = {
  chainId: REACTIVE_CHAIN_ID_HEX,
  chainName: import.meta.env.VITE_REACTIVE_CHAIN_NAME || 'Reactive Network',
  nativeCurrency: { name: 'Reactive', symbol: (import.meta.env.VITE_REACTIVE_SYMBOL || 'REACT'), decimals: 18 },
  rpcUrls: [import.meta.env.VITE_REACTIVE_RPC || 'https://kopli-rpc.reactive.network'],
  blockExplorerUrls: [import.meta.env.VITE_REACTIVE_EXPLORER || 'https://kopli.reactscan.net']
};

// Public stores (similar surface to original wallet.js behavior cluster)
export const walletConnected = writable(false);
export const walletAddress = writable('');
export const walletBalance = writable('0');
export const provider = writable(null);
export const signer = writable(null);
export const networkCorrect = writable(false);
export const isConnecting = writable(false);
export const isMetaMaskInstalledStore = writable(false);

// Internal aggregate store to ease get() usage by services
const aggregate = writable({ isConnected:false, provider:null });

class WalletService {
  constructor() { this.provider = null; this.signer = null; this.address=''; this.isMetaMaskInstalled=false; this.ethereum=null; }
  async init() {
    if (typeof window === 'undefined') return;
    // Resolve MetaMask provider explicitly (handles multi-provider injectors)
    const resolveMetaMaskProvider = () => {
      if (window.ethereum?.providers?.length) {
        const mm = window.ethereum.providers.find(p => p.isMetaMask);
        if (mm) return mm;
      }
      if (window.ethereum?.isMetaMask) return window.ethereum;
      return null;
    };
    const mmProvider = resolveMetaMaskProvider();
    if (mmProvider) {
      this.isMetaMaskInstalled = true; this.ethereum = mmProvider;
      isMetaMaskInstalledStore.set(true);
      mmProvider.removeListener?.('accountsChanged', this.handleAccountsChanged.bind(this)); // defensive cleanup
      mmProvider.on?.('accountsChanged', this.handleAccountsChanged.bind(this));
      mmProvider.on?.('chainChanged', this.handleChainChanged.bind(this));
      mmProvider.on?.('disconnect', this.handleDisconnect.bind(this));
      try { const accounts = await mmProvider.request({ method:'eth_accounts' }); if (accounts.length>0) await this.connect({ silentAuth:true }); } catch {/* ignore */}
    } else { this.isMetaMaskInstalled = false; this.ethereum=null; isMetaMaskInstalledStore.set(false); }
  }
  getInstallUrl(){
    // Basic user-agent detection for mobile vs desktop
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/Android/i.test(ua)) return 'https://play.google.com/store/apps/details?id=io.metamask';
      if (/iPhone|iPad|iPod/i.test(ua)) return 'https://apps.apple.com/app/metamask/id1438144202';
    }
    return 'https://metamask.io/download/';
  }
  async promptInstall(){
    if (typeof window !== 'undefined') window.open(this.getInstallUrl(), '_blank', 'noopener');
  }
  async connect(options = {}) {
    if (!this.isMetaMaskInstalled) {
      notify.error('MetaMask not detected – please install it first.');
      return false;
    }
    try {
      isConnecting.set(true);
      const eth = this.ethereum || window.ethereum; // fallback
      const accounts = await eth.request({ method:'eth_requestAccounts' });
      if (!accounts || accounts.length===0) throw new Error('No accounts returned by provider');
      this.provider = new ethers.BrowserProvider(eth);
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];
      provider.set(this.provider); signer.set(this.signer); walletAddress.set(this.address); walletConnected.set(true);
      if (typeof window !== 'undefined') localStorage.setItem('reactiveWalletAddress', this.address);
      await this.checkNetwork();
      await this.updateBalance();
      // Only attempt authentication if not a silent auto-init or if forced later
      if (!options.silentAuth) {
        try { await authenticate(); notify.success('Wallet connected & authenticated'); }
        catch (authErr) { console.error('Auth signature failed:', authErr); notify.error('Authentication signature declined'); }
      }
      aggregate.set({ isConnected:true, provider:get(provider), address:this.address });
      return true;
    } catch (error) {
      if (error?.code === 4001) {
        notify.error('Connection request rejected in MetaMask');
      } else {
        console.error('Failed to connect wallet:', error);
        notify.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      }
      aggregate.set({ isConnected:false, provider:null });
      return false;
    } finally { isConnecting.set(false); }
  }
  async disconnect() { this.provider=null; this.signer=null; this.address=''; provider.set(null); signer.set(null); walletAddress.set(''); walletConnected.set(false); networkCorrect.set(false); walletBalance.set('0'); clearSession(); aggregate.set({ isConnected:false, provider:null }); notify.success('Wallet disconnected & session cleared'); }
  async checkNetwork() { if (!this.provider) return false; try { const net = await this.provider.getNetwork(); const isCorrect = Number(net.chainId) === ENV_CHAIN_ID_DEC; networkCorrect.set(isCorrect); if (!isCorrect) { notify.error('Please switch to Reactive Network'); await this.switchToReactiveNetwork(); } return isCorrect; } catch (e) { console.error('Failed to check network:', e); return false; } }
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