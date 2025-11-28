import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to tokens.txt - try multiple locations
const possiblePaths = [
  path.resolve(__dirname, '../tokens.txt'),      // price-ingest/tokens.txt (deployment)
  path.resolve(__dirname, '../../tokens.txt'),   // Root tokens.txt (local dev)
  path.resolve(process.cwd(), 'tokens.txt'),     // Current working directory
];

const TOKENS_FILE = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

/**
 * Parse tokens.txt to extract token symbol->address mapping
 * @returns {Object} { symbols: {SYMBOL: address}, aliases: {alias: SYMBOL} }
 */
export function parseTokenConfig() {
  try {
    const content = fs.readFileSync(TOKENS_FILE, 'utf8');
    
    // Extract JSON block between delimiters
    const jsonStart = content.indexOf('---BEGIN TOKEN_JSON---');
    const jsonEnd = content.indexOf('---END TOKEN_JSON---');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Token JSON block not found in tokens.txt');
    }
    
    const jsonContent = content.slice(
      jsonStart + '---BEGIN TOKEN_JSON---'.length,
      jsonEnd
    ).trim();
    
    const symbols = JSON.parse(jsonContent);
    
    // Extract alias mappings from the text
    const aliases = {
      'bitcoin': 'WBTC',
      'ethereum': 'ETH', 
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'dai': 'DAI',
      'react': 'REACT'
    };
    
    return { symbols, aliases };
  } catch (error) {
    console.error('Failed to parse token config:', error);
    throw error;
  }
}

/**
 * Get all token symbols for batch API requests
 * @returns {string[]} Array of token symbols
 */
export function getAllTokenSymbols() {
  const { symbols } = parseTokenConfig();
  return Object.keys(symbols);
}

/**
 * Resolve alias to canonical symbol
 * @param {string} input - Symbol or alias
 * @returns {string} Canonical symbol
 */
export function resolveSymbol(input) {
  const { aliases } = parseTokenConfig();
  return aliases[input.toLowerCase()] || input.toUpperCase();
}

/**
 * Get token address by symbol
 * @param {string} symbol - Token symbol
 * @returns {string|null} Token address or null if not found
 */
export function getTokenAddress(symbol) {
  const { symbols } = parseTokenConfig();
  return symbols[symbol] || null;
}

/**
 * Build batch API URL for FreeCryptoAPI
 * @returns {string} Complete URL with all symbols
 */
export function buildBatchPriceUrl() {
  const symbols = getAllTokenSymbols();
  // Map symbols to FreeCryptoAPI format (clients see BTC/ETH directly)
  const apiSymbols = symbols.map(symbol => {
    const symbolMap = {
      'WBTC': 'BTC',
      'WETH': 'ETH',
      'USDC': 'USDC',
      'DAI': 'DAI',
      'UNI': 'UNI',
      'AAVE': 'AAVE',
      'SNX': 'SNX',
      'SUSHI': 'SUSHI',
      'CRV': 'CRV',
      'MKR': 'MKR',
      'COMP': 'COMP',
      'YFI': 'YFI',
      'GRT': 'GRT',
      'SAND': 'SAND',
      'MANA': 'MANA',
      'LDO': 'LDO',
      'OP': 'OP',
      'ARB': 'ARB',
      'BAL': 'BAL',
      'FXS': 'FXS',
      'IMX': 'IMX',
      '1INCH': '1INCH',
      'RNDR': 'RNDR',
      'SHIB': 'SHIB',
      'PEPE': 'PEPE',
      'FLOKI': 'FLOKI',
      'ELON': 'ELON',
      'AKITA': 'AKITA',
      'VINU': 'VINU',
      'SAITAMA': 'SAITAMA'
    };
    return symbolMap[symbol] || symbol;
  });
  
  // Append @binance only to the final symbol (as per API docs)
  const finalSymbols = apiSymbols.map((sym, idx) => 
    idx === apiSymbols.length - 1 ? `${sym}@binance` : sym
  );
  
  const symbolString = finalSymbols.join('+');
  return `https://api.freecryptoapi.com/v1/getData?symbol=${symbolString}`;
}