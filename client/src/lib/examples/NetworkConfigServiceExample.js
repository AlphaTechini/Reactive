/**
 * NetworkConfigService Usage Examples
 * 
 * This file demonstrates how to use the NetworkConfigService for managing
 * network configuration and switching between live and simulation modes.
 */

import { networkConfigService } from '$lib/services/NetworkConfigService.js';
import { appMode } from '$lib/stores/appMode.js';
import { get } from 'svelte/store';

/**
 * Example 1: Get network configuration for current mode
 */
export async function example1_GetCurrentNetworkConfig() {
  console.log('=== Example 1: Get Current Network Config ===');
  
  const currentMode = get(appMode);
  const config = networkConfigService.getNetworkConfig(currentMode);
  
  console.log('Current Mode:', currentMode);
  console.log('Network Config:', {
    name: config.chainName,
    chainId: config.chainId,
    chainIdDec: config.chainIdDec,
    isTestnet: config.isTestnet,
    rpcUrl: config.rpcUrl,
    explorerUrl: config.explorerUrl
  });
  
  return config;
}

/**
 * Example 2: Get network configuration for specific mode
 */
export async function example2_GetSpecificModeConfig() {
  console.log('=== Example 2: Get Specific Mode Config ===');
  
  // Get testnet config (simulation mode)
  const testnetConfig = networkConfigService.getNetworkConfig('simulation');
  console.log('Testnet Config:', {
    name: testnetConfig.chainName,
    chainId: testnetConfig.chainId,
    symbol: testnetConfig.nativeCurrency.symbol
  });
  
  // Get mainnet config (live mode)
  const mainnetConfig = networkConfigService.getNetworkConfig('live');
  console.log('Mainnet Config:', {
    name: mainnetConfig.chainName,
    chainId: mainnetConfig.chainId,
    symbol: mainnetConfig.nativeCurrency.symbol
  });
  
  return { testnetConfig, mainnetConfig };
}

/**
 * Example 3: Switch to simulation mode network
 */
export async function example3_SwitchToSimulationMode() {
  console.log('=== Example 3: Switch to Simulation Mode ===');
  
  try {
    // Switch to testnet for simulation mode
    const success = await networkConfigService.switchNetwork('simulation');
    
    if (success) {
      console.log('✅ Successfully switched to testnet');
      
      // Update app mode
      appMode.set('simulation');
      console.log('✅ App mode updated to simulation');
    } else {
      console.log('❌ Failed to switch network');
    }
    
    return success;
  } catch (error) {
    console.error('Error switching to simulation mode:', error);
    return false;
  }
}

/**
 * Example 4: Switch to live mode network
 */
export async function example4_SwitchToLiveMode() {
  console.log('=== Example 4: Switch to Live Mode ===');
  
  try {
    // Switch to mainnet for live mode
    const success = await networkConfigService.switchNetwork('live');
    
    if (success) {
      console.log('✅ Successfully switched to mainnet');
      
      // Update app mode
      appMode.set('live');
      console.log('✅ App mode updated to live');
    } else {
      console.log('❌ Failed to switch network');
    }
    
    return success;
  } catch (error) {
    console.error('Error switching to live mode:', error);
    return false;
  }
}

/**
 * Example 5: Verify current network matches mode
 */
export async function example5_VerifyNetwork() {
  console.log('=== Example 5: Verify Network ===');
  
  const currentMode = get(appMode);
  const isCorrect = await networkConfigService.verifyNetwork(currentMode);
  
  if (isCorrect) {
    console.log('✅ Network matches current mode:', currentMode);
  } else {
    console.log('⚠️ Network mismatch detected!');
    console.log('Current mode:', currentMode);
    
    // Prompt user to switch
    const switched = await networkConfigService.promptNetworkSwitch(currentMode);
    if (switched) {
      console.log('✅ Network switched successfully');
    } else {
      console.log('❌ User declined network switch');
    }
  }
  
  return isCorrect;
}

/**
 * Example 6: Add testnet to MetaMask
 */
export async function example6_AddTestnetToMetaMask() {
  console.log('=== Example 6: Add Testnet to MetaMask ===');
  
  try {
    const testnetConfig = networkConfigService.getNetworkConfig('simulation');
    const success = await networkConfigService.addNetworkToWallet(testnetConfig);
    
    if (success) {
      console.log('✅ Testnet added to MetaMask');
    } else {
      console.log('❌ Failed to add testnet');
    }
    
    return success;
  } catch (error) {
    console.error('Error adding testnet:', error);
    return false;
  }
}

/**
 * Example 7: Check if chain ID is correct for mode
 */
