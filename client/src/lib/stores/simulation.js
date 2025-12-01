import { writable, derived } from 'svelte/store';
import { simulationTradingService } from '$lib/services/SimulationTradingService.js';
import { appMode } from './appMode.js';
import priceService from '$lib/priceService.js';

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate that a number is positive and finite
 * @param {number} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validatePositiveNumber(value, fieldName) {
	if (typeof value !== 'number') {
		throw new Error(`${fieldName} must be a number`);
	}
	
	if (!isFinite(value)) {
		throw new Error(`${fieldName} must be a finite number`);
	}
	
	if (isNaN(value)) {
		throw new Error(`${fieldName} cannot be NaN`);
	}
	
	if (value <= 0) {
		throw new Error(`${fieldName} must be positive`);
	}
	
	return true;
}

/**
 * Validate that a number is non-negative and finite
 * @param {number} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateNonNegativeNumber(value, fieldName) {
	if (typeof value !== 'number') {
		throw new Error(`${fieldName} must be a number`);
	}
	
	if (!isFinite(value)) {
		throw new Error(`${fieldName} must be a finite number`);
	}
	
	if (isNaN(value)) {
		throw new Error(`${fieldName} cannot be NaN`);
	}
	
	if (value < 0) {
		throw new Error(`${fieldName} cannot be negative`);
	}
	
	return true;
}

/**
 * Validate token price
 * @param {number} price - Price to validate
 * @param {string} symbol - Token symbol for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateTokenPrice(price, symbol) {
	if (price === null || price === undefined) {
		throw new Error(`Price for ${symbol} is not available. Please wait for price data to load.`);
	}
	
	try {
		validatePositiveNumber(price, `Price for ${symbol}`);
	} catch (error) {
		throw new Error(`Invalid price for ${symbol}: ${error.message}`);
	}
	
	// Additional check for unreasonably small prices (likely data error)
	if (price < 0.00000001) {
		throw new Error(`Price for ${symbol} is too small (${price}). This may indicate a data error.`);
	}
	
	return true;
}

/**
 * Validate percentage value (0-100)
 * @param {number} percentage - Percentage to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validatePercentage(percentage, fieldName) {
	if (typeof percentage !== 'number') {
		throw new Error(`${fieldName} must be a number`);
	}
	
	if (!isFinite(percentage)) {
		throw new Error(`${fieldName} must be a finite number`);
	}
	
	if (isNaN(percentage)) {
		throw new Error(`${fieldName} cannot be NaN`);
	}
	
	if (percentage < 0 || percentage > 100) {
		throw new Error(`${fieldName} must be between 0 and 100 (got ${percentage})`);
	}
	
	return true;
}

/**
 * Safely calculate profit/loss percentage with division by zero protection
 * @param {number} currentValue - Current portfolio value
 * @param {number} initialDeposit - Initial deposit amount
 * @returns {Object} { absolute: number, percentage: number }
 */
function safeCalculateProfitLoss(currentValue, initialDeposit) {
	// Validate inputs
	try {
		validateNonNegativeNumber(currentValue, 'Current value');
		validateNonNegativeNumber(initialDeposit, 'Initial deposit');
	} catch (error) {
		console.error('❌ P/L calculation validation failed:', error.message);
		// Return safe defaults
		return {
			absolute: 0,
			percentage: 0
		};
	}
	
	const absolute = currentValue - initialDeposit;
	
	// Protect against division by zero
	let percentage = 0;
	if (initialDeposit > 0) {
		percentage = (absolute / initialDeposit) * 100;
		
		// Validate result
		if (!isFinite(percentage) || isNaN(percentage)) {
			console.warn('⚠️ P/L percentage calculation resulted in invalid value, defaulting to 0');
			percentage = 0;
		}
	} else {
		console.warn('⚠️ Initial deposit is zero, cannot calculate P/L percentage');
	}
	
	return {
		absolute,
		percentage
	};
}

/**
 * Safely calculate token quantity with validation
 * @param {number} usdAmount - USD amount to spend
 * @param {number} tokenPrice - Token price
 * @param {string} symbol - Token symbol for error messages
 * @returns {number} Token quantity
 * @throws {Error} If validation fails
 */
function safeCalculateTokenQuantity(usdAmount, tokenPrice, symbol) {
	// Validate USD amount
	validatePositiveNumber(usdAmount, 'USD amount');
	
	// Validate token price
	validateTokenPrice(tokenPrice, symbol);
	
	// Calculate quantity
	const quantity = usdAmount / tokenPrice;
	
	// Validate result
	if (!isFinite(quantity) || isNaN(quantity) || quantity <= 0) {
		throw new Error(`Failed to calculate token quantity for ${symbol}. Result: ${quantity}`);
	}
	
	return quantity;
}

/**
 * Validate portfolio settings
 * @param {Object} settings - Settings object to validate
 * @throws {Error} If validation fails
 */
function validatePortfolioSettings(settings) {
	if (!settings || typeof settings !== 'object') {
		throw new Error('Settings must be an object');
	}
	
	// Validate percentage fields if present
	const percentageFields = ['sellPercent', 'buyPercent', 'stopLossPercent'];
	for (const field of percentageFields) {
		if (settings[field] !== undefined && settings[field] !== null) {
			try {
				validatePercentage(settings[field], field);
			} catch (error) {
				throw new Error(`Invalid ${field}: ${error.message}`);
			}
		}
	}
	
	// Validate token settings if present
	if (settings.tokenSettings && typeof settings.tokenSettings === 'object') {
		for (const [symbol, tokenSettings] of Object.entries(settings.tokenSettings)) {
			if (tokenSettings.targetPercentage !== undefined) {
				try {
					validatePercentage(tokenSettings.targetPercentage, `Target percentage for ${symbol}`);
				} catch (error) {
					throw new Error(`Invalid token settings for ${symbol}: ${error.message}`);
				}
			}
			
			if (tokenSettings.sellPercent !== undefined) {
				try {
					validatePercentage(tokenSettings.sellPercent, `Sell percent for ${symbol}`);
				} catch (error) {
					throw new Error(`Invalid token settings for ${symbol}: ${error.message}`);
				}
			}
			
			if (tokenSettings.buyPercent !== undefined) {
				try {
					validatePercentage(tokenSettings.buyPercent, `Buy percent for ${symbol}`);
				} catch (error) {
					throw new Error(`Invalid token settings for ${symbol}: ${error.message}`);
				}
			}
			
			if (tokenSettings.stopLossPercent !== undefined) {
				try {
					validatePercentage(tokenSettings.stopLossPercent, `Stop-loss percent for ${symbol}`);
				} catch (error) {
					throw new Error(`Invalid token settings for ${symbol}: ${error.message}`);
				}
			}
		}
	}
	
	return true;
}

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

/**
 * Migrate portfolio to include per-token settings structure
 * @param {Object} portfolio - Portfolio object to migrate
 * @returns {Object} Migrated portfolio with migration log
 */
