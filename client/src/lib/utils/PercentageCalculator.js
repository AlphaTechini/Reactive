/**
 * Percentage Calculator Utilities
 * 
 * Provides precise percentage calculations with 2-decimal accuracy,
 * allocation validation, and percentage change calculations as specified
 * in requirements 1.2, 1.3
 */

// Precision constants
const PERCENTAGE_PRECISION = 2; // 2 decimal places as per requirements
const ALLOCATION_TOLERANCE = 0.01; // 1% tolerance for allocation validation
const MAX_PERCENTAGE = 100;
const MIN_PERCENTAGE = 0;

/**
 * Round number to specified decimal places with proper rounding
 */
export function roundToPrecision(value, precision = PERCENTAGE_PRECISION) {
  const factor = Math.pow(10, precision);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculate percentage with 2-decimal precision
 */
export function calculatePercentage(part, total) {
  if (!total || total === 0) {
    return 0;
  }
  
  if (typeof part !== 'number' || typeof total !== 'number') {
    throw new Error('Both part and total must be numbers');
  }
  
  if (part < 0 || total < 0) {
    throw new Error('Part and total must be non-negative');
  }
  
  const percentage = (part / total) * 100;
  return roundToPrecision(percentage, PERCENTAGE_PRECISION);
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue, newValue) {
  if (typeof oldValue !== 'number' || typeof newValue !== 'number') {
    throw new Error('Both old and new values must be numbers');
  }
  
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100; // 100% increase from 0
  }
  
  const change = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  return roundToPrecision(change, PERCENTAGE_PRECISION);
}

/**
 * Calculate percentage change for various timeframes
 */
export function calculateTimeframeChange(currentPrice, historicalPrices, timeframe = '24h') {
  if (!currentPrice || !historicalPrices || historicalPrices.length === 0) {
    return 0;
  }
  
  const now = Date.now();
  let targetTime;
  
  // Define timeframe durations in milliseconds
  const timeframes = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const duration = timeframes[timeframe];
  if (!duration) {
    throw new Error(`Unsupported timeframe: ${timeframe}`);
  }
  
  targetTime = now - duration;
  
  // Find the closest historical price to the target time
  let closestPrice = null;
  let closestTimeDiff = Infinity;
  
  for (const pricePoint of historicalPrices) {
    const timeDiff = Math.abs(pricePoint.timestamp - targetTime);
    if (timeDiff < closestTimeDiff) {
      closestTimeDiff = timeDiff;
      closestPrice = pricePoint.price;
    }
  }
  
  if (closestPrice === null) {
    return 0;
  }
  
  return calculatePercentageChange(closestPrice, currentPrice);
}

/**
 * Validate allocation percentages ensure they sum to 100%
 */
export function validateAllocationPercentages(allocations) {
  if (!Array.isArray(allocations) && typeof allocations !== 'object') {
    throw new Error('Allocations must be an array or object');
  }
  
  // Convert object to array if needed
  const percentages = Array.isArray(allocations) 
    ? allocations 
    : Object.values(allocations);
  
  // Validate individual percentages
  for (const percentage of percentages) {
    if (typeof percentage !== 'number') {
      throw new Error('All allocation percentages must be numbers');
    }
    
    if (percentage < MIN_PERCENTAGE || percentage > MAX_PERCENTAGE) {
      throw new Error(`Allocation percentage must be between ${MIN_PERCENTAGE}% and ${MAX_PERCENTAGE}%`);
    }
  }
  
  // Calculate total
  const total = percentages.reduce((sum, percentage) => sum + percentage, 0);
  const roundedTotal = roundToPrecision(total, PERCENTAGE_PRECISION);
  
  // Check if total equals 100% within tolerance
  const deviation = Math.abs(roundedTotal - MAX_PERCENTAGE);
  const isValid = deviation <= ALLOCATION_TOLERANCE;
  
  return {
    isValid,
    total: roundedTotal,
    deviation,
    tolerance: ALLOCATION_TOLERANCE,
    percentages: percentages.map(p => roundToPrecision(p, PERCENTAGE_PRECISION))
  };
}

/**
 * Normalize allocation percentages to sum to exactly 100%
 */
export function normalizeAllocations(allocations) {
  const validation = validateAllocationPercentages(allocations);
  
  if (validation.isValid) {
    return validation.percentages;
  }
  
  // Normalize to 100%
  const total = validation.total;
  if (total === 0) {
    throw new Error('Cannot normalize allocations with zero total');
  }
  
  const normalizedPercentages = validation.percentages.map(percentage => {
    const normalized = (percentage / total) * MAX_PERCENTAGE;
    return roundToPrecision(normalized, PERCENTAGE_PRECISION);
  });
  
  // Handle rounding errors by adjusting the largest allocation
  const normalizedTotal = normalizedPercentages.reduce((sum, p) => sum + p, 0);
  const roundingError = MAX_PERCENTAGE - normalizedTotal;
  
  if (Math.abs(roundingError) > 0.001) {
    // Find the largest allocation and adjust it
    const maxIndex = normalizedPercentages.indexOf(Math.max(...normalizedPercentages));
    normalizedPercentages[maxIndex] = roundToPrecision(
      normalizedPercentages[maxIndex] + roundingError, 
      PERCENTAGE_PRECISION
    );
  }
  
  return normalizedPercentages;
}

/**
 * Calculate equal distribution percentages for a given number of items
 */
