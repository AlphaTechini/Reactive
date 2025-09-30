import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTokenConfig } from './tokenConfig.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRootEnv = path.resolve(__dirname, '../../.env');
dotenv.config({ path: repoRootEnv });

/**
 * Converts any ERC-20 token value into USD using USDC as the base
 * @param {string} tokenSymbol - Token symbol (e.g., 'PEPE', 'BTC')
 * @param {number} amount - Amount of tokens to convert (default: 1)
 * @returns {Promise<Object>} { token, priceUSD, amount, valueUSD }
 */
export async function getTokenPriceUSD(tokenSymbol, amount = 1) {
  const apiKey = process.env.CRYPTO_API;
  
  if (!apiKey) {
    throw new Error('CRYPTO_API environment variable is required');
  }

  // Map wrapped tokens to their base symbols for API calls
  const symbolMap = {
    'WBTC': 'BTC',
    'WETH': 'ETH',
    'USDC': 'USDC'
  };
  
  const apiSymbol = symbolMap[tokenSymbol] || tokenSymbol;
  
  try {
    const url = `https://api.freecryptoapi.com/v1/getConversion?from=${apiSymbol}&to=USDC&amount=${amount}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<could not read body>');
      console.error(`FreeCryptoAPI HTTP error ${response.status}: ${response.statusText} - body: ${body}`);
      throw new Error(`FreeCryptoAPI returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // If provider indicates an error, log the full payload (truncated)
    if (data && (data.status && data.status !== 'success' || data.error)) {
      const truncated = JSON.stringify(data).slice(0, 2000);
      console.error(`FreeCryptoAPI returned error payload: ${truncated}`);
      throw new Error(`API error: ${data.error || 'Unknown error'}`);
    }

    const priceUSD = data.result / amount; // Get unit price
    
    return {
      token: tokenSymbol,
      priceUSD: priceUSD,
      amount: amount,
      valueUSD: data.result
    };

  } catch (error) {
    console.error(`Failed to fetch price for ${tokenSymbol}:`, error.message);
    throw error;
  }
}

/**
 * Fetch ERC-20 token balance for a wallet address
 * @param {string} walletAddress - Ethereum wallet address
 * @param {string} tokenAddress - ERC-20 token contract address
 * @param {number} decimals - Token decimals (default: 18)
 * @returns {Promise<number>} Token balance
 */
export async function getTokenBalance(walletAddress, tokenAddress, decimals = 18) {
  // This is a placeholder - you'll need to implement actual blockchain calls
  // Options:
  // 1. Use Ethers.js with an RPC provider
  // 2. Use Web3.js
  // 3. Use a service like Alchemy, Infura, or Moralis
  
  // For now, return mock data for testing
  console.warn('getTokenBalance: Using mock data - implement with actual blockchain provider');
  
  // Mock balances for testing
  const mockBalances = {
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 0.5, // WBTC
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 10.0, // WETH
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1000.0, // USDC
  };
  
  return mockBalances[tokenAddress.toLowerCase()] || 0;
}

/**
 * Calculate portfolio value for a wallet address
 * @param {string} walletAddress - Ethereum wallet address
 * @param {string[]} tokenSymbols - Array of token symbols to check (optional, defaults to all supported)
 * @returns {Promise<Object>} { tokens: [...], totalValueUSD: number }
 */
export async function getPortfolioValue(walletAddress) {
  try {
    const { symbols } = parseTokenConfig();
    const portfolioData = [];
    let totalValueUSD = 0;

    // Process tokens in batches to avoid rate limiting
    const batchSize = 5;
    const tokenEntries = Object.entries(symbols);
    
    for (let i = 0; i < tokenEntries.length; i += batchSize) {
      const batch = tokenEntries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ([symbol, address]) => {
        try {
          // Get token balance
          const balance = await getTokenBalance(walletAddress, address, 18);
          
          if (balance === 0) {
            return null; // Skip tokens with zero balance
          }

          // Get token price in USD
          const priceData = await getTokenPriceUSD(symbol, balance);
          
          return {
            token: symbol,
            address: address,
            balance: balance,
            priceUSD: priceData.priceUSD,
            valueUSD: priceData.valueUSD
          };
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error.message);
          return {
            token: symbol,
            address: address,
            balance: 0,
            priceUSD: 0,
            valueUSD: 0,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Add non-null results to portfolio
      batchResults.forEach(result => {
        if (result) {
          portfolioData.push(result);
          if (!result.error) {
            totalValueUSD += result.valueUSD;
          }
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < tokenEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Sort by value (highest first)
    portfolioData.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0));

    return {
      walletAddress: walletAddress,
      tokens: portfolioData,
      totalValueUSD: totalValueUSD,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to calculate portfolio value:', error);
    throw error;
  }
}

/**
 * Get price for multiple tokens in a single batch
 * @param {string[]} tokenSymbols - Array of token symbols
 * @returns {Promise<Object[]>} Array of price objects
 */
export async function getBatchTokenPrices(tokenSymbols) {
  const results = [];
  
  // Process in smaller batches to avoid rate limits
  const batchSize = 10;
  
  for (let i = 0; i < tokenSymbols.length; i += batchSize) {
    const batch = tokenSymbols.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        return await getTokenPriceUSD(symbol);
      } catch (error) {
        return {
          token: symbol,
          priceUSD: null,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches
    if (i + batchSize < tokenSymbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}