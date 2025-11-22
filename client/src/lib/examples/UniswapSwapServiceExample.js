/**
 * Uniswap Swap Service Usage Examples
 * 
 * This file demonstrates how to use the UniswapSwapService for executing token swaps
 * in a portfolio management context.
 */

import { uniswapSwapService, FEE_TIERS } from '$lib/services/UniswapSwapService.js';
import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';

/**
 * Example 1: Execute a single token swap
 */
export async function singleSwapExample() {
  try {
    // Initialize the service
    await uniswapSwapService.initialize();
    
    // Get token addresses
    const reactToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'REACT');
    const usdcToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'USDC');
    
    // Execute swap: 100 REACT -> USDC with 1% slippage
    const result = await uniswapSwapService.executeSwap(
      reactToken.address,
      usdcToken.address,
      100, // amount in
      1,   // slippage percent
      FEE_TIERS.MEDIUM // 0.3% fee tier
    );
    
    console.log('Swap completed:', result);
    return result;
  } catch (error) {
    console.error('Single swap failed:', error);
    throw error;
  }
}

/**
 * Example 2: Get a quote before swapping
 */
export async function getQuoteExample() {
  try {
    await uniswapSwapService.initialize();
    
    const reactToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'REACT');
    const ethToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'ETH');
    
    // Get quote for 50 REACT -> ETH
    const quote = await uniswapSwapService.getQuote(
      reactToken.address,
      ethToken.address,
      50,
      FEE_TIERS.MEDIUM
    );
    
    console.log('Quote:', {
      amountIn: quote.amountIn,
      expectedOut: quote.amountOut,
      priceImpact: quote.priceImpact,
      feeTier: quote.feeTier
    });
    
    return quote;
  } catch (error) {
    console.error('Get quote failed:', error);
    throw error;
  }
}

/**
 * Example 3: Execute portfolio swaps with multiple tokens
 */
export async function portfolioSwapsExample() {
  try {
    await uniswapSwapService.initialize();
    
    // Define portfolio allocations
    const allocations = [
      {
        tokenAddress: INITIAL_TOKEN_LIST.find(t => t.symbol === 'BTC').address,
        tokenSymbol: 'BTC',
        tokenName: 'Bitcoin',
        percentage: 40
      },
      {
        tokenAddress: INITIAL_TOKEN_LIST.find(t => t.symbol === 'ETH').address,
        tokenSymbol: 'ETH',
        tokenName: 'Ethereum',
        percentage: 30
      },
      {
        tokenAddress: INITIAL_TOKEN_LIST.find(t => t.symbol === 'USDC').address,
        tokenSymbol: 'USDC',
        tokenName: 'USD Coin',
        percentage: 30
      }
    ];
    
    // Total deposit amount
    const depositAmount = 1000; // 1000 REACT
    
    // Execute swaps with progress tracking
    const result = await uniswapSwapService.executePortfolioSwaps(
      depositAmount,
      allocations,
      1, // 1% slippage
      (progress) => {
        console.log('Progress:', {
          status: progress.status,
          token: progress.token,
          progress: `${progress.progress.toFixed(2)}%`,
          message: progress.message
        });
      }
    );
    
    console.log('Portfolio swaps result:', {
      success: result.success,
      completed: result.completed,
      failed: result.failed,
      results: result.results,
      errors: result.errors
    });
    
    return result;
  } catch (error) {
    console.error('Portfolio swaps failed:', error);
    throw error;
  }
}

/**
 * Example 4: Estimate gas for a swap
 */
export async function estimateGasExample() {
  try {
    await uniswapSwapService.initialize();
    
    const reactToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'REACT');
    const btcToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'BTC');
    
    // Estimate gas for 100 REACT -> BTC swap
    const gasEstimate = await uniswapSwapService.estimateSwapGas(
      reactToken.address,
      btcToken.address,
      100,
      1 // 1% slippage
    );
    
    console.log('Gas estimate:', {
      gasLimit: gasEstimate.gasLimit,
      gasPrice: gasEstimate.gasPrice,
      estimatedCost: `${gasEstimate.estimatedCost} ETH`
    });
    
    return gasEstimate;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Example 5: Handle swap errors gracefully
 */