export function calculateEqualDistribution(itemCount) {
  if (!Number.isInteger(itemCount) || itemCount <= 0) {
    throw new Error('Item count must be a positive integer');
  }
  
  const equalPercentage = MAX_PERCENTAGE / itemCount;
  const roundedPercentage = roundToPrecision(equalPercentage, PERCENTAGE_PRECISION);
  
  // Create array with equal percentages
  const percentages = new Array(itemCount).fill(roundedPercentage);
  
  // Handle rounding errors
  const total = percentages.reduce((sum, p) => sum + p, 0);
  const roundingError = MAX_PERCENTAGE - total;
  
  if (Math.abs(roundingError) > 0.001) {
    // Distribute the rounding error across the first few items
    let remainingError = roundingError;
    for (let i = 0; i < itemCount && Math.abs(remainingError) > 0.001; i++) {
      const adjustment = remainingError > 0 ? 0.01 : -0.01;
      percentages[i] = roundToPrecision(percentages[i] + adjustment, PERCENTAGE_PRECISION);
      remainingError -= adjustment;
    }
  }
  
  return percentages;
}

/**
 * Calculate allocation drift between current and target allocations
 */
export function calculateAllocationDrift(currentAllocations, targetAllocations) {
  if (!currentAllocations || !targetAllocations) {
    throw new Error('Both current and target allocations are required');
  }
  
  const currentKeys = Object.keys(currentAllocations);
  const targetKeys = Object.keys(targetAllocations);
  
  // Ensure both have the same tokens
  const allKeys = new Set([...currentKeys, ...targetKeys]);
  
  const driftData = {};
  let totalAbsoluteDrift = 0;
  let maxDrift = 0;
  let maxDriftToken = null;
  
  for (const key of allKeys) {
    const currentPercent = currentAllocations[key] || 0;
    const targetPercent = targetAllocations[key] || 0;
    const drift = currentPercent - targetPercent;
    const absoluteDrift = Math.abs(drift);
    
    driftData[key] = {
      current: roundToPrecision(currentPercent, PERCENTAGE_PRECISION),
      target: roundToPrecision(targetPercent, PERCENTAGE_PRECISION),
      drift: roundToPrecision(drift, PERCENTAGE_PRECISION),
      absoluteDrift: roundToPrecision(absoluteDrift, PERCENTAGE_PRECISION),
      driftDirection: drift > 0 ? 'over' : drift < 0 ? 'under' : 'exact'
    };
    
    totalAbsoluteDrift += absoluteDrift;
    
    if (absoluteDrift > maxDrift) {
      maxDrift = absoluteDrift;
      maxDriftToken = key;
    }
  }
  
  return {
    tokens: driftData,
    summary: {
      totalAbsoluteDrift: roundToPrecision(totalAbsoluteDrift, PERCENTAGE_PRECISION),
      averageDrift: roundToPrecision(totalAbsoluteDrift / allKeys.size, PERCENTAGE_PRECISION),
      maxDrift: roundToPrecision(maxDrift, PERCENTAGE_PRECISION),
      maxDriftToken,
      needsRebalancing: maxDrift > 5 // 5% threshold for rebalancing suggestion
    }
  };
}

/**
 * Format percentage for display with proper sign and precision
 */
export function formatPercentage(percentage, options = {}) {
  const {
    precision = PERCENTAGE_PRECISION,
    showSign = false,
    showSymbol = true,
    colorCode = false
  } = options;
  
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return showSymbol ? '--' : '--';
  }
  
  const rounded = roundToPrecision(percentage, precision);
  const sign = showSign && rounded > 0 ? '+' : '';
  const symbol = showSymbol ? '%' : '';
  
  let formatted = `${sign}${rounded.toFixed(precision)}${symbol}`;
  
  if (colorCode) {
    if (rounded > 0) {
      formatted = `<span class="text-green-600">${formatted}</span>`;
    } else if (rounded < 0) {
      formatted = `<span class="text-red-600">${formatted}</span>`;
    } else {
      formatted = `<span class="text-gray-600">${formatted}</span>`;
    }
  }
  
  return formatted;
}

/**
 * Calculate compound percentage change over multiple periods
 */
export function calculateCompoundChange(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return 0;
  }
  
  let compoundFactor = 1;
  
  for (const change of changes) {
    if (typeof change !== 'number') {
      throw new Error('All changes must be numbers');
    }
    compoundFactor *= (1 + change / 100);
  }
  
  const compoundChange = (compoundFactor - 1) * 100;
  return roundToPrecision(compoundChange, PERCENTAGE_PRECISION);
}

/**
 * Calculate portfolio value percentages from token amounts and prices
 */
export function calculatePortfolioPercentages(holdings, prices) {
  if (!holdings || !prices) {
    throw new Error('Holdings and prices are required');
  }
  
  // Calculate total portfolio value
  let totalValue = 0;
  const tokenValues = {};
  
  for (const [tokenAddress, amount] of Object.entries(holdings)) {
    const price = prices[tokenAddress]?.price || 0;
    const value = amount * price;
    tokenValues[tokenAddress] = value;
    totalValue += value;
  }
  
  // Calculate percentages
  const percentages = {};
  for (const [tokenAddress, value] of Object.entries(tokenValues)) {
    percentages[tokenAddress] = calculatePercentage(value, totalValue);
  }
  
  return {
    percentages,
    tokenValues,
    totalValue: roundToPrecision(totalValue, 2)
  };
}

// Export utility object for easier importing
export const PercentageCalculator = {
  calculatePercentage,
  calculatePercentageChange,
  calculateTimeframeChange,
  validateAllocationPercentages,
  normalizeAllocations,
  calculateEqualDistribution,
  calculateAllocationDrift,
  formatPercentage,
  calculateCompoundChange,
  calculatePortfolioPercentages,
  roundToPrecision
};

export default PercentageCalculator;