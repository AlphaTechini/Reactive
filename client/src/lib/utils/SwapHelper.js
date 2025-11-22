/**
 * Swap Helper Utilities
 * Helper functions for calculating swap amounts and managing portfolio swaps
 */

/**
 * Calculate individual token amounts based on total deposit and allocations
 * @param {number} totalDeposit - Total deposit amount
 * @param {Array} allocations - Array of allocation objects with percentage
 * @returns {Array} Array of allocations with calculated amounts
 */
export function calculateTokenAmounts(totalDeposit, allocations) {
  return allocations.map(allocation => ({
    ...allocation,
    amount: (parseFloat(totalDeposit) * allocation.percentage) / 100
  }));
}

/**
 * Validate allocations sum to 100%
 * @param {Array} allocations - Array of allocation objects with percentage
 * @returns {boolean} True if valid
 */
export function validateAllocations(allocations) {
  const total = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
  return Math.abs(total - 100) < 0.01; // Allow small floating point errors
}

/**
 * Calculate total allocation percentage
 * @param {Array} allocations - Array of allocation objects with percentage
 * @returns {number} Total percentage
 */
export function calculateTotalAllocation(allocations) {
  return allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
}

/**
 * Distribute remaining percentage equally among tokens
 * @param {Array} allocations - Array of allocation objects
 * @param {number} remaining - Remaining percentage to distribute
 * @returns {Array} Updated allocations
 */
export function distributeRemaining(allocations, remaining) {
  if (allocations.length === 0) return allocations;
  
  const perToken = remaining / allocations.length;
  return allocations.map(alloc => ({
    ...alloc,
    percentage: alloc.percentage + perToken
  }));
}

/**
 * Auto-distribute percentages equally among selected tokens
 * @param {Array} tokens - Array of selected tokens
 * @returns {Object} Object mapping token addresses to percentages
 */
export function autoDistributeEqual(tokens) {
  if (tokens.length === 0) return {};
  
  const equalPercentage = 100 / tokens.length;
  const allocations = {};
  
  tokens.forEach((token, index) => {
    allocations[token.address] = parseFloat(equalPercentage.toFixed(2));
  });
  
  // Adjust last token to ensure exactly 100%
  const lastToken = tokens[tokens.length - 1];
  const currentTotal = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  allocations[lastToken.address] = parseFloat(
    (allocations[lastToken.address] + (100 - currentTotal)).toFixed(2)
  );
  
  return allocations;
}

/**
 * Format swap result for display
 * @param {Object} result - Swap result from UniswapSwapService
 * @returns {string} Formatted message
 */
export function formatSwapResult(result) {
  if (result.success) {
    return `Successfully swapped ${result.amountIn} for ${result.expectedAmountOut} ${result.tokenOut}`;
  } else {
    return `Swap failed: ${result.error}`;
  }
}

/**
 * Calculate estimated gas cost for multiple swaps
 * @param {number} swapCount - Number of swaps to execute
 * @param {number} gasPerSwap - Estimated gas per swap (default: 150000)
 * @param {number} gasPrice - Gas price in gwei (default: 50)
 * @returns {Object} Gas estimation details
 */
export function estimateMultiSwapGas(swapCount, gasPerSwap = 150000, gasPrice = 50) {
  const totalGas = swapCount * gasPerSwap;
  const gasCostWei = totalGas * gasPrice * 1e9; // Convert gwei to wei
  const gasCostEth = gasCostWei / 1e18;
  
  return {
    totalGas,
    gasPrice,
    gasCostWei: gasCostWei.toString(),
    gasCostEth: gasCostEth.toFixed(6),
    swapCount
  };
}

/**
 * Sort allocations by percentage (descending) for optimal execution
 * @param {Array} allocations - Array of allocation objects
 * @returns {Array} Sorted allocations
 */
export function sortAllocationsBySize(allocations) {
  return [...allocations].sort((a, b) => b.percentage - a.percentage);
}

/**
 * Validate minimum swap amount
 * @param {number} amount - Amount to swap
 * @param {number} minAmount - Minimum allowed amount (default: 0.001)
 * @returns {boolean} True if valid
 */
export function validateMinSwapAmount(amount, minAmount = 0.001) {
  return parseFloat(amount) >= minAmount;
}

/**
 * Calculate slippage amount
 * @param {number} amount - Expected amount
 * @param {number} slippagePercent - Slippage percentage
 * @returns {number} Minimum amount after slippage
 */
export function calculateSlippage(amount, slippagePercent) {
  return parseFloat(amount) * (1 - slippagePercent / 100);
}

/**
 * Format allocation for display
 * @param {Object} allocation - Allocation object
 * @returns {string} Formatted string
 */
export function formatAllocation(allocation) {
  return `${allocation.tokenSymbol}: ${allocation.percentage.toFixed(2)}%`;
}

/**
 * Group allocations by category
 * @param {Array} allocations - Array of allocation objects with tokens
 * @returns {Object} Allocations grouped by category
 */
export function groupAllocationsByCategory(allocations) {
  return allocations.reduce((groups, alloc) => {
    const category = alloc.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(alloc);
    return groups;
  }, {});
}

export default {
  calculateTokenAmounts,
  validateAllocations,
  calculateTotalAllocation,
  distributeRemaining,
  autoDistributeEqual,
  formatSwapResult,
  estimateMultiSwapGas,
  sortAllocationsBySize,
  validateMinSwapAmount,
  calculateSlippage,
  formatAllocation,
  groupAllocationsByCategory
};