function migratePortfolioSettings(portfolio) {
	const migrationLog = {
		portfolioName: portfolio.name,
		migrated: false,
		changes: []
	};
	
	// Check if settings object exists
	if (!portfolio.settings) {
		console.log(`🔄 Migrating portfolio "${portfolio.name}": Creating settings structure`);
		portfolio.settings = {
			allocations: {},
			tokenSettings: {},
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			autoBalanceEnabled: false
		};
		migrationLog.migrated = true;
		migrationLog.changes.push('Created settings structure with defaults');
	}
	
	// Ensure allocations object exists
	if (!portfolio.settings.allocations) {
		portfolio.settings.allocations = {};
		migrationLog.changes.push('Added allocations object');
	}
	
	// Check if tokenSettings needs to be added
	if (!portfolio.settings.tokenSettings) {
		console.log(`🔄 Migrating portfolio "${portfolio.name}" to per-token settings structure`);
		
		// Initialize tokenSettings object
		portfolio.settings.tokenSettings = {};
		migrationLog.migrated = true;
		migrationLog.changes.push('Added tokenSettings structure');
		
		// If portfolio has holdings, migrate global settings to per-token settings
		if (portfolio.holdings && Object.keys(portfolio.holdings).length > 0) {
			const tokenCount = Object.keys(portfolio.holdings).length;
			console.log(`   📦 Migrating ${tokenCount} token(s) to per-token settings...`);
			
			for (const symbol of Object.keys(portfolio.holdings)) {
				const holding = portfolio.holdings[symbol];
				
				// Ensure holding has lastActionPrice
				if (!holding.lastActionPrice) {
					holding.lastActionPrice = holding.currentPrice || holding.initialPrice;
					migrationLog.changes.push(`Set lastActionPrice for ${symbol}`);
				}
				
				// Create per-token settings from global settings
				portfolio.settings.tokenSettings[symbol] = {
					targetPercentage: holding.percentage || 0,
					sellPercent: portfolio.settings.sellPercent || 10,
					buyPercent: portfolio.settings.buyPercent || 5,
					stopLossPercent: portfolio.settings.stopLossPercent || 15,
					lastPrice: holding.currentPrice || holding.initialPrice,
					enabled: true
				};
				
				console.log(`   ✅ ${symbol}: target=${holding.percentage?.toFixed(2) || 0}%, sell=${portfolio.settings.sellPercent}%, buy=${portfolio.settings.buyPercent}%, stopLoss=${portfolio.settings.stopLossPercent}%`);
			}
			
			migrationLog.changes.push(`Migrated ${tokenCount} token(s) to per-token settings`);
			console.log(`   ✅ Successfully migrated ${tokenCount} token(s)`);
		} else {
			console.log(`   ℹ️ No holdings to migrate`);
		}
	} else {
		// tokenSettings exists, but check if holdings have lastActionPrice
		if (portfolio.holdings && Object.keys(portfolio.holdings).length > 0) {
			for (const symbol of Object.keys(portfolio.holdings)) {
				const holding = portfolio.holdings[symbol];
				
				// Ensure holding has lastActionPrice
				if (!holding.lastActionPrice) {
					holding.lastActionPrice = holding.currentPrice || holding.initialPrice;
					migrationLog.migrated = true;
					migrationLog.changes.push(`Set lastActionPrice for ${symbol}`);
				}
				
				// Ensure token has settings entry
				if (!portfolio.settings.tokenSettings[symbol]) {
					portfolio.settings.tokenSettings[symbol] = {
						targetPercentage: holding.percentage || 0,
						sellPercent: portfolio.settings.sellPercent || 10,
						buyPercent: portfolio.settings.buyPercent || 5,
						stopLossPercent: portfolio.settings.stopLossPercent || 15,
						lastPrice: holding.currentPrice || holding.initialPrice,
						enabled: true
					};
					migrationLog.migrated = true;
					migrationLog.changes.push(`Added missing tokenSettings for ${symbol}`);
				}
			}
		}
	}
	
	// Ensure default global settings exist (for backward compatibility)
	if (portfolio.settings.sellPercent === undefined) {
		portfolio.settings.sellPercent = 10;
		migrationLog.changes.push('Set default sellPercent');
	}
	if (portfolio.settings.buyPercent === undefined) {
		portfolio.settings.buyPercent = 5;
		migrationLog.changes.push('Set default buyPercent');
	}
	if (portfolio.settings.stopLossPercent === undefined) {
		portfolio.settings.stopLossPercent = 15;
		migrationLog.changes.push('Set default stopLossPercent');
	}
	if (portfolio.settings.autoBalanceEnabled === undefined) {
		portfolio.settings.autoBalanceEnabled = false;
		migrationLog.changes.push('Set default autoBalanceEnabled');
	}
	
	// Log migration summary if any changes were made
	if (migrationLog.migrated && migrationLog.changes.length > 0) {
		console.log(`📋 Migration summary for "${portfolio.name}":`);
		migrationLog.changes.forEach(change => console.log(`   - ${change}`));
	}
	
	return portfolio;
}

// Initialize state from localStorage or create new
function initializeState() {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return {
			balance: INITIAL_BALANCE,
			portfolios: {},
			transactions: []
		};
	}
	
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
			let migratedCount = 0;
			
			console.log(`🔍 Validating ${Object.keys(parsed.portfolios).length} portfolio(s)...`);
			
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
					
					// Migrate portfolio to per-token settings if needed
					const needsMigration = !portfolio.settings || !portfolio.settings.tokenSettings;
					const migratedPortfolio = migratePortfolioSettings(portfolio);
					
					if (needsMigration) {
						migratedCount++;
					}
					
					// Portfolio is valid
					validPortfolios[name] = migratedPortfolio;
				} catch (error) {
					console.error(`❌ Failed to validate portfolio "${name}":`, error.message);
					console.warn(`⚠️ Skipping corrupted portfolio: ${name}`);
				}
			}
			
			parsed.portfolios = validPortfolios;
			
			// Log migration results
			if (migratedCount > 0) {
				console.log(`✅ Migration complete: ${migratedCount} portfolio(s) migrated to per-token settings structure`);
			}
			
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
	// Only persist in browser environment
	if (typeof window === 'undefined') {
		return;
	}
	
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
		
		// Validate deposit amount
		try {
			validatePositiveNumber(depositAmount, 'Deposit amount');
		} catch (error) {
			throw new Error(`Invalid deposit amount: ${error.message}`);
		}
		
		// Create new portfolio
		const portfolio = {
			name,
			description: description || '',
			createdAt: Date.now(),
			initialDeposit: depositAmount,
			currentValue: depositAmount,
			holdings: {},
			settings: {
				allocations: {}, // Token percentage allocations
				tokenSettings: {}, // Per-token settings (NEW)
				sellPercent: 10, // Global default (legacy)
				buyPercent: 5, // Global default (legacy)
				stopLossPercent: 15, // Global default (legacy)
				autoBalanceEnabled: false
			},
			profitLoss: safeCalculateProfitLoss(depositAmount, depositAmount) // Will be { absolute: 0, percentage: 0 }
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
	
	// Migrate portfolio if needed
	if (portfolio) {
		portfolio = migratePortfolioSettings(portfolio);
	}
	
	return portfolio;
}

/**
 * Update portfolio allocations
 * @param {string} portfolioName - Portfolio name
 * @param {Object} allocations - Token allocations with percentages { symbol: { percentage, currentPrice } }
 *                               OR with amounts { symbol: { amount, initialPrice, currentPrice, percentage } }
 */
