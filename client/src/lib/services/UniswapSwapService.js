/**
 * Uniswap V3 Swap Service
 * Handles token swaps using Uniswap V3 SDK with proper slippage and gas estimation
 */

import { ethers } from 'ethers';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Pool, Route, Trade, SwapRouter } from '@uniswap/v3-sdk';
import { get } from 'svelte/store';
import { walletService } from '$lib/stores/wallet.js';
import { INITIAL_TOKEN_LIST, REACTIVE_CHAIN_ID_DEC } from '$lib/config/network.js';

// Uniswap V3 Router address (this should be configured for your network)
const UNISWAP_V3_ROUTER_ADDRESS = import.meta.env.VITE_UNISWAP_V3_ROUTER || '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Uniswap V3 Quoter address for getting quotes
const UNISWAP_V3_QUOTER_ADDRESS = import.meta.env.VITE_UNISWAP_V3_QUOTER || '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

// Pool fee tiers (in hundredths of a bip, i.e. 1e-6)
const FEE_TIERS = {
  LOWEST: 100,    // 0.01%
  LOW: 500,       // 0.05%
  MEDIUM: 3000,   // 0.3%
  HIGH: 10000     // 1%
};

// ERC20 ABI for approvals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Quoter ABI for getting quotes
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

class UniswapSwapService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.chainId = REACTIVE_CHAIN_ID_DEC;
  }

  /**
   * Initialize the service with wallet provider
   */
  async initialize() {
    const wallet = get(walletService.store);
    if (!wallet || !wallet.isConnected || !wallet.provider) {
      throw new Error('Wallet not connected');
    }

    this.provider = new ethers.BrowserProvider(wallet.provider);
    this.signer = await this.provider.getSigner();
    
    return true;
  }

  /**
   * Get token metadata from address
   */
  getTokenMetadata(tokenAddress) {
    return INITIAL_TOKEN_LIST.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
  }

  /**
   * Create SDK Token instance
   */
  createToken(tokenAddress) {
    const metadata = this.getTokenMetadata(tokenAddress);
    if (!metadata) {
      throw new Error(`Token ${tokenAddress} not found in token list`);
    }

    return new Token(
      this.chainId,
      tokenAddress,
      metadata.decimals,
      metadata.symbol,
      metadata.name
    );
  }

  /**
   * Get quote for a swap using Uniswap V3 Quoter
   */
  async getQuote(tokenInAddress, tokenOutAddress, amountIn, feeTier = FEE_TIERS.MEDIUM) {
    try {
      const tokenIn = this.createToken(tokenInAddress);
      const tokenOut = this.createToken(tokenOutAddress);
      
      // Parse amount to raw units
      const amountInWei = ethers.parseUnits(amountIn.toString(), tokenIn.decimals);
      
      // Get quote from Quoter contract
      const quoterContract = new ethers.Contract(
        UNISWAP_V3_QUOTER_ADDRESS,
        QUOTER_ABI,
        this.provider
      );

      const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall(
        tokenInAddress,
        tokenOutAddress,
        feeTier,
        amountInWei,
        0 // sqrtPriceLimitX96 = 0 means no price limit
      );

      const amountOut = ethers.formatUnits(quotedAmountOut, tokenOut.decimals);
      
      return {
        amountIn: amountIn.toString(),
        amountOut: amountOut,
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        feeTier,
        priceImpact: this.calculatePriceImpact(amountIn, amountOut, tokenIn, tokenOut)
      };
    } catch (error) {
      console.error('Error getting quote:', error);
      throw new Error(`Failed to get quote: ${error.message}`);
    }
  }

  /**
   * Calculate price impact percentage
   */
  calculatePriceImpact(amountIn, amountOut, tokenIn, tokenOut) {
    // This is a simplified calculation
    // In production, you'd want to compare against spot price
    const effectivePrice = parseFloat(amountOut) / parseFloat(amountIn);
    // For now, return 0 as we don't have reference price
    return 0;
  }

  /**
   * Approve token spending for Uniswap router
   */
  async approveToken(tokenAddress, amount) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      const owner = await this.signer.getAddress();
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(owner, UNISWAP_V3_ROUTER_ADDRESS);
      const amountWei = ethers.parseUnits(amount.toString(), await tokenContract.decimals());
      
      if (currentAllowance >= amountWei) {
        console.log('Token already approved');
        return null;
      }

      // Approve spending
      console.log(`Approving ${amount} tokens for Uniswap router...`);
      const approveTx = await tokenContract.approve(UNISWAP_V3_ROUTER_ADDRESS, amountWei);
      const receipt = await approveTx.wait();
      
      console.log('Token approved:', receipt.hash);
      return receipt;
    } catch (error) {
      console.error('Error approving token:', error);
      throw new Error(`Failed to approve token: ${error.message}`);
    }
  }

  /**
   * Execute a single token swap
   */
  async executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1, feeTier = FEE_TIERS.MEDIUM) {
    try {
      if (!this.signer) {
        await this.initialize();
      }

      const tokenIn = this.createToken(tokenInAddress);
      const tokenOut = this.createToken(tokenOutAddress);
      const recipient = await this.signer.getAddress();

      // Parse amount
      const amountInWei = ethers.parseUnits(amountIn.toString(), tokenIn.decimals);

      // Approve token spending
      await this.approveToken(tokenInAddress, amountIn);

      // Get quote to calculate minimum amount out
      const quote = await this.getQuote(tokenInAddress, tokenOutAddress, amountIn, feeTier);
      const minAmountOut = parseFloat(quote.amountOut) * (1 - slippagePercent / 100);
      const minAmountOutWei = ethers.parseUnits(minAmountOut.toFixed(tokenOut.decimals), tokenOut.decimals);

      // Prepare swap parameters
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

      // Build swap parameters for exactInputSingle
      const params = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: feeTier,
        recipient: recipient,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOutWei,
        sqrtPriceLimitX96: 0
      };

      // Execute swap
      const routerContract = new ethers.Contract(
        UNISWAP_V3_ROUTER_ADDRESS,
        [
          'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
        ],
        this.signer
      );

      console.log('Executing swap:', {
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn: amountIn.toString(),
        expectedOut: quote.amountOut,
        minAmountOut: minAmountOut.toFixed(tokenOut.decimals),
        slippage: `${slippagePercent}%`
      });

      const swapTx = await routerContract.exactInputSingle(params);
      const receipt = await swapTx.wait();

      console.log('Swap completed:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash,
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn: amountIn.toString(),
        expectedAmountOut: quote.amountOut,
        receipt
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      throw new Error(`Swap failed: ${error.message}`);
    }
  }

  /**
   * Execute multiple swaps based on portfolio allocations
   * This is the main function for portfolio creation
   */
  async executePortfolioSwaps(depositAmount, allocations, slippagePercent = 1, onProgress = null) {
    try {
      if (!this.signer) {
        await this.initialize();
      }

      const results = [];
      const errors = [];
      let completedSwaps = 0;

      // Sort allocations by percentage (largest first) for better execution
      const sortedAllocations = [...allocations].sort((a, b) => b.percentage - a.percentage);

      console.log('Starting portfolio swaps:', {
        totalDeposit: depositAmount,
        tokenCount: sortedAllocations.length,
        allocations: sortedAllocations.map(a => `${a.tokenSymbol}: ${a.percentage}%`)
      });

      // Execute swaps sequentially to avoid nonce issues
      for (const allocation of sortedAllocations) {
        try {
          // Calculate amount for this token
          const tokenAmount = (parseFloat(depositAmount) * allocation.percentage) / 100;

          if (onProgress) {
            onProgress({
              status: 'swapping',
              token: allocation.tokenSymbol,
              progress: (completedSwaps / sortedAllocations.length) * 100,
              message: `Swapping for ${allocation.tokenSymbol}...`
            });
          }

          // Get the base token address (assuming REACT or WETH as base)
          const baseTokenAddress = INITIAL_TOKEN_LIST.find(t => t.symbol === 'REACT')?.address;
          if (!baseTokenAddress) {
            throw new Error('Base token (REACT) not found');
          }

          // Execute swap from base token to target token
          const swapResult = await this.executeSwap(
            baseTokenAddress,
            allocation.tokenAddress,
            tokenAmount,
            slippagePercent
          );

          results.push({
            ...swapResult,
            allocation: allocation.percentage,
            amountAllocated: tokenAmount
          });

          completedSwaps++;

          if (onProgress) {
            onProgress({
              status: 'completed',
              token: allocation.tokenSymbol,
              progress: (completedSwaps / sortedAllocations.length) * 100,
              message: `Swapped ${tokenAmount} for ${allocation.tokenSymbol}`
            });
          }

        } catch (error) {
          console.error(`Error swapping for ${allocation.tokenSymbol}:`, error);
          errors.push({
            token: allocation.tokenSymbol,
            error: error.message
          });

          if (onProgress) {
            onProgress({
              status: 'error',
              token: allocation.tokenSymbol,
              progress: (completedSwaps / sortedAllocations.length) * 100,
              message: `Failed to swap for ${allocation.tokenSymbol}: ${error.message}`
            });
          }
        }
      }

      return {
        success: errors.length === 0,
        completed: results.length,
        failed: errors.length,
        results,
        errors
      };

    } catch (error) {
      console.error('Error executing portfolio swaps:', error);
      throw new Error(`Portfolio swaps failed: ${error.message}`);
    }
  }

  /**
   * Estimate gas for a swap
   */
  async estimateSwapGas(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1) {
    try {
      const tokenIn = this.createToken(tokenInAddress);
      const tokenOut = this.createToken(tokenOutAddress);
      const recipient = await this.signer.getAddress();

      const amountInWei = ethers.parseUnits(amountIn.toString(), tokenIn.decimals);
      const quote = await this.getQuote(tokenInAddress, tokenOutAddress, amountIn);
      const minAmountOut = parseFloat(quote.amountOut) * (1 - slippagePercent / 100);
      const minAmountOutWei = ethers.parseUnits(minAmountOut.toFixed(tokenOut.decimals), tokenOut.decimals);

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const params = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: FEE_TIERS.MEDIUM,
        recipient: recipient,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOutWei,
        sqrtPriceLimitX96: 0
      };

      const routerContract = new ethers.Contract(
        UNISWAP_V3_ROUTER_ADDRESS,
        [
          'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
        ],
        this.signer
      );

      const gasEstimate = await routerContract.exactInputSingle.estimateGas(params);
      const gasPrice = await this.provider.getFeeData();

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPrice.gasPrice?.toString() || '0',
        estimatedCost: ethers.formatEther((gasEstimate * (gasPrice.gasPrice || 0n)).toString())
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      return {
        gasLimit: '300000', // Default estimate
        gasPrice: '0',
        estimatedCost: '0'
      };
    }
  }
}

export const uniswapSwapService = new UniswapSwapService();
export { FEE_TIERS };
