import { writable, derived } from 'svelte/store';
import { simulationTradingService } from '$lib/services/SimulationTradingService.js';
import { appMode } from './appMode.js';
import priceService from '$lib/priceService.js';

// Simulation mode flag
export const isSimulationMode = writable(false);

// Current prices (fetched from price service)
export const simulationPrices = writable({});

// Portfolio data (legacy - single portfolio)
export const simulationPortfolio = writable(null);

// Loading states
export const simulationLoading = writable(false);

// Price update subscription
let priceUpdateUnsubscribe = null;

// ============================================
// Multi-Portfolio Management State
// ============================================

const STORAGE_KEY = 'simulation_portfolios_state';
const INITIAL_BALANCE = 10000;

// Initialize state from localStorage or create new
function initializeState() {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			
			// Validate the structure
			if (!parsed || typeof parsed !== 'object') {
				throw new Error('Invalid state structure: not an object');
			}
			
			// Validate required fields
			if (typeof parsed.balance !== 'number' || parsed.balance < 0) {
				console.warn('Invalid balance in stored state, resetting to initial');
				parsed.balance = INITIAL_BALANCE;
			}
			
			if (!parsed.portfolios || typeof parsed.portfolios !== 'object') {
				console.warn('Invalid portfolios in stored state, resetting to empty');
				parsed.portfolios = {};
			}
			
			if (!Array.isArray(parsed.transactions)) {
				console.warn('Invalid transactions in stored state, resetting to empty');
				parsed.transactions = [];
			}
			
			// Validate each portfolio
			const validPortfolios = {};
			for (const [name, portfolio] of Object.entries(parsed.portfolios)) {
				try {
					// Check required portfolio fields
					if (!portfolio || typeof portfolio !== 'object') {
						throw new Error('Portfolio is not an object');
					}
					
					if (typeof portfolio.initialDeposit !== 'number' || portfolio.initialDeposit < 0) {
						throw new Error('Invalid initialDeposit');
					}
					
					if (typeof portfolio.currentValue !== 'number' || portfolio.currentValue < 0) {
						throw new Error('Invalid currentValue');
					}
					
					if (!portfolio.holdings || typeof portfolio.holdings !== 'object') {
						throw new Error('Invalid holdings');
					}
					
					// Validate holdings
					for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
						if (!holding || typeof holding !== 'object') {
							throw new Error(`Invalid holding for ${symbol}`);
						}
						
						if (typeof holding.amount !== 'number' || holding.amount < 0) {
							throw new Error(`Invalid amount for ${symbol}`);
						}
						
						if (typeof holding.initialPrice !== 'number' || holding.initialPrice <= 0) {
							throw new Error(`Invalid initialPrice for ${symbol}`);
						}
						
						if (typeof holding.currentPrice !== 'number' || holding.currentPrice <= 0) {
							throw new Error(`Invalid currentPrice for ${symbol}`);
						}
					}
					
					// Portfolio is valid
					validPortfolios[name] = portfolio;
				} catch (error) {
					console.error(`Failed to validate portfolio "${name}":`, error.message);
					console.warn(`Skipping corrupted portfolio: ${name}`);
				}
			}
			
			parsed.portfolios = validPortfolios;
			
			console.log('✅ Successfully loaded simulation state from localStorage');
			console.log(`   - Balance: $${parsed.balance.toFixed(2)}`);
			console.log(`   - Portfolios: ${Object.keys(parsed.portfolios).length}`);
			console.log(`   - Transactions: ${parsed.transactions.length}`);
			
			return parsed;
		} catch (error) {
			console.error('❌ Failed to parse simulation state from localStorage:', error);
			console.warn('🔄 Resetting to initial state');
			
			// Clear corrupted data
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch (e) {
				console.error('Failed to clear corrupted localStorage:', e);
			}
		}
	}
	
	console.log('🆕 Creating new simulation state');
	return {
		balance: INITIAL_BALANCE,
		portfolios: {},
		transactions: []
	};
}

// Core state store
const simulationState = writable(initializeState());

// Persist state to localStorage whenever it changes (with error handling)
simulationState.subscribe(state => {
	if (state) {
		try {
			const serialized = JSON.stringify(state);
			localStorage.setItem(STORAGE_KEY, serialized);
		} catch (error) {
			console.error('❌ Failed to persist simulation state to localStorage:', error);
			
			// Check if it's a quota exceeded error
			if (error.name === 'QuotaExceededError') {
				console.error('💾 localStorage quota exceeded. Consider clearing old data.');
			}
		}
	}
});