export function updatePortfolioAllocations(portfolioName, allocations) {
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Process allocations and calculate token quantities if needed
		const processedHoldings = {};
		
		for (const [symbol, allocation] of Object.entries(allocations)) {
			try {
				// Check if amount is already provided (from buy/sell operations)
				if (allocation.amount !== undefined && allocation.amount !== null) {
					// Validate amount
					validateNonNegativeNumber(allocation.amount, `Token amount for ${symbol}`);
					
					// Validate prices
					validateTokenPrice(allocation.currentPrice, symbol);
					
					// Amount already calculated, just use it
					processedHoldings[symbol] = {
						amount: allocation.amount,
						initialPrice: allocation.initialPrice || allocation.currentPrice,
						currentPrice: allocation.currentPrice,
						percentage: allocation.percentage || 0,
						lastActionPrice: allocation.lastActionPrice || allocation.currentPrice // Initialize lastActionPrice
					};
				} else if (allocation.percentage !== undefined && allocation.currentPrice) {
					// Validate percentage
					validatePercentage(allocation.percentage, `Allocation percentage for ${symbol}`);
					
					// Validate price
					validateTokenPrice(allocation.currentPrice, symbol);
					
					// Calculate token quantity from percentage allocation
					// Formula: tokenQuantity = (portfolioValue × percentage / 100) / tokenPrice
					const portfolioValue = portfolio.currentValue;
					const allocatedUSD = (portfolioValue * allocation.percentage) / 100;
					const tokenQuantity = safeCalculateTokenQuantity(allocatedUSD, allocation.currentPrice, symbol);
					
					processedHoldings[symbol] = {
						amount: tokenQuantity,
						initialPrice: allocation.currentPrice, // Use current price as initial for new allocations
						currentPrice: allocation.currentPrice,
						percentage: allocation.percentage,
						lastActionPrice: allocation.currentPrice // Initialize lastActionPrice to current price
					};
				} else {
					console.warn(`Invalid allocation for ${symbol}, skipping`);
					continue;
				}
			} catch (error) {
				console.error(`❌ Failed to process allocation for ${symbol}:`, error.message);
				// Skip this token and continue with others
				continue;
			}
		}
		
		// Update holdings
		portfolio.holdings = processedHoldings;
		
		// Recalculate current value from holdings
		let totalValue = 0;
		for (const [symbol, holding] of Object.entries(processedHoldings)) {
			totalValue += holding.amount * holding.currentPrice;
		}
		
		// IMPORTANT: Only update currentValue if we have holdings
		// If holdings are empty, keep the initial deposit as current value
		if (Object.keys(processedHoldings).length > 0) {
			portfolio.currentValue = totalValue;
		} else {
			// Keep the initial deposit as current value when no holdings
			portfolio.currentValue = portfolio.initialDeposit;
		}
		
		// Recalculate P/L with safe calculation
		portfolio.profitLoss = safeCalculateProfitLoss(portfolio.currentValue, portfolio.initialDeposit);
		
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
 * Update portfolio settings
 * @param {string} portfolioName - Portfolio name
 * @param {Object} settings - Settings object
 *   Can include:
 *   - allocations: Token percentage allocations
 *   - tokenSettings: Per-token settings { symbol: { targetPercentage, sellPercent, buyPercent, stopLossPercent, lastPrice, enabled } }
 *   - sellPercent, buyPercent, stopLossPercent: Global defaults (legacy)
 *   - autoBalanceEnabled: Auto-balance toggle
 */
export function updatePortfolioSettings(portfolioName, settings) {
	// Validate settings before applying
	try {
		validatePortfolioSettings(settings);
	} catch (error) {
		throw new Error(`Invalid portfolio settings: ${error.message}`);
	}
	
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Ensure portfolio has tokenSettings structure
		if (!portfolio.settings.tokenSettings) {
			portfolio.settings.tokenSettings = {};
		}
		
		// Handle per-token settings update
		if (settings.tokenSettings) {
			// Merge per-token settings
			portfolio.settings.tokenSettings = {
				...portfolio.settings.tokenSettings,
				...settings.tokenSettings
			};
		}
		
		// Update other settings (preserving tokenSettings)
		const { tokenSettings, ...otherSettings } = settings;
		portfolio.settings = {
			...portfolio.settings,
			...otherSettings,
			tokenSettings: portfolio.settings.tokenSettings, // Preserve merged tokenSettings
			updatedAt: Date.now()
		};
		
		return {
			...current,
			portfolios: {
				...current.portfolios,
				[portfolioName]: portfolio
			}
		};
	});
	
	console.log('⚙️ Portfolio settings updated:', portfolioName);
}

/**
 * Update settings for a specific token in a portfolio
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {Object} tokenSettings - Token-specific settings { targetPercentage, sellPercent, buyPercent, stopLossPercent, lastPrice, enabled }
 */
export function updateTokenSettings(portfolioName, symbol, tokenSettings) {
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Ensure portfolio has tokenSettings structure
		if (!portfolio.settings.tokenSettings) {
			portfolio.settings.tokenSettings = {};
		}
		
		// Update or create token settings
		portfolio.settings.tokenSettings[symbol] = {
			...portfolio.settings.tokenSettings[symbol],
			...tokenSettings
		};
		
		portfolio.settings.updatedAt = Date.now();
		
		return {
			...current,
			portfolios: {
				...current.portfolios,
				[portfolioName]: portfolio
			}
		};
	});
	
	console.log(`⚙️ Token settings updated for ${symbol} in portfolio:`, portfolioName);
}

/**
 * Get settings for a specific token in a portfolio
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object|null} Token settings or null if not found
 */
export function getTokenSettings(portfolioName, symbol) {
	let tokenSettings = null;
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (portfolio && portfolio.settings && portfolio.settings.tokenSettings) {
			tokenSettings = portfolio.settings.tokenSettings[symbol] || null;
		}
	})();
	return tokenSettings;
}

/**
 * Get all token settings for a portfolio
 * @param {string} portfolioName - Portfolio name
 * @returns {Object} Token settings map { symbol: settings }
 */
export function getAllTokenSettings(portfolioName) {
	let tokenSettings = {};
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (portfolio && portfolio.settings && portfolio.settings.tokenSettings) {
			tokenSettings = portfolio.settings.tokenSettings;
		}
	})();
	return tokenSettings;
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
 * Buy tokens for a portfolio
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} usdAmount - USD amount to spend
 * @param {number} currentPrice - Current token price
 * @returns {Object} Result with success status and details
 */
export function buyTokenForPortfolio(portfolioName, symbol, usdAmount, currentPrice) {
	let result;
	
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Validate USD amount
		try {
			validatePositiveNumber(usdAmount, 'Buy amount');
		} catch (error) {
			throw new Error(`Invalid buy amount: ${error.message}`);
		}
		
		if (usdAmount > current.balance) {
			throw new Error(`Insufficient balance. Available: $${current.balance.toFixed(2)}, Required: $${usdAmount.toFixed(2)}`);
		}
		
		// Validate token price
		try {
			validateTokenPrice(currentPrice, symbol);
		} catch (error) {
			throw error;
		}
		
		// Calculate token amount with safe calculation
		const tokenAmount = safeCalculateTokenQuantity(usdAmount, currentPrice, symbol);
		
		// Update or create holding
		const holdings = { ...portfolio.holdings };
		if (holdings[symbol]) {
			// Add to existing holding
			holdings[symbol] = {
				...holdings[symbol],
				amount: holdings[symbol].amount + tokenAmount,
				currentPrice: currentPrice,
				lastActionPrice: currentPrice // Update lastActionPrice on buy
				// Keep original initialPrice
			};
		} else {
			// Create new holding
			holdings[symbol] = {
				amount: tokenAmount,
				initialPrice: currentPrice,
				currentPrice: currentPrice,
				percentage: 0, // Will be recalculated
				lastActionPrice: currentPrice // Initialize lastActionPrice
			};
		}
		
		// Recalculate portfolio value
		let totalValue = 0;
		for (const [sym, holding] of Object.entries(holdings)) {
			totalValue += holding.amount * holding.currentPrice;
		}
		
		// Recalculate percentages
		for (const [sym, holding] of Object.entries(holdings)) {
			const holdingValue = holding.amount * holding.currentPrice;
			holdings[sym].percentage = totalValue > 0 ? (holdingValue / totalValue) * 100 : 0;
		}
		
		// Update portfolio
		const updatedPortfolio = {
			...portfolio,
			holdings,
			currentValue: totalValue,
			profitLoss: safeCalculateProfitLoss(totalValue, portfolio.initialDeposit)
		};
		
		// Deduct from balance
		const newBalance = current.balance - usdAmount;
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName,
			type: 'buy',
			timestamp: Date.now(),
			details: {
				symbol,
				tokenAmount,
				usdAmount,
				price: currentPrice
			}
		};
		
		result = {
			success: true,
			tokenAmount,
			newBalance,
			portfolioValue: totalValue
		};
		
		return {
			...current,
			balance: newBalance,
			portfolios: {
				...current.portfolios,
				[portfolioName]: updatedPortfolio
			},
			transactions: [...current.transactions, transaction]
		};
	});
	
	console.log('📈 Bought tokens for portfolio:', portfolioName, symbol, result.tokenAmount);
	return result;
}

/**
 * Sell tokens from a portfolio
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} tokenAmount - Amount of tokens to sell
 * @param {number} currentPrice - Current token price
 * @returns {Object} Result with success status and details
 */