export async function example7_CheckChainId() {
  console.log('=== Example 7: Check Chain ID ===');
  
  // Get current chain ID from MetaMask
  if (typeof window !== 'undefined' && window.ethereum) {
    const currentChainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });
    
    console.log('Current Chain ID:', currentChainId);
    
    // Check if it matches simulation mode
    const matchesSimulation = networkConfigService.isCorrectNetwork(
      currentChainId, 
      'simulation'
    );
    console.log('Matches Simulation Mode:', matchesSimulation);
    
    // Check if it matches live mode
    const matchesLive = networkConfigService.isCorrectNetwork(
      currentChainId, 
      'live'
    );
    console.log('Matches Live Mode:', matchesLive);
    
    return { currentChainId, matchesSimulation, matchesLive };
  } else {
    console.log('⚠️ MetaMask not available');
    return null;
  }
}

/**
 * Example 8: Get network display information
 */
export async function example8_GetDisplayInfo() {
  console.log('=== Example 8: Get Network Display Info ===');
  
  const currentMode = get(appMode);
  const displayInfo = networkConfigService.getNetworkDisplayInfo(currentMode);
  
  console.log('Network Display Info:', displayInfo);
  console.log('- Name:', displayInfo.name);
  console.log('- Symbol:', displayInfo.symbol);
  console.log('- Is Testnet:', displayInfo.isTestnet);
  console.log('- Explorer:', displayInfo.explorerUrl);
  
  return displayInfo;
}

/**
 * Example 9: Complete mode switch workflow
 */
export async function example9_CompleteModeSwitch(targetMode) {
  console.log('=== Example 9: Complete Mode Switch Workflow ===');
  console.log('Target Mode:', targetMode);
  
  try {
    // Step 1: Get target network config
    const config = networkConfigService.getNetworkConfig(targetMode);
    console.log('Step 1: Target network:', config.chainName);
    
    // Step 2: Verify current network
    const isCorrect = await networkConfigService.verifyNetwork(targetMode);
    
    if (!isCorrect) {
      console.log('Step 2: Network mismatch, switching...');
      
      // Step 3: Switch network
      const switched = await networkConfigService.switchNetwork(targetMode);
      
      if (!switched) {
        console.log('❌ Failed to switch network');
        return false;
      }
      
      console.log('✅ Network switched successfully');
    } else {
      console.log('Step 2: Network already correct');
    }
    
    // Step 4: Update app mode
    appMode.set(targetMode);
    console.log('Step 4: App mode updated to:', targetMode);
    
    // Step 5: Verify again
    const finalCheck = await networkConfigService.verifyNetwork(targetMode);
    console.log('Step 5: Final verification:', finalCheck ? '✅' : '❌');
    
    return finalCheck;
  } catch (error) {
    console.error('Error in mode switch workflow:', error);
    return false;
  }
}

/**
 * Example 10: Handle network mismatch before transaction
 */
export async function example10_PreTransactionCheck() {
  console.log('=== Example 10: Pre-Transaction Network Check ===');
  
  const currentMode = get(appMode);
  console.log('Current Mode:', currentMode);
  
  // Verify network before allowing transaction
  const isCorrect = await networkConfigService.verifyNetwork(currentMode);
  
  if (!isCorrect) {
    console.log('⚠️ Network mismatch detected!');
    console.log('Transaction blocked until network is correct');
    
    // Prompt user to switch
    const switched = await networkConfigService.promptNetworkSwitch(currentMode);
    
    if (switched) {
      console.log('✅ Network corrected, transaction can proceed');
      return true;
    } else {
      console.log('❌ Network not corrected, transaction cancelled');
      return false;
    }
  }
  
  console.log('✅ Network correct, transaction can proceed');
  return true;
}

// Export all examples for easy testing
export const examples = {
  example1_GetCurrentNetworkConfig,
  example2_GetSpecificModeConfig,
  example3_SwitchToSimulationMode,
  example4_SwitchToLiveMode,
  example5_VerifyNetwork,
  example6_AddTestnetToMetaMask,
  example7_CheckChainId,
  example8_GetDisplayInfo,
  example9_CompleteModeSwitch,
  example10_PreTransactionCheck
};

// Run all examples (for testing purposes)
export async function runAllExamples() {
  console.log('========================================');
  console.log('Running All NetworkConfigService Examples');
  console.log('========================================\n');
  
  await example1_GetCurrentNetworkConfig();
  console.log('\n');
  
  await example2_GetSpecificModeConfig();
  console.log('\n');
  
  await example8_GetDisplayInfo();
  console.log('\n');
  
  // Note: Examples 3-7, 9-10 require MetaMask interaction
  // and should be run manually in a browser environment
  
  console.log('========================================');
  console.log('Examples Complete');
  console.log('Note: Interactive examples (3-7, 9-10) require MetaMask');
  console.log('========================================');
}
