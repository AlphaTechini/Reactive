// Migrated uniswap.js helper
import { secureContractService } from '$lib/secureContractService.js';

export async function executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1) {
  try {
    await secureContractService.initialize();
    const tokenMeta = secureContractService.getTokenByAddress(tokenInAddress);
    let parsedAmount = amountIn;
    if (tokenMeta && tokenMeta.decimals != null) {
      parsedAmount = amountIn.toString();
    }
    const tx = await secureContractService.executeSwap(tokenInAddress, tokenOutAddress, parsedAmount, slippagePercent);
    return tx;
  } catch (err) {
    console.error('executeSwap failed:', err);
    throw err;
  }
}

export async function getTokenPrice(tokenAddress) {
  try {
    await secureContractService.initialize();
    return await secureContractService.getTokenPrice(tokenAddress);
  } catch (err) {
    console.error('getTokenPrice failed:', err);
    return 0;
  }
}

export default { executeSwap, getTokenPrice };