export function sellTokenFromPortfolio(portfolioName, symbol, tokenAmount, currentPrice) {
	let result;
	
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		const holding = portfolio.holdings[symbol];
		if (!holding) {
			throw new Error(`No ${symbol} holdings in portfolio`);
		}
		
		// Validate token amount
		try {
			validatePositiveNumber(tokenAmount, 'Sell amount');
		} catch (error) {
			throw new Error(`Invalid sell amount: ${error.message}`);
		}
		
		if (tokenAmount > holding.amount) {
			throw new Error(`Insufficient ${symbol} tokens. Available: ${holding.amount.toFixed(6)}, Requested: ${tokenAmount.toFixed(6)}`);
		}
		
		// Validate token price
		try {
			validateTokenPrice(currentPrice, symbol);
		} catch (error) {
			throw error;
		}
		
		// Calculate USD amount received
		const usdAmount = tokenAmount * currentPrice;
		
		// Calculate profit/loss for this sale
		const avgCost = (tokenAmount / holding.amount) * (holding.amount * holding.initialPrice);
		const profitLoss = usdAmount - avgCost;
		
		// Update holdings
		const holdings = { ...portfolio.holdings };
		const remainingAmount = holding.amount - tokenAmount;
		
		if (remainingAmount < 0.000001) {
			// Remove holding if amount is essentially zero
			delete holdings[symbol];
		} else {
			// Update holding with remaining amount
			holdings[symbol] = {
				...holding,
				amount: remainingAmount,
				currentPrice: currentPrice,
				lastActionPrice: currentPrice // Update lastActionPrice on sell
				// Keep original initialPrice
			};
		}
		
		// Recalculate portfolio value
		let totalValue = 0;
		for (const [sym, hld] of Object.entries(holdings)) {
			totalValue += hld.amount * hld.currentPrice;
		}
		
		// Recalculate percentages
		for (const [sym, hld] of Object.entries(holdings)) {
			const holdingValue = hld.amount * hld.currentPrice;
			holdings[sym].percentage = totalValue > 0 ? (holdingValue / totalValue) * 100 : 0;
		}
		
		// Update portfolio
		const updatedPortfolio = {
			...portfolio,
			holdings,
			currentValue: totalValue,
			profitLoss: safeCalculateProfitLoss(totalValue, portfolio.initialDeposit)
		};
		
		// Add to balance
		const newBalance = current.balance + usdAmount;
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName,
			type: 'sell',
			timestamp: Date.now(),
			details: {
				symbol,
				tokenAmount,
				usdAmount,
				price: currentPrice,
				profitLoss
			}
		};
		
		result = {
			success: true,
			usdAmount,
			profitLoss,
			newBalance,
			portfolioValue: totalValue
		};
		
		return {
			...current,
			balance: newBalance,
			portfolios: {
				...current.portfolios,
				[portfolioName]: updatedPortfolio
			},
			transactions: [...current.transactions, transaction]
		};
	});
	
	console.log('📉 Sold tokens from portfolio:', portfolioName, symbol, result.usdAmount);
	return result;
}

/**
 * Deposit funds into a portfolio
 * Distributes deposit based on current token percentages
 * @param {string} portfolioName - Portfolio name
 * @param {number} amount - Amount to deposit in USD
 * @returns {Object} Result with success status and details
 */
export function depositToPortfolio(portfolioName, amount) {
	let result;
	
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		// Validate deposit amount
		try {
			validatePositiveNumber(amount, 'Deposit amount');
		} catch (error) {
			throw new Error(`Invalid deposit amount: ${error.message}`);
		}
		
		if (amount > current.balance) {
			throw new Error(`Insufficient balance. Available: $${current.balance.toFixed(2)}, Required: $${amount.toFixed(2)}`);
		}
		
		// Check if portfolio has holdings
		if (!portfolio.holdings || Object.keys(portfolio.holdings).length === 0) {
			throw new Error('Portfolio has no holdings. Please configure portfolio first.');
		}
		
		// Calculate current percentages based on current values
		const totalValue = portfolio.currentValue;
		const currentPercentages = {};
		
		for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
			const holdingValue = holding.amount * holding.currentPrice;
			currentPercentages[symbol] = (holdingValue / totalValue) * 100;
		}
		
		console.log('📊 Current percentages for deposit distribution:', currentPercentages);
		
		// Calculate token amounts to buy with the deposit
		const updatedHoldings = {};
		const purchaseDetails = {};
		
		for (const [symbol, percentage] of Object.entries(currentPercentages)) {
			try {
				const holding = portfolio.holdings[symbol];
				const currentPrice = holding.currentPrice;
				
				// Validate token price
				validateTokenPrice(currentPrice, symbol);
				
				// Calculate USD amount for this token: (deposit × percentage) / 100
				const usdValue = (amount * percentage) / 100;
				
				// Calculate token amount to buy with safe calculation
				const tokenAmount = safeCalculateTokenQuantity(usdValue, currentPrice, symbol);
			
				// Update holding with new amount
				updatedHoldings[symbol] = {
					amount: holding.amount + tokenAmount,
					initialPrice: holding.initialPrice, // Keep original initial price
					currentPrice: currentPrice,
					percentage: percentage, // Keep same percentage
					lastActionPrice: holding.lastActionPrice || holding.initialPrice
				};
				
				purchaseDetails[symbol] = {
					tokenAmount,
					usdValue,
					price: currentPrice
				};
			} catch (error) {
				console.error(`❌ Failed to process deposit for ${symbol}:`, error.message);
				throw new Error(`Failed to distribute deposit to ${symbol}: ${error.message}`);
			}
		}
		
		// Recalculate portfolio value from updated holdings
		let newTotalValue = 0;
		for (const [symbol, holding] of Object.entries(updatedHoldings)) {
			newTotalValue += holding.amount * holding.currentPrice;
		}
		
		// Update portfolio
		portfolio.holdings = updatedHoldings;
		portfolio.currentValue = newTotalValue;
		
		// Recalculate P/L based on original initialDeposit with safe calculation
		// IMPORTANT: initialDeposit remains unchanged
		portfolio.profitLoss = safeCalculateProfitLoss(portfolio.currentValue, portfolio.initialDeposit);
		
		// Deduct from balance
		const newBalance = current.balance - amount;
		
		// Add transaction
		const transaction = {
			id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			portfolioName,
			type: 'deposit',
			timestamp: Date.now(),
			details: {
				value: amount,
				distribution: purchaseDetails
			}
		};
		
		result = {
			success: true,
			amount,
			newBalance,
			portfolioValue: newTotalValue,
			distribution: purchaseDetails
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
	console.log('📊 Distribution:', result.distribution);
	return result;
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
		
		// Validate withdraw amount
		try {
			validatePositiveNumber(amount, 'Withdraw amount');
		} catch (error) {
			throw new Error(`Invalid withdraw amount: ${error.message}`);
		}
		
		if (amount > portfolio.currentValue) {
			throw new Error(`Insufficient portfolio value. Available: $${portfolio.currentValue.toFixed(2)}, Requested: $${amount.toFixed(2)}`);
		}
		
		// Add to balance
		const newBalance = current.balance + amount;
		
		// Update portfolio
		portfolio.currentValue -= amount;
		
		// Recalculate P/L with safe calculation
		portfolio.profitLoss = safeCalculateProfitLoss(portfolio.currentValue, portfolio.initialDeposit);
		
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
			try {
				const updatedHoldings = {};
				let totalValue = 0;
				
				for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
					// Get new price or keep current price
					const newPrice = prices[symbol];
					let currentPrice = holding.currentPrice;
					
					// Only update if we have a valid new price
					if (newPrice !== undefined && newPrice !== null) {
						try {
							validateTokenPrice(newPrice, symbol);
							currentPrice = newPrice;
						} catch (error) {
							console.warn(`⚠️ Invalid price update for ${symbol} in ${name}:`, error.message);
							// Keep existing price
						}
					}
					
					updatedHoldings[symbol] = {
						...holding,
						currentPrice,
						// Preserve lastActionPrice - it should only change on actual actions
						lastActionPrice: holding.lastActionPrice || holding.initialPrice
					};
					totalValue += holding.amount * currentPrice;
				}
				
				// IMPORTANT: Only update currentValue if we have holdings
				// If holdings are empty, keep the current value (which should be initialDeposit for new portfolios)
				const currentValue = Object.keys(updatedHoldings).length > 0 ? totalValue : portfolio.currentValue;
				
				// Update portfolio with safe P/L calculation
				updatedPortfolios[name] = {
					...portfolio,
					holdings: updatedHoldings,
					currentValue: currentValue,
					profitLoss: safeCalculateProfitLoss(currentValue, portfolio.initialDeposit)
				};
			} catch (error) {
				console.error(`❌ Failed to update prices for portfolio ${name}:`, error.message);
				// Keep portfolio unchanged if update fails
				updatedPortfolios[name] = portfolio;
			}
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
	
	// Only clear localStorage in browser environment
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_KEY);
	}
	
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
	
	// Check if globalStorage is available
	if (!priceService || !priceService.globalStorage || !priceService.globalStorage.pricesStore) {
		console.warn('⚠️ Price service global storage not available yet, skipping price updates');
		return;
	}
	
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

