/**
 * Tests for NetworkConfigService
 * 
 * These tests verify the network configuration and switching logic
 * for both live and simulation modes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { networkConfigService } from './NetworkConfigService.js';
import {
  REACTIVE_MAINNET_CHAIN_ID_HEX,
  REACTIVE_MAINNET_CHAIN_ID_DEC,
  REACTIVE_TESTNET_CHAIN_ID_HEX,
  REACTIVE_TESTNET_CHAIN_ID_DEC
} from '$lib/config/network.js';

describe('NetworkConfigService', () => {
  beforeEach(() => {
    // Reset service state
    networkConfigService.currentMode = null;
  });

  describe('getNetworkConfig', () => {
    it('should return testnet config for simulation mode', () => {
      const config = networkConfigService.getNetworkConfig('simulation');
      
      expect(config.chainId).toBe(REACTIVE_TESTNET_CHAIN_ID_HEX);
      expect(config.chainIdDec).toBe(REACTIVE_TESTNET_CHAIN_ID_DEC);
      expect(config.chainName).toBe('Reactive Testnet');
      expect(config.isTestnet).toBe(true);
      expect(config.nativeCurrency.symbol).toBe('tREACT');
    });

    it('should return mainnet config for live mode', () => {
      const config = networkConfigService.getNetworkConfig('live');
      
      expect(config.chainId).toBe(REACTIVE_MAINNET_CHAIN_ID_HEX);
      expect(config.chainIdDec).toBe(REACTIVE_MAINNET_CHAIN_ID_DEC);
      expect(config.chainName).toBe('Reactive Mainnet');
      expect(config.isTestnet).toBe(false);
      expect(config.nativeCurrency.symbol).toBe('REACT');
    });

    it('should include network params for MetaMask', () => {
      const config = networkConfigService.getNetworkConfig('simulation');
      
      expect(config.networkParams).toBeDefined();
      expect(config.networkParams.chainId).toBe(REACTIVE_TESTNET_CHAIN_ID_HEX);
      expect(config.networkParams.rpcUrls).toBeDefined();
      expect(config.networkParams.blockExplorerUrls).toBeDefined();
    });
  });

  describe('getExpectedChainId', () => {
    it('should return testnet chain ID for simulation mode', () => {
      const chainId = networkConfigService.getExpectedChainId('simulation');
      expect(chainId).toBe(REACTIVE_TESTNET_CHAIN_ID_HEX);
    });

    it('should return mainnet chain ID for live mode', () => {
      const chainId = networkConfigService.getExpectedChainId('live');
      expect(chainId).toBe(REACTIVE_MAINNET_CHAIN_ID_HEX);
    });
  });

  describe('getExpectedChainIdDec', () => {
    it('should return testnet chain ID in decimal for simulation mode', () => {
      const chainIdDec = networkConfigService.getExpectedChainIdDec('simulation');
      expect(chainIdDec).toBe(REACTIVE_TESTNET_CHAIN_ID_DEC);
    });

    it('should return mainnet chain ID in decimal for live mode', () => {
      const chainIdDec = networkConfigService.getExpectedChainIdDec('live');
      expect(chainIdDec).toBe(REACTIVE_MAINNET_CHAIN_ID_DEC);
    });
  });

  describe('isCorrectNetwork', () => {
    it('should return true when chain ID matches simulation mode', () => {
      const isCorrect = networkConfigService.isCorrectNetwork(
        REACTIVE_TESTNET_CHAIN_ID_HEX,
        'simulation'
      );
      expect(isCorrect).toBe(true);
    });

    it('should return true when chain ID matches live mode', () => {
      const isCorrect = networkConfigService.isCorrectNetwork(
        REACTIVE_MAINNET_CHAIN_ID_HEX,
        'live'
      );
      expect(isCorrect).toBe(true);
    });

    it('should return false when chain ID does not match mode', () => {
      const isCorrect = networkConfigService.isCorrectNetwork(
        REACTIVE_MAINNET_CHAIN_ID_HEX,
        'simulation'
      );
      expect(isCorrect).toBe(false);
    });

    it('should handle decimal chain IDs', () => {
      const isCorrect = networkConfigService.isCorrectNetwork(
        REACTIVE_TESTNET_CHAIN_ID_DEC,
        'simulation'
      );
      expect(isCorrect).toBe(true);
    });

    it('should handle string decimal chain IDs', () => {
      const isCorrect = networkConfigService.isCorrectNetwork(
        REACTIVE_TESTNET_CHAIN_ID_DEC.toString(),
        'simulation'
      );
      expect(isCorrect).toBe(true);
    });
  });

  describe('getNetworkDisplayInfo', () => {
    it('should return display info for simulation mode', () => {
      const info = networkConfigService.getNetworkDisplayInfo('simulation');
      
      expect(info.name).toBe('Reactive Testnet');
      expect(info.symbol).toBe('tREACT');
      expect(info.isTestnet).toBe(true);
      expect(info.chainId).toBe(REACTIVE_TESTNET_CHAIN_ID_HEX);
    });

    it('should return display info for live mode', () => {
      const info = networkConfigService.getNetworkDisplayInfo('live');
      
      expect(info.name).toBe('Reactive Mainnet');
      expect(info.symbol).toBe('REACT');
      expect(info.isTestnet).toBe(false);
      expect(info.chainId).toBe(REACTIVE_MAINNET_CHAIN_ID_HEX);
    });
  });

  describe('switchNetwork', () => {
    it('should return false when MetaMask is not available', async () => {
      // Ensure window.ethereum is not available
      const originalEthereum = global.window?.ethereum;
      if (global.window) {
        delete global.window.ethereum;
      }
      
      const result = await networkConfigService.switchNetwork('simulation');
      expect(result).toBe(false);
      
      // Restore
      if (global.window && originalEthereum) {
        global.window.ethereum = originalEthereum;
      }
    });
  });

  describe('verifyNetwork', () => {
    it('should return false when MetaMask is not available', async () => {
      // Ensure window.ethereum is not available
      const originalEthereum = global.window?.ethereum;
      if (global.window) {
        delete global.window.ethereum;
      }
      
      const result = await networkConfigService.verifyNetwork('simulation');
      expect(result).toBe(false);
      
      // Restore
      if (global.window && originalEthereum) {
        global.window.ethereum = originalEthereum;
      }
    });
  });
});