// Export the state store
export const simulationBalance = derived(simulationState, $state => $state.balance);
export const simulationPortfolios = derived(simulationState, $state => $state.portfolios);
export const simulationTransactions = derived(simulationState, $state => $state.transactions);

/**
 * Initialize simulation mode
 */
export function initSimulation() {
	isSimulationMode.set(true);
	appMode.set('simulation'); // Update global app mode
	const portfolio = simulationTradingService.getPortfolio();
	simulationPortfolio.set(portfolio);
	console.log('🧪 Simulation mode initialized', portfolio);
	
	// Start price updates for portfolios
	startPriceUpdates();
}

/**
 * Exit simulation mode
 */
export function exitSimulation() {
	isSimulationMode.set(false);
	appMode.set('live'); // Update global app mode back to live
	simulationPortfolio.set(null);
	
	// Stop price updates
	stopPriceUpdates();
	
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

// ============================================
// Portfolio CRUD Operations
// ============================================

/**
 * Create a new portfolio
 * @param {string} name - Portfolio name (unique identifier)
 * @param {string} description - Portfolio description
 * @param {number} depositAmount - Initial deposit amount in USD
 * @returns {Object} Created portfolio object
 */
export function createPortfolio(name, description, depositAmount) {
	let state;
	simulationState.update(current => {
		// Validate portfolio name
		if (!name || name.trim() === '') {
			throw new Error('Portfolio name is required');
		}
		
		// Check for duplicate name
		if (current.portfolios[name]) {
			throw new Error('Portfolio with this name already exists');
		}
		
		// Validate deposit amount
		if (depositAmount <= 0) {
			throw new Error('Deposit amount must be positive');
		}
		
		if (depositAmount > current.balance) {
			throw new Error('Insufficient balance');
		}
		
		// Create new portfolio
		const portfolio = {
			name,
			description: description || '',
			createdAt: Date.now(),
			initialDeposit: depositAmount,
			currentValue: depositAmount,
			holdings: {},
			profitLoss: {
				absolute: 0,
				percentage: 0
			}
		};
		
		// Deduct from balance
		const newBalance = current.balance - depositAmount;
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName: name,
			type: 'create',
			timestamp: Date.now(),
			details: {
				value: depositAmount
			}
		};
		
		state = {
			...current,
			balance: newBalance,
			portfolios: {
				...current.portfolios,
				[name]: portfolio
			},
			transactions: [...current.transactions, transaction]
		};
		
		return state;
	});
	
	console.log('✅ Portfolio created:', name);
	return state.portfolios[name];
}

/**
 * Get a portfolio by name
 * @param {string} name - Portfolio name
 * @returns {Object|null} Portfolio object or null if not found
 */
export function getPortfolio(name) {
	let portfolio = null;
	simulationState.subscribe(state => {
		portfolio = state.portfolios[name] || null;
	})();
	return portfolio;
}

/**
 * Update portfolio allocations
 * @param {string} portfolioName - Portfolio name
 * @param {Object} allocations - Token allocations { symbol: { amount, initialPrice, currentPrice, percentage } }
 */
export function updatePortfolioAllocations(portfolioName, allocations) {
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Update holdings
		portfolio.holdings = allocations;
		
		// Recalculate current value
		let totalValue = 0;
		for (const [symbol, holding] of Object.entries(allocations)) {
			totalValue += holding.amount * holding.currentPrice;
		}
		portfolio.currentValue = totalValue;
		
		// Recalculate P/L
		const profitLoss = totalValue - portfolio.initialDeposit;
		portfolio.profitLoss = {
			absolute: profitLoss,
			percentage: (profitLoss / portfolio.initialDeposit) * 100
		};
		
		return {
			...current,
			portfolios: {
				...current.portfolios,
				[portfolioName]: portfolio
			}
		};
	});
}

/**
 * Delete a portfolio
 * @param {string} name - Portfolio name
 */
