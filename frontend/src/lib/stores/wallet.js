import { writable } from 'svelte/store';
import { ethers } from 'ethers';
import toast from 'svelte-french-toast';
import { authenticate, clearSession } from '../authService.js';

// Reactive Network configuration
const REACTIVE_NETWORK = {
  chainId: '0x512358', // 5318008 in hex
  chainName: 'Reactive Network',
  nativeCurrency: {
    name: 'Reactive',
    symbol: 'REACT',
    decimals: 18,
  },
  rpcUrls: ['https://kopli-rpc.reactive.network'],
  blockExplorerUrls: ['https://kopli.reactscan.net'],
};

// Store definitions
export const walletConnected = writable(false);
export const walletAddress = writable('');
export const walletBalance = writable('0');
export const provider = writable(null);
export const signer = writable(null);
export const networkCorrect = writable(false);
export const isConnecting = writable(false);

class WalletService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = '';
    this.isMetaMaskInstalled = false;
    
    this.init();
  }

  async init() {
    // Check if MetaMask is installed
    if (typeof window !== 'undefined' && window.ethereum) {
      this.isMetaMaskInstalled = true;
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
      
      // Listen for disconnect
      window.ethereum.on('disconnect', this.handleDisconnect.bind(this));
      
      // Try to connect if previously connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await this.connect();
      }
    }
  }

  async connect() {
    if (!this.isMetaMaskInstalled) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      window.open('https://metamask.io/download/', '_blank');
      return false;
    }

    try {
      isConnecting.set(true);
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Setup provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.address = accounts[0];

      // Update stores
      provider.set(this.provider);
      signer.set(this.signer);
      walletAddress.set(this.address);
      walletConnected.set(true);

      // Check network
      await this.checkNetwork();
      
      // Get balance
      await this.updateBalance();

      // Authenticate session via signed message (React Network mainnet auth)
      try {
        await authenticate();
        toast.success('Wallet connected & authenticated');
      } catch (authErr) {
        console.error('Auth signature failed:', authErr);
        toast.error('Authentication signature declined');
      }
      return true;

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
      return false;
    } finally {
      isConnecting.set(false);
    }
  }

  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = '';
    
    // Update stores
    provider.set(null);
    signer.set(null);
    walletAddress.set('');
    walletConnected.set(false);
    networkCorrect.set(false);
    walletBalance.set('0');
    
    clearSession();
    toast.success('Wallet disconnected & session cleared');
  }

  async checkNetwork() {
    if (!this.provider) return false;

    try {
      const network = await this.provider.getNetwork();
      const isCorrect = network.chainId === 5318008;
      
      networkCorrect.set(isCorrect);
      
      if (!isCorrect) {
        toast.error('Please switch to Reactive Network');
        await this.switchToReactiveNetwork();
      }
      
      return isCorrect;
    } catch (error) {
      console.error('Failed to check network:', error);
      return false;
    }
  }

  async switchToReactiveNetwork() {
    if (!window.ethereum) return false;

    try {
      // Try to switch to Reactive Network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REACTIVE_NETWORK.chainId }],
      });
      
      networkCorrect.set(true);
      toast.success('Switched to Reactive Network');
      return true;
      
    } catch (switchError) {
      // Network not added to MetaMask, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [REACTIVE_NETWORK],
          });
          
          networkCorrect.set(true);
          toast.success('Reactive Network added and switched');
          return true;
          
        } catch (addError) {
          console.error('Failed to add network:', addError);
          toast.error('Failed to add Reactive Network to MetaMask');
          return false;
        }
      } else {
        console.error('Failed to switch network:', switchError);
        toast.error('Failed to switch to Reactive Network');
        return false;
      }
    }
  }

  async updateBalance() {
    if (!this.provider || !this.address) return;

    try {
      const balance = await this.provider.getBalance(this.address);
      const balanceInEther = ethers.formatEther(balance);
      walletBalance.set(balanceInEther);
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  }

  async handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User disconnected
      await this.disconnect();
    } else if (accounts[0] !== this.address) {
      // User switched accounts
      this.address = accounts[0];
      walletAddress.set(this.address);
      await this.updateBalance();
      toast.success('Account switched');
    }
  }

  async handleChainChanged(chainId) {
    // Reload the page when chain changes for simplicity
    window.location.reload();
  }

  async handleDisconnect() {
    await this.disconnect();
  }

  // Utility methods
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatBalance(balance) {
    if (!balance) return '0';
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 10) return num.toFixed(3);
    if (num < 100) return num.toFixed(2);
    return num.toFixed(1);
  }

  isValidAddress(address) {
    return ethers.isAddress(address);
  }
}

// Create singleton instance
export const walletService = new WalletService();