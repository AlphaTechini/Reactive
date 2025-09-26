// Lightweight, safe Uniswap helper that delegates swaps to the on-chain EnhancedPortfolioManager
// Frontend must never perform direct off-chain swaps — all swaps go through the secure on-chain contract.
import { secureContractService } from './secureContractService.js';

/**
 * Execute a swap by calling the on-chain contract's executeSwap method.
 * tokenInAddress, tokenOutAddress: token contract addresses
 * amountIn: amount in tokenIn units (as a string or number)
 * slippagePercent: allowed slippage percentage (default 1)
 */
export async function executeSwap(tokenInAddress, tokenOutAddress, amountIn, slippagePercent = 1) {
	try {
		// ensure service initialized
		await secureContractService.initialize();
		// Convert amount based on tokenIn decimals if available
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

/**
 * Read-only helper to fetch price for a token from contract (returns number)
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

export default {
	executeSwap,
	getTokenPrice
};
