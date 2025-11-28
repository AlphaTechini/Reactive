// Migrated wallet store with unified walletService API
import { writable, get } from 'svelte/store';
import { ethers } from 'ethers';
import { notify } from '$lib/notify.js';
import { authenticate, clearSession } from '$lib/authService.js';

// Reactive Network configuration (parameterized via Vite env for real network vs testnet)
const ENV_CHAIN_ID_DEC = Number(import.meta.env.VITE_REACTIVE_CHAIN_ID || '1597');
const REACTIVE_CHAIN_ID_HEX = '0x' + ENV_CHAIN_ID_DEC.toString(16);
const REACTIVE_NETWORK = {
  chainId: REACTIVE_CHAIN_ID_HEX,
  chainName: import.meta.env.VITE_REACTIVE_CHAIN_NAME || 'Reactive Mainnet',
  nativeCurrency: { name: 'Reactive', symbol: (import.meta.env.VITE_REACTIVE_SYMBOL || 'REACT'), decimals: 18 },
  rpcUrls: [import.meta.env.VITE_REACTIVE_RPC || 'https://mainnet-rpc.rnk.dev/'],
  blockExplorerUrls: [import.meta.env.VITE_REACTIVE_EXPLORER || 'https://reactscan.net/']
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
export const connectionError = writable(null);
// Read-only RPC provider (fallback when user denies permissions or wallet not available)
export const rpcProvider = writable(null);

// Internal aggregate store to ease get() usage by services
const aggregate = writable({ isConnected:false, provider:null });

class WalletService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address='';
    this.isMetaMaskInstalled=false;
    this.ethereum=null;
    // Auto-connect configuration (can be tuned via Vite env)
    this.AUTO_CONNECT = (import.meta.env.VITE_WALLET_AUTO_CONNECT || 'true') === 'true';
    this.AGGRESSIVE_CONNECT = (import.meta.env.VITE_WALLET_AGGRESSIVE_CONNECT || 'false') === 'true';
    this.AUTO_CONNECT_RETRY_MS = Number(import.meta.env.VITE_WALLET_AUTO_RETRY_MS || 4000);
    this._autoTriedRequest = false;
  }
  async init() {
    if (typeof window === 'undefined') return;
    
    console.log('🔧 Initializing wallet service...');
    
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
    
    // Initialize read-only RPC provider immediately (use Reactive RPC URL)
    try {
      const rpcUrl = REACTIVE_NETWORK.rpcUrls && REACTIVE_NETWORK.rpcUrls.length ? REACTIVE_NETWORK.rpcUrls[0] : 'https://mainnet-rpc.rnk.dev/';
      const readonly = new ethers.JsonRpcProvider(rpcUrl);
      this.rpcProvider = readonly;
      rpcProvider.set(this.rpcProvider);
      console.log('✅ Read-only RPC provider initialized');
    } catch (e) {
      console.warn('⚠️ Failed to initialize read-only RPC provider:', e);
    }

    if (mmProvider) {
      console.log('✅ MetaMask detected');
      this.isMetaMaskInstalled = true; 
      this.ethereum = mmProvider;
      isMetaMaskInstalledStore.set(true);
      
      // Remove any existing listeners before adding new ones (defensive cleanup)
      try {
        mmProvider.removeListener?.('accountsChanged', this.handleAccountsChanged.bind(this));
        mmProvider.removeListener?.('chainChanged', this.handleChainChanged.bind(this));
        mmProvider.removeListener?.('disconnect', this.handleDisconnect.bind(this));
      } catch (e) {
        console.warn('⚠️ Error removing old listeners:', e);
      }
      
      // Add event listeners
      try {
        mmProvider.on?.('accountsChanged', this.handleAccountsChanged.bind(this));
        mmProvider.on?.('chainChanged', this.handleChainChanged.bind(this));
        mmProvider.on?.('disconnect', this.handleDisconnect.bind(this));
        console.log('✅ MetaMask event listeners registered');
      } catch (e) {
        console.warn('⚠️ Error adding event listeners:', e);
      }
      
      // 1. Passive check first (no popup) to see if already authorized
      try {
        const accounts = await mmProvider.request({ method:'eth_accounts' });
        if (accounts.length>0) {
          console.log('✅ Found existing authorized account, auto-connecting...');
          await this.connect({ silentAuth:true });
          return;
        }
      } catch (e) {
        console.warn('⚠️ Passive account check failed:', e);
      }

      // 2. If user previously connected (we stored address) and AUTO_CONNECT enabled, attempt a polite connect
      if (this.AUTO_CONNECT && !this._autoTriedRequest) {
        const remembered = window.localStorage?.getItem('reactiveWalletAddress');
        if (remembered && this.AGGRESSIVE_CONNECT) {
          // Aggressive mode: immediately request accounts which shows popup
          console.log('🔄 Aggressive auto-connect enabled, requesting accounts...');
          this._autoTriedRequest = true;
          setTimeout(() => {
            this.connect({ silentAuth:true }).catch((e)=>{
              console.warn('⚠️ Auto-connect failed:', e);
            });
          }, 300); // slight delay so UI renders first
        } else if (remembered) {
          // Polite mode: schedule a passive retry using eth_accounts (some extensions refresh later)
          console.log('🔄 Polite auto-connect enabled, scheduling retry...');
          setTimeout(async () => {
            try {
              const accs = await mmProvider.request({ method:'eth_accounts' });
              if (accs.length>0) {
                this._autoTriedRequest = true;
                console.log('✅ Retry found authorized account, connecting...');
                await this.connect({ silentAuth:true });
              }
            } catch (e) {
              console.warn('⚠️ Auto-connect retry failed:', e);
            }
          }, this.AUTO_CONNECT_RETRY_MS);
        }
      }
    } else { 
      console.log('❌ MetaMask not detected');
      this.isMetaMaskInstalled = false; 
      this.ethereum=null; 
      isMetaMaskInstalledStore.set(false); 
    }
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
      await this.promptInstall();
      return false;
    }
    
    try {
      isConnecting.set(true);
      console.log('🔗 Connecting to MetaMask...');
      
      const eth = this.ethereum || window.ethereum;
      if (!eth) {
        throw new Error('Ethereum provider not found');
      }
      
      // Request accounts - this triggers MetaMask popup immediately
      console.log('📱 Requesting accounts from MetaMask...');
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned by MetaMask');
      }
      
      console.log('✅ MetaMask accounts received:', accounts.length);
      
      // Create ethers.js v6 BrowserProvider
      this.provider = new ethers.BrowserProvider(eth);
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];
      
      console.log('✅ Ethers provider created successfully');
      console.log('✅ Connected address:', this.address);
      
      // Update stores
      provider.set(this.provider);
      signer.set(this.signer);
      walletAddress.set(this.address);
      walletConnected.set(true);
      rpcProvider.set(this.provider);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('reactiveWalletAddress', this.address);
      }
      
      this._autoTriedRequest = true;
      
      // Check network - let MetaMask handle the switch prompt naturally
      const isCorrectNetwork = await this.checkNetwork();
      if (!isCorrectNetwork) {
        console.log('⚠️ Wrong network detected');
        notify.info('Please switch to Reactive Network in MetaMask', { duration: 5000 });
        // Don't auto-switch - let the user see MetaMask's prompt
      }
      
      await this.updateBalance();
      
      // Store wallet to IPFS (non-blocking)
      this.storeWalletToIPFS().catch(err => {
        console.warn('IPFS storage failed (non-critical):', err);
      });
      
      aggregate.set({ isConnected: true, provider: this.provider, address: this.address });
      
      // Clear any previous connection errors
      connectionError.set(null);
      
      notify.success('Wallet connected successfully!');
      return true;
    } catch (error) {
      console.error('❌ Connection error:', error);
      
      // Handle specific error cases
      if (error?.code === 4001) {
        notify.error('Connection rejected by user');
      } else if (error?.code === -32002) {
        notify.error('Connection request already pending - please check MetaMask');
      } else if (error.message?.includes('timeout') || error.message?.includes('blocked')) {
        notify.error('Connection timeout - please check if MetaMask popup is blocked');
      } else if (error.message?.includes('User rejected')) {
        notify.error('Connection rejected by user');
      } else {
        notify.error(`Connection failed: ${error.message || 'Unknown error'}`);
      }
      
      // Reset connection state
      this.provider = null;
      this.signer = null;
      this.address = '';
      provider.set(null);
      signer.set(null);
      walletAddress.set('');
      walletConnected.set(false);
      connectionError.set(error.message || 'Connection failed');
      aggregate.set({ isConnected: false, provider: null });
      
      // ensure we still expose a read-only rpcProvider
      try { 
        const rpcUrl = REACTIVE_NETWORK.rpcUrls && REACTIVE_NETWORK.rpcUrls.length ? REACTIVE_NETWORK.rpcUrls[0] : 'https://mainnet-rpc.rnk.dev/'; 
        this.rpcProvider = new ethers.JsonRpcProvider(rpcUrl); 
        rpcProvider.set(this.rpcProvider); 
      } catch(rpcError) {
        console.warn('Failed to set fallback RPC provider:', rpcError);
      }
      return false;
    } finally { 
      isConnecting.set(false); 
    }
  }
  async disconnect() { 
    console.log('🔌 Disconnecting wallet...');
    this.provider=null; 
    this.signer=null; 
    this.address=''; 
    provider.set(null); 
    signer.set(null); 
    walletAddress.set(''); 
    walletConnected.set(false); 
    networkCorrect.set(false); 
    walletBalance.set('0'); 
    connectionError.set(null);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reactiveWalletAddress');
    }
    
    clearSession(); 
    aggregate.set({ isConnected:false, provider:null }); 
    
    // Ensure read-only RPC provider is still available
    try { 
      const rpcUrl = REACTIVE_NETWORK.rpcUrls && REACTIVE_NETWORK.rpcUrls.length ? REACTIVE_NETWORK.rpcUrls[0] : 'https://mainnet-rpc.rnk.dev/'; 
      this.rpcProvider = new ethers.JsonRpcProvider(rpcUrl); 
      rpcProvider.set(this.rpcProvider); 
    } catch(rpcError) {
      console.warn('Failed to set fallback RPC provider:', rpcError);
    }
    
    notify.success('Wallet disconnected & session cleared'); 
  }
  async checkNetwork() { if (!this.provider) return false; try { const { appMode } = await import('$lib/stores/appMode.js'); const mode = get(appMode); if (mode === 'simulation') { networkCorrect.set(true); return true; } const net = await this.provider.getNetwork(); const isCorrect = Number(net.chainId) === ENV_CHAIN_ID_DEC; networkCorrect.set(isCorrect); return isCorrect; } catch (e) { console.error('Failed to check network:', e); return false; } }
  async switchToReactiveNetwork() { if (!window.ethereum) return false; try { await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId: REACTIVE_NETWORK.chainId }] }); networkCorrect.set(true); notify.success('Switched to Reactive Network'); return true; } catch (switchError) { if (switchError.code === 4902) { try { await window.ethereum.request({ method:'wallet_addEthereumChain', params:[REACTIVE_NETWORK] }); networkCorrect.set(true); notify.success('Reactive Network added and switched'); return true; } catch (addError) { console.error('Failed to add network:', addError); notify.error('Failed to add Reactive Network to MetaMask'); return false; } } else { console.error('Failed to switch network:', switchError); notify.error('Failed to switch to Reactive Network'); return false; } } }
  
  // Store wallet address and basic info to IPFS
  async storeWalletToIPFS() {
    if (!this.address) return;
    
    try {
      console.log('🌐 Storing wallet info to IPFS...');
      
      const walletData = {
        address: this.address,
        connectedAt: new Date().toISOString(),
        timestamp: Date.now(),
        network: get(networkCorrect) ? 'reactive' : 'other'
      };
      
      // Call backend API to store user data
      const response = await fetch(`${import.meta.env.VITE_PRICE_API_URL || 'http://localhost:3001'}/api/users/${this.address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Wallet stored to IPFS:', result.ipfs?.usersCID || 'success');
        notify.success('Wallet connected and stored securely');
      } else {
        console.warn('⚠️ Failed to store wallet to IPFS:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Failed to store wallet to IPFS:', error.message);
      // Don't block wallet connection if IPFS storage fails
    }
  }
  async updateBalance() { if (!this.provider || !this.address) return; try { const balance = await this.provider.getBalance(this.address); walletBalance.set(ethers.formatEther(balance)); } catch (e) { console.error('Failed to get balance:', e); } }
  async handleAccountsChanged(accounts) { 
    console.log('👤 Accounts changed:', accounts);
    if (accounts.length===0) { 
      console.log('🔌 No accounts - disconnecting');
      await this.disconnect(); 
      notify.info('Wallet disconnected');
    } else if (accounts[0] !== this.address) { 
      console.log('🔄 Account switched to:', accounts[0]);
      this.address = accounts[0]; 
      walletAddress.set(this.address); 
      
      // Save new address to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('reactiveWalletAddress', this.address);
      }
      
      await this.updateBalance(); 
      await this.checkNetwork();
      
      aggregate.set({ isConnected: true, provider: this.provider, address: this.address });
      notify.success('Account switched successfully'); 
    } 
  }
  
  async handleChainChanged(chainId) { 
    console.log('⛓️ Chain changed to:', chainId);
    notify.info('Network changed - reloading page...');
    // Small delay to show notification before reload
    setTimeout(() => {
      window.location.reload(); 
    }, 500);
  }
  
  async handleDisconnect(error) { 
    console.log('🔌 Disconnect event:', error);
    await this.disconnect(); 
    if (error) {
      notify.error('Wallet disconnected due to error');
    }
  }
  // Formatting helpers
  formatAddress(addr){ if(!addr) return ''; return `${addr.slice(0,6)}...${addr.slice(-4)}`; }
  formatBalance(bal){ if(!bal) return '0'; const num = parseFloat(bal); if(num===0) return '0'; if(num<0.0001) return '< 0.0001'; if(num<1) return num.toFixed(4); if(num<10) return num.toFixed(3); if(num<100) return num.toFixed(2); return num.toFixed(1); }
  isValidAddress(a){ return ethers.isAddress(a); }
  // Expose aggregated store for services expecting walletStore
  get store(){ return { subscribe: aggregate.subscribe, get: () => get(aggregate) }; }
}

export const walletService = new WalletService();
export const walletStore = walletService.store;