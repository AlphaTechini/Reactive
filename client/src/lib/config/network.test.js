import { describe, it, expect } from 'vitest';
import {
  getNetworkConfig,
  isReactiveChain,
  isReactiveMainnet,
  isReactiveTestnet,
  REACTIVE_MAINNET_CHAIN_ID_DEC,
  REACTIVE_TESTNET_CHAIN_ID_DEC,
  REACTIVE_MAINNET_CHAIN_ID_HEX,
  REACTIVE_TESTNET_CHAIN_ID_HEX
} from './network.js';

describe('Network Configuration', () => {
  describe('getNetworkConfig', () => {
    it('should return mainnet config for live mode', () => {
      const config = getNetworkConfig('live');
      
      expect(config.chainName).toBe('Reactive Mainnet');
      expect(config.chainIdDec).toBe(REACTIVE_MAINNET_CHAIN_ID_DEC);
      expect(config.chainId).toBe(REACTIVE_MAINNET_CHAIN_ID_HEX);
      expect(config.nativeCurrency.symbol).toBe('REACT');
      expect(config.rpcUrl).toContain('mainnet-rpc');
    });

    it('should return testnet config for simulation mode', () => {
      const config = getNetworkConfig('simulation');
      
      expect(config.chainName).toBe('Reactive Testnet');
      expect(config.chainIdDec).toBe(REACTIVE_TESTNET_CHAIN_ID_DEC);
      expect(config.chainId).toBe(REACTIVE_TESTNET_CHAIN_ID_HEX);
      expect(config.nativeCurrency.symbol).toBe('tREACT');
      expect(config.rpcUrl).toContain('testnet-rpc');
    });

    it('should default to mainnet for unknown mode', () => {
      const config = getNetworkConfig('unknown');
      
      expect(config.chainName).toBe('Reactive Mainnet');
      expect(config.chainIdDec).toBe(REACTIVE_MAINNET_CHAIN_ID_DEC);
    });
  });

  describe('Chain ID validation', () => {
    it('should recognize mainnet chain ID (decimal)', () => {
      expect(isReactiveChain(REACTIVE_MAINNET_CHAIN_ID_DEC)).toBe(true);
      expect(isReactiveMainnet(REACTIVE_MAINNET_CHAIN_ID_DEC)).toBe(true);
      expect(isReactiveTestnet(REACTIVE_MAINNET_CHAIN_ID_DEC)).toBe(false);
    });

    it('should recognize mainnet chain ID (hex)', () => {
      expect(isReactiveChain(REACTIVE_MAINNET_CHAIN_ID_HEX)).toBe(true);
      expect(isReactiveMainnet(REACTIVE_MAINNET_CHAIN_ID_HEX)).toBe(true);
      expect(isReactiveTestnet(REACTIVE_MAINNET_CHAIN_ID_HEX)).toBe(false);
    });

    it('should recognize testnet chain ID (decimal)', () => {
      expect(isReactiveChain(REACTIVE_TESTNET_CHAIN_ID_DEC)).toBe(true);
      expect(isReactiveMainnet(REACTIVE_TESTNET_CHAIN_ID_DEC)).toBe(false);
      expect(isReactiveTestnet(REACTIVE_TESTNET_CHAIN_ID_DEC)).toBe(true);
    });

    it('should recognize testnet chain ID (hex)', () => {
      expect(isReactiveChain(REACTIVE_TESTNET_CHAIN_ID_HEX)).toBe(true);
      expect(isReactiveMainnet(REACTIVE_TESTNET_CHAIN_ID_HEX)).toBe(false);
      expect(isReactiveTestnet(REACTIVE_TESTNET_CHAIN_ID_HEX)).toBe(true);
    });

    it('should reject non-Reactive chain IDs', () => {
      expect(isReactiveChain(1)).toBe(false);
      expect(isReactiveChain('0x1')).toBe(false);
      expect(isReactiveChain(null)).toBe(false);
      expect(isReactiveChain(undefined)).toBe(false);
    });
  });

  describe('Network parameters', () => {
    it('should have correct mainnet parameters', () => {
      const config = getNetworkConfig('live');
      
      expect(config.networkParams.chainId).toBe(REACTIVE_MAINNET_CHAIN_ID_HEX);
      expect(config.networkParams.chainName).toBe('Reactive Mainnet');
      expect(config.networkParams.nativeCurrency.decimals).toBe(18);
      expect(config.networkParams.rpcUrls).toHaveLength(1);
      expect(config.networkParams.blockExplorerUrls).toHaveLength(1);
    });

    it('should have correct testnet parameters', () => {
      const config = getNetworkConfig('simulation');
      
      expect(config.networkParams.chainId).toBe(REACTIVE_TESTNET_CHAIN_ID_HEX);
      expect(config.networkParams.chainName).toBe('Reactive Testnet');
      expect(config.networkParams.nativeCurrency.decimals).toBe(18);
      expect(config.networkParams.rpcUrls).toHaveLength(1);
      expect(config.networkParams.blockExplorerUrls).toHaveLength(1);
    });
  });
});