/**
 * Get transactions for a specific portfolio
 * @param {string} portfolioName - Portfolio name
 * @returns {Array} Array of transactions for the portfolio
 */
export function getPortfolioTransactions(portfolioName) {
	let transactions = [];
	simulationState.subscribe(state => {
		transactions = state.transactions
			.filter(tx => tx.portfolioName === portfolioName)
			.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
	})();
	return transactions;
}

// ============================================
// Per-Token Price Monitoring Logic
// ============================================

/**
 * Update lastActionPrice for a token in a portfolio
 * This should be called after any automated action (buy/sell/stop-loss)
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} price - Price at which action was taken
 */
export function updateLastActionPrice(portfolioName, symbol, price) {
	simulationState.update(current => {
		const portfolio = current.portfolios[portfolioName];
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		const holding = portfolio.holdings[symbol];
		if (!holding) {
			throw new Error(`No ${symbol} holdings in portfolio`);
		}
		
		// Update lastActionPrice in holding
		portfolio.holdings[symbol] = {
			...holding,
			lastActionPrice: price
		};
		
		// Also update in token settings if it exists
		if (portfolio.settings.tokenSettings && portfolio.settings.tokenSettings[symbol]) {
			portfolio.settings.tokenSettings[symbol].lastPrice = price;
		}
		
		return {
			...current,
			portfolios: {
				...current.portfolios,
				[portfolioName]: portfolio
			}
		};
	});
	
	console.log(`📌 Updated lastActionPrice for ${symbol} in ${portfolioName}: ${price}`);
}

/**
 * Check if a token meets the sell condition
 * Sell condition: current price has increased by sellPercent or more from lastActionPrice
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object} { shouldSell: boolean, percentChange: number, reason: string }
 */
export function checkSellCondition(portfolioName, symbol) {
	let result = { shouldSell: false, percentChange: 0, reason: '' };
	
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (!portfolio) {
			result.reason = 'Portfolio not found';
			return;
		}
		
		const holding = portfolio.holdings[symbol];
		if (!holding) {
			result.reason = `No ${symbol} holdings in portfolio`;
			return;
		}
		
		// Get token settings
		const tokenSettings = portfolio.settings.tokenSettings?.[symbol];
		if (!tokenSettings || !tokenSettings.enabled) {
			result.reason = 'Token settings not enabled';
			return;
		}
		
		// Get current price and last action price
		const currentPrice = holding.currentPrice;
		const lastActionPrice = holding.lastActionPrice || holding.initialPrice;
		
		if (!currentPrice || currentPrice <= 0) {
			result.reason = 'Invalid current price';
			return;
		}
		
		if (!lastActionPrice || lastActionPrice <= 0) {
			result.reason = 'Invalid last action price';
			return;
		}
		
		// Calculate percentage change
		const percentChange = ((currentPrice - lastActionPrice) / lastActionPrice) * 100;
		
		// Check if sell condition is met
		const sellPercent = tokenSettings.sellPercent || 0;
		if (sellPercent > 0 && percentChange >= sellPercent) {
			result.shouldSell = true;
			result.percentChange = percentChange;
			result.reason = `Price increased by ${percentChange.toFixed(2)}% (threshold: ${sellPercent}%)`;
		} else {
			result.percentChange = percentChange;
			result.reason = `Price change ${percentChange.toFixed(2)}% below sell threshold ${sellPercent}%`;
		}
	})();
	
	return result;
}

/**
 * Check if a token meets the buy condition
 * Buy condition: current price has decreased by buyPercent or more from lastActionPrice
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object} { shouldBuy: boolean, percentChange: number, reason: string }
 */
export function checkBuyCondition(portfolioName, symbol) {
	let result = { shouldBuy: false, percentChange: 0, reason: '' };
	
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (!portfolio) {
			result.reason = 'Portfolio not found';
			return;
		}
		
		const holding = portfolio.holdings[symbol];
		if (!holding) {
			result.reason = `No ${symbol} holdings in portfolio`;
			return;
		}
		
		// Get token settings
		const tokenSettings = portfolio.settings.tokenSettings?.[symbol];
		if (!tokenSettings || !tokenSettings.enabled) {
			result.reason = 'Token settings not enabled';
			return;
		}
		
		// Get current price and last action price
		const currentPrice = holding.currentPrice;
		const lastActionPrice = holding.lastActionPrice || holding.initialPrice;
		
		if (!currentPrice || currentPrice <= 0) {
			result.reason = 'Invalid current price';
			return;
		}
		
		if (!lastActionPrice || lastActionPrice <= 0) {
			result.reason = 'Invalid last action price';
			return;
		}
		
		// Calculate percentage change (negative for decrease)
		const percentChange = ((currentPrice - lastActionPrice) / lastActionPrice) * 100;
		
		// Check if buy condition is met (price decreased)
		const buyPercent = tokenSettings.buyPercent || 0;
		if (buyPercent > 0 && percentChange <= -buyPercent) {
			result.shouldBuy = true;
			result.percentChange = percentChange;
			result.reason = `Price decreased by ${Math.abs(percentChange).toFixed(2)}% (threshold: ${buyPercent}%)`;
		} else {
			result.percentChange = percentChange;
			result.reason = `Price change ${percentChange.toFixed(2)}% above buy threshold -${buyPercent}%`;
		}
	})();
	
	return result;
}

/**
 * Check if a token meets the stop-loss condition
 * Stop-loss condition: current price has decreased by stopLossPercent or more from lastActionPrice
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object} { shouldStopLoss: boolean, percentChange: number, reason: string }
 */
export function checkStopLossCondition(portfolioName, symbol) {
	let result = { shouldStopLoss: false, percentChange: 0, reason: '' };
	
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (!portfolio) {
			result.reason = 'Portfolio not found';
			return;
		}
		
		const holding = portfolio.holdings[symbol];
		if (!holding) {
			result.reason = `No ${symbol} holdings in portfolio`;
			return;
		}
		
		// Get token settings
		const tokenSettings = portfolio.settings.tokenSettings?.[symbol];
		if (!tokenSettings || !tokenSettings.enabled) {
			result.reason = 'Token settings not enabled';
			return;
		}
		
		// Get current price and last action price
		const currentPrice = holding.currentPrice;
		const lastActionPrice = holding.lastActionPrice || holding.initialPrice;
		
		if (!currentPrice || currentPrice <= 0) {
			result.reason = 'Invalid current price';
			return;
		}
		
		if (!lastActionPrice || lastActionPrice <= 0) {
			result.reason = 'Invalid last action price';
			return;
		}
		
		// Calculate percentage change (negative for decrease)
		const percentChange = ((currentPrice - lastActionPrice) / lastActionPrice) * 100;
		
		// Check if stop-loss condition is met (price decreased significantly)
		const stopLossPercent = tokenSettings.stopLossPercent || 0;
		if (stopLossPercent > 0 && percentChange <= -stopLossPercent) {
			result.shouldStopLoss = true;
			result.percentChange = percentChange;
			result.reason = `Price decreased by ${Math.abs(percentChange).toFixed(2)}% (threshold: ${stopLossPercent}%)`;
		} else {
			result.percentChange = percentChange;
			result.reason = `Price change ${percentChange.toFixed(2)}% above stop-loss threshold -${stopLossPercent}%`;
		}
	})();
	
	return result;
}