export function deletePortfolio(name) {
	simulationState.update(current => {
		const portfolio = current.portfolios[name];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Return portfolio value to balance
		const newBalance = current.balance + portfolio.currentValue;
		
		// Remove portfolio
		const { [name]: removed, ...remainingPortfolios } = current.portfolios;
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName: name,
			type: 'delete',
			timestamp: Date.now(),
			details: {
				value: portfolio.currentValue
			}
		};
		
		return {
			...current,
			balance: newBalance,
			portfolios: remainingPortfolios,
			transactions: [...current.transactions, transaction]
		};
	});
	
	console.log('🗑️ Portfolio deleted:', name);
}

/**
 * Deposit funds into a portfolio
 * @param {string} portfolioName - Portfolio name
 * @param {number} amount - Amount to deposit in USD
 * @param {Object} allocations - Current token allocations for auto-distribution
 */
export function depositToPortfolio(portfolioName, amount, allocations) {
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		if (amount <= 0) {
			throw new Error('Deposit amount must be positive');
		}
		
		if (amount > current.balance) {
			throw new Error('Insufficient balance');
		}
		
		// Deduct from balance
		const newBalance = current.balance - amount;
		
		// Update portfolio
		portfolio.initialDeposit += amount;
		portfolio.currentValue += amount;
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName,
			type: 'deposit',
			timestamp: Date.now(),
			details: {
				value: amount
			}
		};
		
		return {
			...current,
			balance: newBalance,
			portfolios: {
				...current.portfolios,
				[portfolioName]: portfolio
			},
			transactions: [...current.transactions, transaction]
		};
	});
	
	console.log('💰 Deposited to portfolio:', portfolioName, amount);
}

/**
 * Withdraw funds from a portfolio
 * @param {string} portfolioName - Portfolio name
 * @param {number} amount - Amount to withdraw in USD
 */
export function withdrawFromPortfolio(portfolioName, amount) {
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		if (amount <= 0) {
			throw new Error('Withdraw amount must be positive');
		}
		
		if (amount > portfolio.currentValue) {
			throw new Error('Insufficient portfolio value');
		}
		
		// Add to balance
		const newBalance = current.balance + amount;
		
		// Update portfolio
		portfolio.currentValue -= amount;
		
		// Recalculate P/L
		const profitLoss = portfolio.currentValue - portfolio.initialDeposit;
		portfolio.profitLoss = {
			absolute: profitLoss,
			percentage: portfolio.initialDeposit > 0 ? (profitLoss / portfolio.initialDeposit) * 100 : 0
		};
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName,
			type: 'withdraw',
			timestamp: Date.now(),
			details: {
				value: amount
			}
		};
		
		return {
			...current,
			balance: newBalance,
			portfolios: {
				...current.portfolios,
				[portfolioName]: portfolio
			},
			transactions: [...current.transactions, transaction]
		};
	});
	
	console.log('💸 Withdrawn from portfolio:', portfolioName, amount);
}

/**
 * Update prices for all portfolio holdings
 * @param {Object} prices - Price map { symbol: price }
 */
export function updatePortfolioPrices(prices) {
	simulationState.update(current => {
		const updatedPortfolios = {};
		
		for (const [name, portfolio] of Object.entries(current.portfolios)) {
			const updatedHoldings = {};
			let totalValue = 0;
			
			for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
				const currentPrice = prices[symbol] || holding.currentPrice;
				updatedHoldings[symbol] = {
					...holding,
					currentPrice
				};
				totalValue += holding.amount * currentPrice;
			}
			
			// Update portfolio
			const profitLoss = totalValue - portfolio.initialDeposit;
			updatedPortfolios[name] = {
				...portfolio,
				holdings: updatedHoldings,
				currentValue: totalValue,
				profitLoss: {
					absolute: profitLoss,
					percentage: portfolio.initialDeposit > 0 ? (profitLoss / portfolio.initialDeposit) * 100 : 0
				}
			};
		}
		
		return {
			...current,
			portfolios: updatedPortfolios
		};
	});
}

/**
 * Reset all simulation data
 */
export function resetAllSimulation() {
	simulationState.set({
		balance: INITIAL_BALANCE,
		portfolios: {},
		transactions: []
	});
	localStorage.removeItem(STORAGE_KEY);
	console.log('🔄 All simulation data reset');
}

// ============================================
// Price Update Mechanism
// ============================================

