import { writable, derived } from 'svelte/store';
import { simulationTradingService } from '$lib/services/SimulationTradingService.js';

// Simulation mode flag
export const isSimulationMode = writable(false);

// Current prices (fetched from price service)
export const simulationPrices = writable({});

// Portfolio data
export const simulationPortfolio = writable(null);

// Loading states
export const simulationLoading = writable(false);

/**
 * Initialize simulation mode
 */
export function initSimulation() {
	isSimulationMode.set(true);
	const portfolio = simulationTradingService.getPortfolio();
	simulationPortfolio.set(portfolio);
	console.log('🧪 Simulation mode initialized', portfolio);
}

/**
 * Exit simulation mode
 */
export function exitSimulation() {
	isSimulationMode.set(false);
	simulationPortfolio.set(null);
	console.log('🔴 Exited simulation mode');
}

/**
 * Update prices
 */
export function updateSimulationPrices(prices) {
	simulationPrices.set(prices);
}

/**
 * Buy token in simulation
 */
export async function simulationBuy(symbol, amountUSD, currentPrice) {
	simulationLoading.set(true);
	try {
		const result = simulationTradingService.buyToken(symbol, amountUSD, currentPrice);
		const portfolio = simulationTradingService.getPortfolio();
		simulationPortfolio.set(portfolio);
		return result;
	} catch (error) {
		console.error('Simulation buy failed:', error);
		throw error;
	} finally {
		simulationLoading.set(false);
	}
}

/**
 * Sell token in simulation
 */
export async function simulationSell(symbol, tokenAmount, currentPrice) {
	simulationLoading.set(true);
	try {
		const result = simulationTradingService.sellToken(symbol, tokenAmount, currentPrice);
		const portfolio = simulationTradingService.getPortfolio();
		simulationPortfolio.set(portfolio);
		return result;
	} catch (error) {
		console.error('Simulation sell failed:', error);
		throw error;
	} finally {
		simulationLoading.set(false);
	}
}

/**
 * Deposit in simulation
 */
export async function simulationDeposit(amount) {
	simulationLoading.set(true);
	try {
		const result = simulationTradingService.deposit(amount);
		const portfolio = simulationTradingService.getPortfolio();
		simulationPortfolio.set(portfolio);
		return result;
	} catch (error) {
		console.error('Simulation deposit failed:', error);
		throw error;
	} finally {
		simulationLoading.set(false);
	}
}

/**
 * Withdraw in simulation
 */
export async function simulationWithdraw(amount) {
	simulationLoading.set(true);
	try {
		const result = simulationTradingService.withdraw(amount);
		const portfolio = simulationTradingService.getPortfolio();
		simulationPortfolio.set(portfolio);
		return result;
	} catch (error) {
		console.error('Simulation withdraw failed:', error);
		throw error;
	} finally {
		simulationLoading.set(false);
	}
}

/**
 * Get portfolio summary with current prices
 */
export const simulationSummary = derived(
	[simulationPortfolio, simulationPrices],
	([$portfolio, $prices]) => {
		if (!$portfolio) return null;
		return simulationTradingService.getSummary($prices);
	}
);

/**
 * Reset simulation portfolio
 */
export function resetSimulation() {
	const portfolio = simulationTradingService.reset();
	simulationPortfolio.set(portfolio);
	console.log('🔄 Simulation portfolio reset');
}