/**
 * Check all price conditions for a token
 * Returns which action should be taken (if any)
 * Priority: stop-loss > sell > buy
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object} { action: 'none'|'sell'|'buy'|'stop-loss', details: Object }
 */
export function checkTokenPriceConditions(portfolioName, symbol) {
	// Check stop-loss first (highest priority)
	const stopLossCheck = checkStopLossCondition(portfolioName, symbol);
	if (stopLossCheck.shouldStopLoss) {
		return {
			action: 'stop-loss',
			details: stopLossCheck
		};
	}
	
	// Check sell condition
	const sellCheck = checkSellCondition(portfolioName, symbol);
	if (sellCheck.shouldSell) {
		return {
			action: 'sell',
			details: sellCheck
		};
	}
	
	// Check buy condition
	const buyCheck = checkBuyCondition(portfolioName, symbol);
	if (buyCheck.shouldBuy) {
		return {
			action: 'buy',
			details: buyCheck
		};
	}
	
	// No action needed
	return {
		action: 'none',
		details: {
			reason: 'No conditions met',
			sellCheck,
			buyCheck,
			stopLossCheck
		}
	};
}

/**
 * Check all tokens in a portfolio for price conditions
 * @param {string} portfolioName - Portfolio name
 * @returns {Array} Array of { symbol, action, details } for tokens that need action
 */
export function checkAllTokenConditions(portfolioName) {
	let actionsNeeded = [];
	
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (!portfolio) {
			console.warn(`Portfolio ${portfolioName} not found`);
			return;
		}
		
		// Check each holding
		for (const symbol of Object.keys(portfolio.holdings)) {
			const check = checkTokenPriceConditions(portfolioName, symbol);
			if (check.action !== 'none') {
				actionsNeeded.push({
					symbol,
					action: check.action,
					details: check.details
				});
			}
		}
	})();
	
	return actionsNeeded;
}

/**
 * Monitor all portfolios and return tokens that need action
 * @returns {Object} Map of portfolioName -> array of actions needed
 */
export function monitorAllPortfolios() {
	let portfolioActions = {};
	
	simulationState.subscribe(state => {
		for (const portfolioName of Object.keys(state.portfolios)) {
			const actions = checkAllTokenConditions(portfolioName);
			if (actions.length > 0) {
				portfolioActions[portfolioName] = actions;
			}
		}
	})();
	
	return portfolioActions;
}

// ============================================
// Per-Token Automated Actions
// ============================================

/**
 * Execute automated sell for a specific token
 * Sells a percentage of the token holding based on token settings
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} currentPrice - Current token price
 * @param {number} sellPercentage - Percentage of holding to sell (default: 100%)
 * @returns {Object} Result with success status and details
 */
export function executeAutomatedSell(portfolioName, symbol, currentPrice, sellPercentage = 100) {
	let result;
	
	try {
		// Validate inputs
		if (!portfolioName || !symbol) {
			throw new Error('Portfolio name and symbol are required');
		}
		
		if (!currentPrice || currentPrice <= 0) {
			throw new Error('Invalid current price');
		}
		
		if (sellPercentage <= 0 || sellPercentage > 100) {
			throw new Error('Sell percentage must be between 0 and 100');
		}
		
		// Get portfolio and holding
		let portfolio, holding;
		simulationState.subscribe(state => {
			portfolio = state.portfolios[portfolioName];
			if (portfolio) {
				holding = portfolio.holdings[symbol];
			}
		})();
		
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		if (!holding) {
			throw new Error(`No ${symbol} holdings in portfolio`);
		}
		
		// Calculate amount to sell
		const tokenAmountToSell = (holding.amount * sellPercentage) / 100;
		
		if (tokenAmountToSell <= 0) {
			throw new Error('Calculated sell amount is zero or negative');
		}
		
		// Execute the sell
		result = sellTokenFromPortfolio(portfolioName, symbol, tokenAmountToSell, currentPrice);
		
		// Update lastActionPrice
		updateLastActionPrice(portfolioName, symbol, currentPrice);
		
		// Add automated action transaction
		simulationState.update(current => {
			const transaction = {
				id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				portfolioName,
				type: 'automated_sell',
				timestamp: Date.now(),
				details: {
					symbol,
					tokenAmount: tokenAmountToSell,
					usdAmount: result.usdAmount,
					price: currentPrice,
					profitLoss: result.profitLoss,
					sellPercentage,
					reason: 'Price increase threshold met'
				}
			};
			
			return {
				...current,
				transactions: [...current.transactions, transaction]
			};
		});
		
		console.log(`🤖 Automated sell executed for ${symbol} in ${portfolioName}:`, {
			tokenAmount: tokenAmountToSell,
			usdAmount: result.usdAmount,
			price: currentPrice
		});
		
		return {
			success: true,
			action: 'sell',
			symbol,
			tokenAmount: tokenAmountToSell,
			usdAmount: result.usdAmount,
			profitLoss: result.profitLoss,
			price: currentPrice
		};
	} catch (error) {
		console.error(`❌ Automated sell failed for ${symbol} in ${portfolioName}:`, error.message);
		return {
			success: false,
			action: 'sell',
			symbol,
			error: error.message
		};
	}
}

/**
 * Execute automated buy for a specific token
 * Buys more of the token using available balance
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} currentPrice - Current token price
 * @param {number} usdAmount - USD amount to spend (optional, defaults to calculated amount based on target percentage)
 * @returns {Object} Result with success status and details
 */
export function executeAutomatedBuy(portfolioName, symbol, currentPrice, usdAmount = null) {
	let result;
	
	try {
		// Validate inputs
		if (!portfolioName || !symbol) {
			throw new Error('Portfolio name and symbol are required');
		}
		
		if (!currentPrice || currentPrice <= 0) {
			throw new Error('Invalid current price');
		}
		
		// Get portfolio, holding, and token settings
		let portfolio, holding, tokenSettings, availableBalance;
		simulationState.subscribe(state => {
			portfolio = state.portfolios[portfolioName];
			availableBalance = state.balance;
			if (portfolio) {
				holding = portfolio.holdings[symbol];
				tokenSettings = portfolio.settings.tokenSettings?.[symbol];
			}
		})();
		
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		if (!holding) {
			throw new Error(`No ${symbol} holdings in portfolio`);
		}
		
		// Calculate buy amount if not provided
		let buyAmount = usdAmount;
		if (!buyAmount) {
			// Use a default percentage of current holding value (e.g., 10%)
			const currentHoldingValue = holding.amount * currentPrice;
			buyAmount = currentHoldingValue * 0.1; // Buy 10% more
			
			// If token settings exist, use target percentage to calculate
			if (tokenSettings && tokenSettings.targetPercentage) {
				const targetValue = (portfolio.currentValue * tokenSettings.targetPercentage) / 100;
				const currentValue = holding.amount * currentPrice;
				const deficit = targetValue - currentValue;
				
				if (deficit > 0) {
					buyAmount = Math.min(deficit, availableBalance);
				}
			}
		}
		
		// Ensure we don't exceed available balance
		buyAmount = Math.min(buyAmount, availableBalance);
		
		if (buyAmount <= 0) {
			throw new Error('Insufficient balance for automated buy');
		}
		
		// Execute the buy
		result = buyTokenForPortfolio(portfolioName, symbol, buyAmount, currentPrice);
		
		// Update lastActionPrice
		updateLastActionPrice(portfolioName, symbol, currentPrice);
		
		// Add automated action transaction
		simulationState.update(current => {
			const transaction = {
				id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				portfolioName,
				type: 'automated_buy',
				timestamp: Date.now(),
				details: {
					symbol,
					tokenAmount: result.tokenAmount,
					usdAmount: buyAmount,
					price: currentPrice,
					reason: 'Price decrease threshold met'
				}
			};
			
			return {
				...current,
				transactions: [...current.transactions, transaction]
			};
		});
		
		console.log(`🤖 Automated buy executed for ${symbol} in ${portfolioName}:`, {
			tokenAmount: result.tokenAmount,
			usdAmount: buyAmount,
			price: currentPrice
		});
		
		return {
			success: true,
			action: 'buy',
			symbol,
			tokenAmount: result.tokenAmount,
			usdAmount: buyAmount,
			price: currentPrice
		};
	} catch (error) {
		console.error(`❌ Automated buy failed for ${symbol} in ${portfolioName}:`, error.message);
		return {
			success: false,
			action: 'buy',
			symbol,
			error: error.message
		};
	}
}