export async function errorHandlingExample() {
  try {
    await uniswapSwapService.initialize();
    
    const allocations = [
      {
        tokenAddress: INITIAL_TOKEN_LIST.find(t => t.symbol === 'BTC').address,
        tokenSymbol: 'BTC',
        percentage: 50
      },
      {
        tokenAddress: INITIAL_TOKEN_LIST.find(t => t.symbol === 'ETH').address,
        tokenSymbol: 'ETH',
        percentage: 50
      }
    ];
    
    const result = await uniswapSwapService.executePortfolioSwaps(
      500,
      allocations,
      1,
      (progress) => {
        if (progress.status === 'error') {
          console.error(`Swap failed for ${progress.token}:`, progress.message);
          // Handle individual swap errors
          // Could retry, skip, or notify user
        }
      }
    );
    
    // Check overall result
    if (!result.success) {
      console.warn('Some swaps failed:', result.errors);
      // Handle partial success
      // Could show user which swaps succeeded and which failed
    }
    
    return result;
  } catch (error) {
    console.error('Critical error in portfolio swaps:', error);
    // Handle complete failure
    throw error;
  }
}

/**
 * Example 6: Using different fee tiers
 */
export async function feeTierExample() {
  try {
    await uniswapSwapService.initialize();
    
    const reactToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'REACT');
    const usdcToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'USDC');
    
    // Try different fee tiers to find best price
    const feeTiers = [
      FEE_TIERS.LOWEST,  // 0.01%
      FEE_TIERS.LOW,     // 0.05%
      FEE_TIERS.MEDIUM,  // 0.3%
      FEE_TIERS.HIGH     // 1%
    ];
    
    const quotes = await Promise.all(
      feeTiers.map(async (feeTier) => {
        try {
          const quote = await uniswapSwapService.getQuote(
            reactToken.address,
            usdcToken.address,
            100,
            feeTier
          );
          return { feeTier, quote };
        } catch (error) {
          return { feeTier, error: error.message };
        }
      })
    );
    
    console.log('Fee tier comparison:', quotes);
    
    // Find best quote (highest output)
    const bestQuote = quotes
      .filter(q => q.quote)
      .reduce((best, current) => 
        parseFloat(current.quote.amountOut) > parseFloat(best.quote.amountOut) 
          ? current 
          : best
      );
    
    console.log('Best fee tier:', bestQuote.feeTier);
    
    return bestQuote;
  } catch (error) {
    console.error('Fee tier comparison failed:', error);
    throw error;
  }
}

/**
 * Example 7: Complete portfolio creation workflow
 */
export async function completeWorkflowExample() {
  try {
    console.log('Starting complete portfolio creation workflow...');
    
    // Step 1: Initialize service
    await uniswapSwapService.initialize();
    console.log('✓ Service initialized');
    
    // Step 2: Define portfolio
    const portfolioConfig = {
      name: 'Balanced Crypto Portfolio',
      depositAmount: 1000,
      allocations: [
        { symbol: 'BTC', percentage: 35 },
        { symbol: 'ETH', percentage: 35 },
        { symbol: 'USDC', percentage: 20 },
        { symbol: 'UNI', percentage: 10 }
      ]
    };
    
    // Step 3: Prepare allocations with token data
    const allocations = portfolioConfig.allocations.map(alloc => {
      const token = INITIAL_TOKEN_LIST.find(t => t.symbol === alloc.symbol);
      return {
        tokenAddress: token.address,
        tokenSymbol: token.symbol,
        tokenName: token.name,
        percentage: alloc.percentage
      };
    });
    
    console.log('✓ Portfolio configured:', portfolioConfig.name);
    
    // Step 4: Get quotes for all swaps
    console.log('Getting quotes...');
    const reactToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'REACT');
    
    for (const alloc of allocations) {
      const amount = (portfolioConfig.depositAmount * alloc.percentage) / 100;
      try {
        const quote = await uniswapSwapService.getQuote(
          reactToken.address,
          alloc.tokenAddress,
          amount
        );
        console.log(`  ${alloc.tokenSymbol}: ${amount} REACT → ${quote.amountOut} ${alloc.tokenSymbol}`);
      } catch (error) {
        console.warn(`  ${alloc.tokenSymbol}: Quote unavailable`);
      }
    }
    
    // Step 5: Execute swaps
    console.log('Executing swaps...');
    const result = await uniswapSwapService.executePortfolioSwaps(
      portfolioConfig.depositAmount,
      allocations,
      1,
      (progress) => {
        console.log(`  [${progress.progress.toFixed(0)}%] ${progress.token}: ${progress.message}`);
      }
    );
    
    // Step 6: Report results
    console.log('\n=== Portfolio Creation Complete ===');
    console.log(`Success: ${result.success}`);
    console.log(`Completed swaps: ${result.completed}/${allocations.length}`);
    if (result.failed > 0) {
      console.log(`Failed swaps: ${result.failed}`);
      result.errors.forEach(err => {
        console.log(`  - ${err.token}: ${err.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Complete workflow failed:', error);
    throw error;
  }
}

// Export all examples
export default {
  singleSwapExample,
  getQuoteExample,
  portfolioSwapsExample,
  estimateGasExample,
  errorHandlingExample,
  feeTierExample,
  completeWorkflowExample
};