/**
 * Start periodic price updates for portfolio holdings
 * Subscribes to price service updates and recalculates portfolio values
 */
export function startPriceUpdates() {
	// Stop any existing subscription
	stopPriceUpdates();
	
	console.log('📊 Starting price updates for simulation portfolios...');
	
	// Subscribe to price service global prices store
	priceUpdateUnsubscribe = priceService.globalStorage.pricesStore.subscribe((allPrices) => {
		// Only update if we have prices and portfolios
		if (!allPrices || Object.keys(allPrices).length === 0) {
			return;
		}
		
		// Get current portfolios
		let currentState;
		const unsubscribe = simulationState.subscribe(state => {
			currentState = state;
		});
		unsubscribe();
		
		// Only update if we have portfolios
		if (!currentState || !currentState.portfolios || Object.keys(currentState.portfolios).length === 0) {
			return;
		}
		
		// Convert address-based prices to symbol-based prices
		const pricesBySymbol = {};
		for (const [address, priceData] of Object.entries(allPrices)) {
			if (priceData && priceData.symbol && priceData.price) {
				pricesBySymbol[priceData.symbol] = priceData.price;
			}
		}
		
		// Update portfolio prices
		if (Object.keys(pricesBySymbol).length > 0) {
			updatePortfolioPrices(pricesBySymbol);
			console.log(`📈 Updated prices for ${Object.keys(currentState.portfolios).length} portfolio(s)`);
		}
	});
	
	console.log('✅ Price updates started');
}

/**
 * Stop periodic price updates
 */
export function stopPriceUpdates() {
	if (priceUpdateUnsubscribe) {
		priceUpdateUnsubscribe();
		priceUpdateUnsubscribe = null;
		console.log('🛑 Price updates stopped');
	}
}

/**
 * Manually trigger a price update for all portfolios
 * Useful for forcing an immediate refresh
 */
export async function refreshPortfolioPrices() {
	try {
		console.log('🔄 Manually refreshing portfolio prices...');
		
		// Ensure price service is initialized
		if (!priceService.isInitialized) {
			await priceService.initialize();
		}
		
		// Trigger a price refresh from the backend
		await priceService.refreshAllPrices();
		
		// Get updated prices
		const allPrices = priceService.globalStorage.getAllPrices();
		
		// Convert to symbol-based map
		const pricesBySymbol = {};
		for (const [address, priceData] of Object.entries(allPrices)) {
			if (priceData && priceData.symbol && priceData.price) {
				pricesBySymbol[priceData.symbol] = priceData.price;
			}
		}
		
		// Update portfolios
		if (Object.keys(pricesBySymbol).length > 0) {
			updatePortfolioPrices(pricesBySymbol);
			console.log('✅ Portfolio prices refreshed successfully');
		}
		
		return true;
	} catch (error) {
		console.error('❌ Failed to refresh portfolio prices:', error);
		throw error;
	}
}

// ============================================
// Derived Stores for Portfolio Calculations
// ============================================

/**
 * Total value across all portfolios
 */
export const totalPortfolioValue = derived(simulationState, $state => {
	let total = 0;
	for (const portfolio of Object.values($state.portfolios)) {
		total += portfolio.currentValue;
	}
	return total;
});

/**
 * Total system value (balance + all portfolios)
 */
export const totalSystemValue = derived(simulationState, $state => {
	let total = $state.balance;
	for (const portfolio of Object.values($state.portfolios)) {
		total += portfolio.currentValue;
	}
	return total;
});

/**
 * Overall profit/loss across all portfolios
 */
export const overallProfitLoss = derived(simulationState, $state => {
	let totalInitialDeposit = 0;
	let totalCurrentValue = 0;
	
	for (const portfolio of Object.values($state.portfolios)) {
		totalInitialDeposit += portfolio.initialDeposit;
		totalCurrentValue += portfolio.currentValue;
	}
	
	const profitLoss = totalCurrentValue - totalInitialDeposit;
	const percentage = totalInitialDeposit > 0 ? (profitLoss / totalInitialDeposit) * 100 : 0;
	
	return {
		absolute: profitLoss,
		percentage,
		totalInitialDeposit,
		totalCurrentValue
	};
});

/**
 * Portfolio count
 */
export const portfolioCount = derived(simulationState, $state => {
	return Object.keys($state.portfolios).length;
});