/**
 * Execute stop-loss for a specific token
 * Converts the entire token holding to USDC (simulated as selling to balance)
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} currentPrice - Current token price
 * @returns {Object} Result with success status and details
 */
export function executeStopLoss(portfolioName, symbol, currentPrice) {
	let result;
	
	try {
		// Validate inputs
		if (!portfolioName || !symbol) {
			throw new Error('Portfolio name and symbol are required');
		}
		
		if (!currentPrice || currentPrice <= 0) {
			throw new Error('Invalid current price');
		}
		
		// Get portfolio and holding
		let portfolio, holding;
		simulationState.subscribe(state => {
			portfolio = state.portfolios[portfolioName];
			if (portfolio) {
				holding = portfolio.holdings[symbol];
			}
		})();
		
		if (!portfolio) {
			throw new Error('Portfolio not found');
		}
		
		if (!holding) {
			throw new Error(`No ${symbol} holdings in portfolio`);
		}
		
		// Sell entire holding (convert to USDC)
		const tokenAmountToSell = holding.amount;
		
		if (tokenAmountToSell <= 0) {
			throw new Error('No tokens to sell for stop-loss');
		}
		
		// Execute the sell
		result = sellTokenFromPortfolio(portfolioName, symbol, tokenAmountToSell, currentPrice);
		
		// Update lastActionPrice
		updateLastActionPrice(portfolioName, symbol, currentPrice);
		
		// Add stop-loss transaction
		simulationState.update(current => {
			const transaction = {
				id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				portfolioName,
				type: 'stop_loss',
				timestamp: Date.now(),
				details: {
					symbol,
					tokenAmount: tokenAmountToSell,
					usdAmount: result.usdAmount,
					price: currentPrice,
					profitLoss: result.profitLoss,
					reason: 'Stop-loss threshold triggered',
					convertedTo: 'USDC'
				}
			};
			
			return {
				...current,
				transactions: [...current.transactions, transaction]
			};
		});
		
		console.log(`🛑 Stop-loss executed for ${symbol} in ${portfolioName}:`, {
			tokenAmount: tokenAmountToSell,
			usdAmount: result.usdAmount,
			price: currentPrice,
			profitLoss: result.profitLoss
		});
		
		return {
			success: true,
			action: 'stop-loss',
			symbol,
			tokenAmount: tokenAmountToSell,
			usdAmount: result.usdAmount,
			profitLoss: result.profitLoss,
			price: currentPrice,
			convertedTo: 'USDC'
		};
	} catch (error) {
		console.error(`❌ Stop-loss failed for ${symbol} in ${portfolioName}:`, error.message);
		return {
			success: false,
			action: 'stop-loss',
			symbol,
			error: error.message
		};
	}
}

/**
 * Execute the appropriate automated action for a token based on price conditions
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @param {number} currentPrice - Current token price
 * @returns {Object} Result with success status and details
 */
export function executeTokenAction(portfolioName, symbol, currentPrice) {
	// Check what action is needed
	const check = checkTokenPriceConditions(portfolioName, symbol);
	
	if (check.action === 'none') {
		return {
			success: false,
			action: 'none',
			symbol,
			reason: 'No action needed'
		};
	}
	
	// Execute the appropriate action
	switch (check.action) {
		case 'stop-loss':
			return executeStopLoss(portfolioName, symbol, currentPrice);
		
		case 'sell':
			return executeAutomatedSell(portfolioName, symbol, currentPrice);
		
		case 'buy':
			return executeAutomatedBuy(portfolioName, symbol, currentPrice);
		
		default:
			return {
				success: false,
				action: check.action,
				symbol,
				error: 'Unknown action type'
			};
	}
}

/**
 * Execute automated actions for all tokens in a portfolio that meet conditions
 * @param {string} portfolioName - Portfolio name
 * @returns {Array} Array of action results
 */
export function executePortfolioAutomation(portfolioName) {
	const actionsNeeded = checkAllTokenConditions(portfolioName);
	const results = [];
	
	for (const { symbol, action, details } of actionsNeeded) {
		// Get current price from holding
		let currentPrice;
		simulationState.subscribe(state => {
			const portfolio = state.portfolios[portfolioName];
			if (portfolio && portfolio.holdings[symbol]) {
				currentPrice = portfolio.holdings[symbol].currentPrice;
			}
		})();
		
		if (currentPrice) {
			const result = executeTokenAction(portfolioName, symbol, currentPrice);
			results.push(result);
		}
	}
	
	return results;
}

/**
 * Execute automated actions for all portfolios
 * @returns {Object} Map of portfolioName -> array of action results
 */
export function executeAllPortfolioAutomation() {
	const portfolioActions = monitorAllPortfolios();
	const allResults = {};
	
	for (const portfolioName of Object.keys(portfolioActions)) {
		const results = executePortfolioAutomation(portfolioName);
		if (results.length > 0) {
			allResults[portfolioName] = results;
		}
	}
	
	return allResults;
}

// ============================================
// Auto-Balance Feature
// ============================================

/**
 * Check if a token needs rebalancing
 * Compares current percentage to target percentage
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object} { needsRebalance: boolean, action: 'buy'|'sell'|'none', currentPercentage: number, targetPercentage: number, amountToTrade: number }
 */
export function checkTokenRebalance(portfolioName, symbol) {
	let result = {
		needsRebalance: false,
		action: 'none',
		currentPercentage: 0,
		targetPercentage: 0,
		amountToTrade: 0,
		reason: ''
	};
	
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (!portfolio) {
			result.reason = 'Portfolio not found';
			return;
		}
		
		// Check if auto-balance is enabled
		if (!portfolio.settings.autoBalanceEnabled) {
			result.reason = 'Auto-balance not enabled';
			return;
		}
		
		const holding = portfolio.holdings[symbol];
		if (!holding) {
			result.reason = `No ${symbol} holdings in portfolio`;
			return;
		}
		
		// Get token settings
		const tokenSettings = portfolio.settings.tokenSettings?.[symbol];
		if (!tokenSettings || !tokenSettings.enabled) {
			result.reason = 'Token settings not enabled';
			return;
		}
		
		const targetPercentage = tokenSettings.targetPercentage || 0;
		if (targetPercentage <= 0) {
			result.reason = 'No target percentage set';
			return;
		}
		
		// Calculate current percentage based on current portfolio value
		const currentValue = portfolio.currentValue;
		if (currentValue <= 0) {
			result.reason = 'Invalid portfolio value';
			return;
		}
		
		const holdingValue = holding.amount * holding.currentPrice;
		const currentPercentage = (holdingValue / currentValue) * 100;
		
		// Calculate target value
		const targetValue = (currentValue * targetPercentage) / 100;
		const currentHoldingValue = holding.amount * holding.currentPrice;
		const difference = targetValue - currentHoldingValue;
		
		// Use a tolerance of 0.5% to avoid constant tiny rebalances
		const percentageDifference = Math.abs(currentPercentage - targetPercentage);
		const REBALANCE_TOLERANCE = 0.5;
		
		if (percentageDifference < REBALANCE_TOLERANCE) {
			result.reason = `Within tolerance (${percentageDifference.toFixed(2)}% difference)`;
			result.currentPercentage = currentPercentage;
			result.targetPercentage = targetPercentage;
			return;
		}
		
		// Determine action needed
		if (difference > 0) {
			// Need to buy more
			result.needsRebalance = true;
			result.action = 'buy';
			result.amountToTrade = difference; // USD amount to buy
			result.reason = `Current ${currentPercentage.toFixed(2)}% < Target ${targetPercentage.toFixed(2)}%`;
		} else if (difference < 0) {
			// Need to sell some
			result.needsRebalance = true;
			result.action = 'sell';
			// Calculate token amount to sell
			const tokenAmountToSell = Math.abs(difference) / holding.currentPrice;
			result.amountToTrade = tokenAmountToSell; // Token amount to sell
			result.reason = `Current ${currentPercentage.toFixed(2)}% > Target ${targetPercentage.toFixed(2)}%`;
		}
		
		result.currentPercentage = currentPercentage;
		result.targetPercentage = targetPercentage;
	})();
	
	return result;
}

