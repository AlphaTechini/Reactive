/**
 * Price Formatter Utility
 * 
 * Provides null-safe price formatting functions for consistent display across all components.
 * Handles undefined, null, NaN, and invalid numeric values gracefully.
 * 
 * Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.3
 */

/**
 * Check if a value is valid for numeric operations
 * @param {*} value - Value to check
 * @returns {boolean} - True if value is a finite number
 */
export function isValidPrice(value) {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Get safe numeric value with fallback
 * @param {*} value - Value to convert
 * @param {number} fallback - Fallback value if invalid (default: 0)
 * @returns {number} - Safe numeric value
 */
export function getSafePrice(value, fallback = 0) {
  if (isValidPrice(value)) {
    return value;
  }
  return fallback;
}

/**
 * Determine appropriate decimal places based on price magnitude
 * @param {number} price - Price value
 * @returns {number} - Number of decimal places
 */
function getDecimalPrecision(price) {
  const absPrice = Math.abs(price);
  
  if (absPrice === 0) {
    return 2;
  }
  
  // For very small prices (< $0.01), show up to 8 decimals
  if (absPrice < 0.01) {
    return 8;
  }
  
  // For small prices ($0.01 - $1), show 4 decimals
  if (absPrice < 1) {
    return 4;
  }
  
  // For normal prices ($1 - $1000), show 2 decimals
  if (absPrice < 1000) {
    return 2;
  }
  
  // For large prices (>= $1000), show 2 decimals
  return 2;
}

/**
 * Format price with appropriate decimals and currency symbol
 * @param {*} price - Price value to format
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Override automatic decimal precision
 * @param {string} options.currency - Currency symbol (default: '$')
 * @param {boolean} options.showCurrency - Show currency symbol (default: true)
 * @param {string} options.fallback - Fallback text for invalid values (default: 'N/A')
 * @returns {string} - Formatted price string
 */
export function formatPrice(price, options = {}) {
  const {
    decimals = 'auto',
    currency = '$',
    showCurrency = true,
    fallback = 'N/A'
  } = options;
  
  // Handle invalid values
  if (!isValidPrice(price)) {
    return fallback;
  }
  
  // Get safe numeric value
  const safePrice = getSafePrice(price, 0);
  
  // Determine decimal places
  const decimalPlaces = decimals === 'auto' 
    ? getDecimalPrecision(safePrice)
    : decimals;
  
  // Format the number
  const formattedNumber = safePrice.toFixed(decimalPlaces);
  
  // Add currency symbol if requested
  if (showCurrency) {
    return `${currency}${formattedNumber}`;
  }
  
  return formattedNumber;
}

/**
 * Format percentage change with sign and precision
 * @param {*} change - Change percentage value
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Decimal places (default: 2)
 * @param {boolean} options.showSign - Always show sign (default: true)
 * @param {boolean} options.showPercent - Show percent symbol (default: true)
 * @param {string} options.fallback - Fallback text for invalid values (default: 'N/A')
 * @returns {string} - Formatted change string
 */
export function formatChange(change, options = {}) {
  const {
    decimals = 2,
    showSign = true,
    showPercent = true,
    fallback = 'N/A'
  } = options;
  
  // Handle invalid values
  if (!isValidPrice(change)) {
    return fallback;
  }
  
  // Get safe numeric value
  const safeChange = getSafePrice(change, 0);
  
  // Format the number
  const formattedNumber = Math.abs(safeChange).toFixed(decimals);
  
  // Determine sign
  let sign = '';
  if (showSign) {
    if (safeChange > 0) {
      sign = '+';
    } else if (safeChange < 0) {
      sign = '-';
    }
  } else if (safeChange < 0) {
    sign = '-';
  }
  
  // Build result
  let result = `${sign}${formattedNumber}`;
  
  // Add percent symbol if requested
  if (showPercent) {
    result += '%';
  }
  
  return result;
}

/**
 * Format price with compact notation for large numbers
 * @param {*} price - Price value to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted price string (e.g., "$1.2M", "$3.4K")
 */
export function formatPriceCompact(price, options = {}) {
  const {
    currency = '$',
    fallback = 'N/A'
  } = options;
  
  // Handle invalid values
  if (!isValidPrice(price)) {
    return fallback;
  }
  
  const safePrice = getSafePrice(price, 0);
  const absPrice = Math.abs(safePrice);
  
  let formatted;
  
  if (absPrice >= 1e9) {
    formatted = (safePrice / 1e9).toFixed(2) + 'B';
  } else if (absPrice >= 1e6) {
    formatted = (safePrice / 1e6).toFixed(2) + 'M';
  } else if (absPrice >= 1e3) {
    formatted = (safePrice / 1e3).toFixed(2) + 'K';
  } else {
    return formatPrice(price, { currency, showCurrency: true });
  }
  
  return `${currency}${formatted}`;
}

/**
 * Default export object with all formatter functions
 */
export const priceFormatter = {
  formatPrice,
  formatChange,
  formatPriceCompact,
  isValidPrice,
  getSafePrice
};

export default priceFormatter;
