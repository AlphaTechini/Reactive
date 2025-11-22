// Migrated uniswap.js helper
// This file now serves as a wrapper for backward compatibility
import { secureContractService } from '$lib/secureContractService.js';
import { uniswapSwapService } from '$lib/services/UniswapSwapService.js';
import { get } from 'svelte/store';
import { appMode } from '$lib/stores/appMode.js';

/**
 * Execute a token swap
 * Uses Uniswap V3 SDK in live mode, falls back to contract service in simulation mode
 */
export async function executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1) {
  try {
    const mode = get(appMode);
    
    if (mode === 'live') {
      // Use Uniswap V3 SDK for live swaps
      try {
        await uniswapSwapService.initialize();
        const result = await uniswapSwapService.executeSwap(
          tokenInAddress,
          tokenOutAddress,
          amountIn,
          slippagePercent
        );
        return result.receipt;
      } catch (uniswapError) {
        console.warn('Uniswap SDK swap failed, falling back to contract service:', uniswapError);
        // Fall back to contract service if Uniswap fails
        await secureContractService.initialize();
        return await secureContractService.executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent);
      }
    } else {
      // Use contract service for simulation mode
      await secureContractService.initialize();
      const tokenMeta = secureContractService.getTokenByAddress(tokenInAddress);
      let parsedAmount = amountIn;
      if (tokenMeta && tokenMeta.decimals != null) {
        parsedAmount = amountIn.toString();
      }
      const tx = await secureContractService.executeSwap(tokenInAddress, tokenOutAddress, parsedAmount, slippagePercent);
      return tx;
    }
  } catch (err) {
    console.error('executeSwap failed:', err);
    throw err;
  }
}

/**
 * Get token price
 */
export async function getTokenPrice(tokenAddress) {
  try {
    await secureContractService.initialize();
    return await secureContractService.getTokenPrice(tokenAddress);
  } catch (err) {
    console.error('getTokenPrice failed:', err);
    return 0;
  }
}

/**
 * Get quote for a swap using Uniswap V3
 */
export async function getSwapQuote(tokenInAddress, tokenOutAddress, amountIn) {
  try {
    const mode = get(appMode);
    
    if (mode === 'live') {
      await uniswapSwapService.initialize();
      return await uniswapSwapService.getQuote(tokenInAddress, tokenOutAddress, amountIn);
    } else {
      // Return mock quote for simulation
      return {
        amountIn: amountIn.toString(),
        amountOut: (parseFloat(amountIn) * 0.99).toString(), // Mock 1% slippage
        tokenIn: 'UNKNOWN',
        tokenOut: 'UNKNOWN',
        feeTier: 3000,
        priceImpact: 0
      };
    }
  } catch (err) {
    console.error('getSwapQuote failed:', err);
    throw err;
  }
}

export default { executeSwap, getTokenPrice, getSwapQuote };