/**
 * Check all tokens in a portfolio for rebalancing needs
 * @param {string} portfolioName - Portfolio name
 * @returns {Array} Array of { symbol, action, currentPercentage, targetPercentage, amountToTrade } for tokens that need rebalancing
 */
export function checkPortfolioRebalance(portfolioName) {
	let rebalanceActions = [];
	
	simulationState.subscribe(state => {
		const portfolio = state.portfolios[portfolioName];
		if (!portfolio) {
			console.warn(`Portfolio ${portfolioName} not found`);
			return;
		}
		
		// Check if auto-balance is enabled
		if (!portfolio.settings.autoBalanceEnabled) {
			return;
		}
		
		// Check each holding
		for (const symbol of Object.keys(portfolio.holdings)) {
			const check = checkTokenRebalance(portfolioName, symbol);
			if (check.needsRebalance) {
				rebalanceActions.push({
					symbol,
					action: check.action,
					currentPercentage: check.currentPercentage,
					targetPercentage: check.targetPercentage,
					amountToTrade: check.amountToTrade,
					reason: check.reason
				});
			}
		}
	})();
	
	return rebalanceActions;
}

/**
 * Execute auto-balance for a specific token
 * Buys or sells to restore target percentage
 * @param {string} portfolioName - Portfolio name
 * @param {string} symbol - Token symbol
 * @returns {Object} Result with success status and details
 */
export function executeTokenRebalance(portfolioName, symbol) {
	try {
		// Check what rebalancing is needed
		const check = checkTokenRebalance(portfolioName, symbol);
		
		if (!check.needsRebalance) {
			return {
				success: false,
				action: 'none',
				symbol,
				reason: check.reason || 'No rebalancing needed'
			};
		}
		
		// Get current price
		let currentPrice;
		simulationState.subscribe(state => {
			const portfolio = state.portfolios[portfolioName];
			if (portfolio && portfolio.holdings[symbol]) {
				currentPrice = portfolio.holdings[symbol].currentPrice;
			}
		})();
		
		if (!currentPrice || currentPrice <= 0) {
			throw new Error('Invalid current price');
		}
		
		let result;
		
		if (check.action === 'buy') {
			// Buy more tokens to reach target percentage
			const usdAmount = check.amountToTrade;
			
			// Check if we have enough balance
			let availableBalance;
			simulationState.subscribe(state => {
				availableBalance = state.balance;
			})();
			
			if (usdAmount > availableBalance) {
				throw new Error(`Insufficient balance for rebalancing. Need ${usdAmount.toFixed(2)}, have ${availableBalance.toFixed(2)}`);
			}
			
			result = buyTokenForPortfolio(portfolioName, symbol, usdAmount, currentPrice);
			
			// Add rebalance transaction
			simulationState.update(current => {
				const transaction = {
					id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					portfolioName,
					type: 'auto_balance_buy',
					timestamp: Date.now(),
					details: {
						symbol,
						tokenAmount: result.tokenAmount,
						usdAmount: usdAmount,
						price: currentPrice,
						currentPercentage: check.currentPercentage,
						targetPercentage: check.targetPercentage,
						reason: 'Auto-balance: restore target allocation'
					}
				};
				
				return {
					...current,
					transactions: [...current.transactions, transaction]
				};
			});
			
			console.log(`⚖️ Auto-balance BUY executed for ${symbol} in ${portfolioName}:`, {
				tokenAmount: result.tokenAmount,
				usdAmount: usdAmount,
				currentPercentage: check.currentPercentage.toFixed(2),
				targetPercentage: check.targetPercentage.toFixed(2)
			});
			
			return {
				success: true,
				action: 'buy',
				symbol,
				tokenAmount: result.tokenAmount,
				usdAmount: usdAmount,
				currentPercentage: check.currentPercentage,
				targetPercentage: check.targetPercentage,
				price: currentPrice
			};
			
		} else if (check.action === 'sell') {
			// Sell tokens to reach target percentage
			const tokenAmount = check.amountToTrade;
			
			result = sellTokenFromPortfolio(portfolioName, symbol, tokenAmount, currentPrice);
			
			// Add rebalance transaction
			simulationState.update(current => {
				const transaction = {
					id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					portfolioName,
					type: 'auto_balance_sell',
					timestamp: Date.now(),
					details: {
						symbol,
						tokenAmount: tokenAmount,
						usdAmount: result.usdAmount,
						price: currentPrice,
						profitLoss: result.profitLoss,
						currentPercentage: check.currentPercentage,
						targetPercentage: check.targetPercentage,
						reason: 'Auto-balance: restore target allocation'
					}
				};
				
				return {
					...current,
					transactions: [...current.transactions, transaction]
				};
			});
			
			console.log(`⚖️ Auto-balance SELL executed for ${symbol} in ${portfolioName}:`, {
				tokenAmount: tokenAmount,
				usdAmount: result.usdAmount,
				currentPercentage: check.currentPercentage.toFixed(2),
				targetPercentage: check.targetPercentage.toFixed(2)
			});
			
			return {
				success: true,
				action: 'sell',
				symbol,
				tokenAmount: tokenAmount,
				usdAmount: result.usdAmount,
				profitLoss: result.profitLoss,
				currentPercentage: check.currentPercentage,
				targetPercentage: check.targetPercentage,
				price: currentPrice
			};
		}
		
		return {
			success: false,
			action: check.action,
			symbol,
			error: 'Unknown rebalance action'
		};
		
	} catch (error) {
		console.error(`❌ Auto-balance failed for ${symbol} in ${portfolioName}:`, error.message);
		return {
			success: false,
			action: 'error',
			symbol,
			error: error.message
		};
	}
}

/**
 * Execute auto-balance for all tokens in a portfolio
 * @param {string} portfolioName - Portfolio name
 * @returns {Array} Array of rebalance results
 */
export function executePortfolioRebalance(portfolioName) {
	const rebalanceActions = checkPortfolioRebalance(portfolioName);
	const results = [];
	
	for (const { symbol } of rebalanceActions) {
		const result = executeTokenRebalance(portfolioName, symbol);
		results.push(result);
	}
	
	if (results.length > 0) {
		console.log(`⚖️ Auto-balance completed for ${portfolioName}: ${results.length} action(s) executed`);
	}
	
	return results;
}

/**
 * Execute auto-balance for all portfolios that have it enabled
 * @returns {Object} Map of portfolioName -> array of rebalance results
 */
export function executeAllPortfolioRebalance() {
	let allResults = {};
	
	simulationState.subscribe(state => {
		for (const portfolioName of Object.keys(state.portfolios)) {
			const portfolio = state.portfolios[portfolioName];
			
			// Only rebalance if auto-balance is enabled
			if (portfolio.settings.autoBalanceEnabled) {
				const results = executePortfolioRebalance(portfolioName);
				if (results.length > 0) {
					allResults[portfolioName] = results;
				}
			}
		}
	})();
	
	return allResults;
}
