/**
 * NetworkConfigService - Manages network configuration and switching for simulation/live modes
 * 
 * This service handles:
 * - Network configuration retrieval based on mode
 * - Automatic network switching in MetaMask
 * - Network verification and validation
 * - Adding networks to MetaMask wallet
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2
 */

import { get } from 'svelte/store';
import { appMode } from '$lib/stores/appMode.js';
import { notify } from '$lib/notify.js';
import {
  REACTIVE_MAINNET_CHAIN_ID_HEX,
  REACTIVE_MAINNET_CHAIN_ID_DEC,
  REACTIVE_TESTNET_CHAIN_ID_HEX,
  REACTIVE_TESTNET_CHAIN_ID_DEC,
  REACTIVE_MAINNET_NETWORK_PARAMS,
  REACTIVE_TESTNET_NETWORK_PARAMS,
  getNetworkConfig as getNetworkConfigHelper
} from '$lib/config/network.js';

class NetworkConfigService {
  constructor() {
    this.currentMode = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  init() {
    if (this.isInitialized) return;
    
    // Subscribe to mode changes
    appMode.subscribe(mode => {
      this.currentMode = mode;
    });
    
    this.isInitialized = true;
    console.log('✅ NetworkConfigService initialized');
  }

  /**
   * Get network configuration based on mode
   * @param {string} mode - 'live' or 'simulation'
   * @returns {Object} Network configuration object
   * 
   * Requirements: 1.1, 1.2
   */
  getNetworkConfig(mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    
    if (targetMode === 'simulation') {
      return {
        chainId: REACTIVE_TESTNET_CHAIN_ID_HEX,
        chainIdDec: REACTIVE_TESTNET_CHAIN_ID_DEC,
        chainName: 'Reactive Testnet',
        rpcUrl: REACTIVE_TESTNET_NETWORK_PARAMS.rpcUrls[0],
        explorerUrl: REACTIVE_TESTNET_NETWORK_PARAMS.blockExplorerUrls[0],
        nativeCurrency: REACTIVE_TESTNET_NETWORK_PARAMS.nativeCurrency,
        networkParams: REACTIVE_TESTNET_NETWORK_PARAMS,
        isTestnet: true
      };
    }
    
    // Default to mainnet for 'live' mode
    return {
      chainId: REACTIVE_MAINNET_CHAIN_ID_HEX,
      chainIdDec: REACTIVE_MAINNET_CHAIN_ID_DEC,
      chainName: 'Reactive Mainnet',
      rpcUrl: REACTIVE_MAINNET_NETWORK_PARAMS.rpcUrls[0],
      explorerUrl: REACTIVE_MAINNET_NETWORK_PARAMS.blockExplorerUrls[0],
      nativeCurrency: REACTIVE_MAINNET_NETWORK_PARAMS.nativeCurrency,
      networkParams: REACTIVE_MAINNET_NETWORK_PARAMS,
      isTestnet: false
    };
  }

  /**
   * Switch to the network appropriate for the given mode
   * @param {string} mode - 'live' or 'simulation'
   * @returns {Promise<boolean>} True if switch was successful
   * 
   * Requirements: 1.3, 10.1, 10.2
   */
  async switchNetwork(mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('❌ MetaMask not available');
      notify.error('MetaMask not detected. Please install MetaMask to continue.');
      return false;
    }

    const config = this.getNetworkConfig(targetMode);
    
    try {
      console.log(`🔄 Switching to ${config.chainName} (${config.chainId})...`);
      
      // Attempt to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }]
      });
      
