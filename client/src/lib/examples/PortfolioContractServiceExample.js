/**
 * Portfolio Contract Service Usage Examples
 * 
 * This file demonstrates how to use the PortfolioContractService
 * to interact with the EnhancedPortfolioManager smart contract
 */

import { portfolioContractService } from '$lib/services/PortfolioContractService.js';
import { walletAddress } from '$lib/stores/wallet.js';
import { get } from 'svelte/store';

// ========== EXAMPLE 1: Create a New Portfolio On-Chain ==========
export async function exampleCreatePortfolio() {
  try {
    // Define token allocations (must sum to 100%)
    const tokenAllocations = [
      {
        address: '0x1234...', // WETH address
        allocation: 40 // 40%
      },
      {
        address: '0x5678...', // USDC address
        allocation: 30 // 30%
      },
      {
        address: '0x9abc...', // Another token address
        allocation: 30 // 30%
      }
    ];

    console.log('Creating portfolio on blockchain...');
    const result = await portfolioContractService.createPortfolio(tokenAllocations);

    console.log('Portfolio created successfully!');
    console.log('Transaction Hash:', result.transactionHash);
    console.log('Block Number:', result.blockNumber);

    return result;
  } catch (error) {
    console.error('Failed to create portfolio:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 2: Get Portfolio Allocation from Blockchain ==========
export async function exampleGetPortfolioAllocation() {
  try {
    const userAddress = get(walletAddress);
    
    console.log('Fetching portfolio allocation from blockchain...');
    const allocations = await portfolioContractService.getPortfolioAllocation(userAddress);

    if (allocations.length === 0) {
      console.log('No portfolio found on blockchain for this address');
      return [];
    }

    console.log('Portfolio Allocation:');
    allocations.forEach(alloc => {
      console.log(`- ${alloc.symbol}: ${alloc.allocation}% (${alloc.address})`);
    });

    return allocations;
  } catch (error) {
    console.error('Failed to get portfolio allocation:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 3: Update Portfolio Allocation ==========
export async function exampleUpdatePortfolioAllocation() {
  try {
    // New allocation (must sum to 100%)
    const newAllocations = [
      {
        address: '0x1234...', // WETH
        allocation: 50 // Increased to 50%
      },
      {
        address: '0x5678...', // USDC
        allocation: 25 // Decreased to 25%
      },
      {
        address: '0x9abc...', // Another token
        allocation: 25 // Decreased to 25%
      }
    ];

    console.log('Updating portfolio allocation on blockchain...');
    const result = await portfolioContractService.updatePortfolioAllocation(newAllocations);

    console.log('Portfolio updated successfully!');
    console.log('Transaction Hash:', result.transactionHash);

    return result;
  } catch (error) {
    console.error('Failed to update portfolio:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 4: Set Risk Parameters ==========
export async function exampleSetRiskParameters() {
  try {
    const riskParams = {
      stopLoss: 10, // 10% stop-loss
      takeProfit: 25 // 25% take-profit
    };

    console.log('Setting risk parameters on blockchain...');
    const result = await portfolioContractService.setRiskParameters(riskParams);

    console.log('Risk parameters set successfully!');
    result.transactions.forEach(tx => {
      console.log(`- ${tx.type}: ${tx.transactionHash}`);
    });

    return result;
  } catch (error) {
    console.error('Failed to set risk parameters:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 5: Get Risk Parameters from Blockchain ==========
export async function exampleGetRiskParameters() {
  try {
    const userAddress = get(walletAddress);
    
    console.log('Fetching risk parameters from blockchain...');
    const riskParams = await portfolioContractService.getRiskParameters(userAddress);

    console.log('Risk Parameters:');
    console.log(`- Stop Loss: ${riskParams.stopLoss}%`);
    console.log(`- Take Profit: ${riskParams.takeProfit}%`);
    console.log(`- Panic Mode: ${riskParams.panicMode ? 'Active' : 'Inactive'}`);

    return riskParams;
  } catch (error) {
    console.error('Failed to get risk parameters:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 6: Get Supported Tokens ==========
export async function exampleGetSupportedTokens() {
  try {
    console.log('Fetching supported tokens from contract...');
    const tokens = await portfolioContractService.getSupportedTokens();

    console.log(`Found ${tokens.length} supported tokens:`);
    tokens.forEach(token => {
      console.log(`- ${token.symbol} (${token.address})`);
      console.log(`  Decimals: ${token.decimals}`);
      console.log(`  Category: ${token.category}`);
    });

    return tokens;
  } catch (error) {
    console.error('Failed to get supported tokens:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 7: Get Token Prices ==========
export async function exampleGetTokenPrices() {
  try {
    const tokenAddresses = [
      '0x1234...', // WETH
      '0x5678...', // USDC
      '0x9abc...'  // Another token
    ];

    console.log('Fetching token prices from contract...');
    const prices = await portfolioContractService.getTokenPrices(tokenAddresses);

    console.log('Token Prices:');
    Object.entries(prices).forEach(([address, price]) => {
      console.log(`- ${address}: $${price.toFixed(2)}`);
    });

    return prices;
  } catch (error) {
    console.error('Failed to get token prices:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 8: Subscribe to Contract Events ==========
export async function exampleSubscribeToEvents() {
  try {
    console.log('Subscribing to contract events...');
    
    const unsubscribe = portfolioContractService.subscribeToEvents({
      onAllocationUpdated: (event) => {
        console.log('🔔 Portfolio allocation updated!');
        console.log('User:', event.user);
        console.log('Tokens:', event.tokens);
        console.log('Allocations:', event.allocations);
        console.log('Transaction:', event.transactionHash);
      },
      
      onRiskParametersSet: (event) => {
        console.log('🔔 Risk parameter updated!');
        console.log('Type:', event.type);
        console.log('Value:', event.value);
        console.log('Transaction:', event.transactionHash);
      }
    });

    console.log('Subscribed to events. Call unsubscribe() to stop listening.');
    
    // Return unsubscribe function
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to events:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 9: Complete Portfolio Creation Workflow ==========
export async function exampleCompletePortfolioWorkflow() {
  try {
    console.log('=== Starting Complete Portfolio Workflow ===\n');

    // Step 1: Get supported tokens
    console.log('Step 1: Getting supported tokens...');
    const supportedTokens = await portfolioContractService.getSupportedTokens();
    console.log(`✅ Found ${supportedTokens.length} supported tokens\n`);

    // Step 2: Select tokens and define allocations
    console.log('Step 2: Defining portfolio allocation...');
    const selectedTokens = supportedTokens.slice(0, 3); // Select first 3 tokens
    const allocations = [
      { address: selectedTokens[0].address, allocation: 40 },
      { address: selectedTokens[1].address, allocation: 35 },
      { address: selectedTokens[2].address, allocation: 25 }
    ];
    console.log('✅ Allocation defined\n');

    // Step 3: Create portfolio on blockchain
    console.log('Step 3: Creating portfolio on blockchain...');
    const createResult = await portfolioContractService.createPortfolio(allocations);
    console.log(`✅ Portfolio created! TX: ${createResult.transactionHash}\n`);

    // Step 4: Set risk parameters
    console.log('Step 4: Setting risk parameters...');
    const riskResult = await portfolioContractService.setRiskParameters({
      stopLoss: 10,
      takeProfit: 20
    });
    console.log('✅ Risk parameters set\n');

    // Step 5: Verify portfolio was created
    console.log('Step 5: Verifying portfolio...');
    const userAddress = get(walletAddress);
    const portfolioData = await portfolioContractService.getPortfolioAllocation(userAddress);
    console.log('✅ Portfolio verified:');
    portfolioData.forEach(alloc => {
      console.log(`   - ${alloc.symbol}: ${alloc.allocation}%`);
    });

    console.log('\n=== Portfolio Workflow Complete ===');
    
    return {
      portfolio: portfolioData,
      createTx: createResult.transactionHash,
      riskTxs: riskResult.transactions
    };
  } catch (error) {
    console.error('Workflow failed:', error.message);
    throw error;
  }
}

// ========== EXAMPLE 10: Error Handling ==========
export async function exampleErrorHandling() {
  try {
    // Example: Try to create portfolio with invalid allocation (doesn't sum to 100%)
    const invalidAllocations = [
      { address: '0x1234...', allocation: 40 },
      { address: '0x5678...', allocation: 40 }
      // Total: 80% (should be 100%)
    ];

    await portfolioContractService.createPortfolio(invalidAllocations);
  } catch (error) {
    // Error will be formatted with user-friendly message
    console.log('Caught expected error:', error.message);
    // Output: "Total allocation must equal 100%, got 80%"
  }

  try {
    // Example: Try to get portfolio for address with no portfolio
    const emptyAddress = '0x0000000000000000000000000000000000000000';
    const allocations = await portfolioContractService.getPortfolioAllocation(emptyAddress);
    
    if (allocations.length === 0) {
      console.log('No portfolio found (this is expected)');
    }
  } catch (error) {
    console.log('Error getting portfolio:', error.message);
  }
}

// Export all examples
export const portfolioContractExamples = {
  createPortfolio: exampleCreatePortfolio,
  getPortfolioAllocation: exampleGetPortfolioAllocation,
  updatePortfolioAllocation: exampleUpdatePortfolioAllocation,
  setRiskParameters: exampleSetRiskParameters,
  getRiskParameters: exampleGetRiskParameters,
  getSupportedTokens: exampleGetSupportedTokens,
  getTokenPrices: exampleGetTokenPrices,
  subscribeToEvents: exampleSubscribeToEvents,
  completeWorkflow: exampleCompletePortfolioWorkflow,
  errorHandling: exampleErrorHandling
};