      console.log(`✅ Successfully switched to ${config.chainName}`);
      notify.success(`Switched to ${config.chainName}`);
      return true;
      
    } catch (switchError) {
      console.error('❌ Network switch error:', switchError);
      
      // Error code 4902 means the network hasn't been added to MetaMask yet
      if (switchError.code === 4902) {
        console.log('⚠️ Network not found in MetaMask, attempting to add...');
        return await this.addNetworkToWallet(config);
      }
      
      // Error code 4001 means user rejected the request
      if (switchError.code === 4001) {
        notify.error('Network switch rejected by user');
        return false;
      }
      
      // Other errors
      notify.error(`Failed to switch network: ${switchError.message || 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Add a network to MetaMask wallet
   * @param {Object} config - Network configuration object (optional, uses current mode if not provided)
   * @returns {Promise<boolean>} True if network was added successfully
   * 
   * Requirements: 1.4
   */
  async addNetworkToWallet(config = null) {
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('❌ MetaMask not available');
      notify.error('MetaMask not detected. Please install MetaMask to continue.');
      return false;
    }

    const networkConfig = config || this.getNetworkConfig();
    
    try {
      console.log(`➕ Adding ${networkConfig.chainName} to MetaMask...`);
      
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig.networkParams]
      });
      
      console.log(`✅ Successfully added ${networkConfig.chainName} to MetaMask`);
      notify.success(`${networkConfig.chainName} added to MetaMask`);
      return true;
      
    } catch (addError) {
      console.error('❌ Failed to add network:', addError);
      
      // Error code 4001 means user rejected the request
      if (addError.code === 4001) {
        notify.error('Adding network rejected by user');
        return false;
      }
      
      notify.error(`Failed to add network: ${addError.message || 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Verify that the current network matches the expected mode
   * @param {string} mode - 'live' or 'simulation' (optional, uses current mode if not provided)
   * @returns {Promise<boolean>} True if network matches the mode
   * 
   * Requirements: 10.4
   */
  async verifyNetwork(mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    
    if (typeof window === 'undefined' || !window.ethereum) {
      console.warn('⚠️ MetaMask not available for network verification');
      return false;
    }

    try {
      // Get current chain ID from MetaMask
      const currentChainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      
      const config = this.getNetworkConfig(targetMode);
      const isCorrect = currentChainId.toLowerCase() === config.chainId.toLowerCase();
      
      if (isCorrect) {
        console.log(`✅ Network verified: ${config.chainName}`);
      } else {
        console.warn(`⚠️ Network mismatch: Expected ${config.chainName} (${config.chainId}), got ${currentChainId}`);
      }
      
      return isCorrect;
      
    } catch (error) {
      console.error('❌ Failed to verify network:', error);
      return false;
    }
  }

  /**
   * Get the expected chain ID for a given mode
   * @param {string} mode - 'live' or 'simulation'
   * @returns {string} Chain ID in hex format
   */
  getExpectedChainId(mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    const config = this.getNetworkConfig(targetMode);
    return config.chainId;
  }

  /**
   * Get the expected chain ID in decimal format
   * @param {string} mode - 'live' or 'simulation'
   * @returns {number} Chain ID in decimal format
   */
  getExpectedChainIdDec(mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    const config = this.getNetworkConfig(targetMode);
    return config.chainIdDec;
  }

  /**
   * Check if a given chain ID matches the expected network for a mode
   * @param {string|number} chainId - Chain ID to check (hex or decimal)
   * @param {string} mode - 'live' or 'simulation'
   * @returns {boolean} True if chain ID matches the mode's network
   */
  isCorrectNetwork(chainId, mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    const config = this.getNetworkConfig(targetMode);
    
    // Convert chainId to hex if it's a number
    let chainIdHex = chainId;
    if (typeof chainId === 'number') {
      chainIdHex = '0x' + chainId.toString(16);
    } else if (typeof chainId === 'string' && !chainId.startsWith('0x')) {
      chainIdHex = '0x' + parseInt(chainId, 10).toString(16);
    }
    
    return chainIdHex.toLowerCase() === config.chainId.toLowerCase();
  }

  /**
   * Prompt user to switch network with helpful instructions
   * @param {string} mode - Target mode
   * @returns {Promise<boolean>} True if user successfully switched
   */
  async promptNetworkSwitch(mode = null) {
    const targetMode = mode || this.currentMode || get(appMode);
    const config = this.getNetworkConfig(targetMode);
    
    const modeLabel = targetMode === 'simulation' ? 'Simulation Mode (Testnet)' : 'Live Mode (Mainnet)';
    
    notify.info(
      `Please switch to ${config.chainName} for ${modeLabel}`,
      { duration: 5000 }
    );
    
    return await this.switchNetwork(targetMode);
  }

  /**
   * Get network display information
   * @param {string} mode - 'live' or 'simulation'
   * @returns {Object} Display information for the network
   */
  getNetworkDisplayInfo(mode = null) {
    const config = this.getNetworkConfig(mode);
    
    return {
      name: config.chainName,
      symbol: config.nativeCurrency.symbol,
      explorerUrl: config.explorerUrl,
      isTestnet: config.isTestnet,
      chainId: config.chainId,
      chainIdDec: config.chainIdDec
    };
  }
}

// Export singleton instance
export const networkConfigService = new NetworkConfigService();

// Auto-initialize
if (typeof window !== 'undefined') {
  networkConfigService.init();
}

export default networkConfigService;
