/**
 * Simulation Trading Service
 * Handles all mock trading operations without blockchain interactions
 * Uses price data to calculate profits, losses, and portfolio values
 * 
 * Enhanced with multi-portfolio support for simulation-portfolio-flow spec
 */

import priceService from '$lib/priceService.js';

class SimulationTradingService {
	constructor() {
		this.STORAGE_KEY = 'simulation_portfolio';
		this.INITIAL_BALANCE = 10000; // $10,000 starting balance
		this.ROUNDING_TOLERANCE = 0.01; // $0.01 tolerance for rounding errors
	}

	/**
	 * Initialize or get simulation portfolio
	 */
	getPortfolio() {
		// SSR guard
		if (typeof window === 'undefined') {
			return {
				balance: this.INITIAL_BALANCE,
				holdings: {},
				transactions: [],
				createdAt: Date.now(),
				totalDeposited: this.INITIAL_BALANCE,
				totalWithdrawn: 0
			};
		}
		
		const stored = localStorage.getItem(this.STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}

		// Create new portfolio
		const portfolio = {
			balance: this.INITIAL_BALANCE, // USD balance
			holdings: {}, // { tokenSymbol: { amount, avgBuyPrice, totalInvested } }
			transactions: [],
			createdAt: Date.now(),
			totalDeposited: this.INITIAL_BALANCE,
			totalWithdrawn: 0
		};

		this.savePortfolio(portfolio);
		return portfolio;
	}

	/**
	 * Save portfolio to localStorage
	 */
	savePortfolio(portfolio) {
		if (typeof window === 'undefined') return;
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(portfolio));
	}

	/**
	 * Calculate portfolio value based on current prices
	 */
	calculatePortfolioValue(portfolio, currentPrices) {
		let totalValue = portfolio.balance;

		for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
			const currentPrice = currentPrices[symbol] || holding.avgBuyPrice;
			totalValue += holding.amount * currentPrice;
		}

		return totalValue;
	}

	/**
	 * Calculate profit/loss for entire portfolio
	 */
	calculateProfitLoss(portfolio, currentPrices) {
		const currentValue = this.calculatePortfolioValue(portfolio, currentPrices);
		const totalInvested = portfolio.totalDeposited - portfolio.totalWithdrawn;
		const profitLoss = currentValue - totalInvested;
		const profitLossPercent = (profitLoss / totalInvested) * 100;

		return {
			profitLoss,
			profitLossPercent,
			currentValue,
			totalInvested
		};
	}

	/**
	 * Calculate profit/loss for a specific holding
	 */
	calculateHoldingProfitLoss(holding, currentPrice) {
		const currentValue = holding.amount * currentPrice;
		const profitLoss = currentValue - holding.totalInvested;
		const profitLossPercent = (profitLoss / holding.totalInvested) * 100;

		return {
			profitLoss,
			profitLossPercent,
			currentValue
		};
	}

	/**
	 * Buy tokens (mock)
	 * @param {string} symbol - Token symbol (e.g., 'ETH')
	 * @param {number} amountUSD - Amount in USD to spend
	 * @param {number} currentPrice - Current token price
	 */
	buyToken(symbol, amountUSD, currentPrice) {
		const portfolio = this.getPortfolio();

		// Check if enough balance
		if (portfolio.balance < amountUSD) {
			throw new Error('Insufficient balance');
		}

		// Calculate token amount
		const tokenAmount = amountUSD / currentPrice;

		// Update or create holding
		if (!portfolio.holdings[symbol]) {
			portfolio.holdings[symbol] = {
				amount: 0,
				avgBuyPrice: 0,
				totalInvested: 0
			};
		}

		const holding = portfolio.holdings[symbol];
		const newTotalAmount = holding.amount + tokenAmount;
		const newTotalInvested = holding.totalInvested + amountUSD;

		// Update holding
		holding.amount = newTotalAmount;
		holding.totalInvested = newTotalInvested;
		holding.avgBuyPrice = newTotalInvested / newTotalAmount;

		// Deduct from balance
		portfolio.balance -= amountUSD;

		// Record transaction
		portfolio.transactions.push({
			type: 'buy',
			symbol,
			tokenAmount,
			usdAmount: amountUSD,
			price: currentPrice,
			timestamp: Date.now()
		});

		this.savePortfolio(portfolio);

		return {
			success: true,
			tokenAmount,
			newBalance: portfolio.balance,
			holding: portfolio.holdings[symbol]
		};
	}

	/**
	 * Sell tokens (mock)
	 * @param {string} symbol - Token symbol
	 * @param {number} tokenAmount - Amount of tokens to sell
	 * @param {number} currentPrice - Current token price
	 */
	sellToken(symbol, tokenAmount, currentPrice) {
		const portfolio = this.getPortfolio();

		// Check if holding exists and has enough tokens
		if (!portfolio.holdings[symbol] || portfolio.holdings[symbol].amount < tokenAmount) {
			throw new Error('Insufficient tokens');
		}

		const holding = portfolio.holdings[symbol];
		const usdAmount = tokenAmount * currentPrice;

		// Calculate profit/loss for this sale
		const avgCost = (tokenAmount / holding.amount) * holding.totalInvested;
		const profitLoss = usdAmount - avgCost;

		// Update holding
		holding.amount -= tokenAmount;
		holding.totalInvested -= avgCost;

		// Remove holding if amount is zero
		if (holding.amount === 0) {
			delete portfolio.holdings[symbol];
		}

		// Add to balance
		portfolio.balance += usdAmount;

		// Record transaction
		portfolio.transactions.push({
			type: 'sell',
			symbol,
			tokenAmount,
			usdAmount,
			price: currentPrice,
			profitLoss,
			timestamp: Date.now()
		});

		this.savePortfolio(portfolio);

		return {
			success: true,
			usdAmount,
			profitLoss,
			newBalance: portfolio.balance
		};
	}

	/**
	 * Deposit funds (mock)
	 */
	deposit(amount) {
		const portfolio = this.getPortfolio();
		portfolio.balance += amount;
		portfolio.totalDeposited += amount;

		portfolio.transactions.push({
			type: 'deposit',
			usdAmount: amount,
			timestamp: Date.now()
		});

		this.savePortfolio(portfolio);

		return {
			success: true,
			newBalance: portfolio.balance
		};
	}

	/**
	 * Withdraw funds (mock)
	 */
	withdraw(amount) {
		const portfolio = this.getPortfolio();

		if (portfolio.balance < amount) {
			throw new Error('Insufficient balance');
		}

		portfolio.balance -= amount;
		portfolio.totalWithdrawn += amount;

		portfolio.transactions.push({
			type: 'withdraw',
			usdAmount: amount,
			timestamp: Date.now()
		});

		this.savePortfolio(portfolio);

		return {
			success: true,
			newBalance: portfolio.balance
		};
	}

	/**
	 * Get transaction history
	 */
	getTransactions(limit = 50) {
		const portfolio = this.getPortfolio();
		return portfolio.transactions
			.slice(-limit)
			.reverse();
	}

	/**
	 * Reset portfolio (for testing)
	 */
	reset() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(this.STORAGE_KEY);
		}
		return this.getPortfolio();
	}

	/**
	 * Get portfolio summary
	 */
	getSummary(currentPrices) {
		const portfolio = this.getPortfolio();
		const { profitLoss, profitLossPercent, currentValue, totalInvested } = 
			this.calculateProfitLoss(portfolio, currentPrices);

		const holdings = Object.entries(portfolio.holdings).map(([symbol, holding]) => {
			const currentPrice = currentPrices[symbol] || holding.avgBuyPrice;
			const holdingPL = this.calculateHoldingProfitLoss(holding, currentPrice);

			return {
				symbol,
				amount: holding.amount,
				avgBuyPrice: holding.avgBuyPrice,
				currentPrice,
				totalInvested: holding.totalInvested,
				currentValue: holdingPL.currentValue,
				profitLoss: holdingPL.profitLoss,
				profitLossPercent: holdingPL.profitLossPercent
			};
		});

		return {
			balance: portfolio.balance,
			totalValue: currentValue,
			totalInvested,
			profitLoss,
			profitLossPercent,
			holdings,
			transactionCount: portfolio.transactions.length
		};
	}

	// ============================================
	// Multi-Portfolio Management Methods
	// ============================================

	/**
	 * Create a new portfolio with initial deposit
	 * This method is called from the simulation store
	 * 
	 * @param {string} name - Portfolio name (unique identifier)
	 * @param {string} description - Portfolio description
	 * @param {number} depositAmount - Initial deposit amount in USD
	 * @returns {Object} Created portfolio object
	 */
	createPortfolio(name, description, depositAmount) {
		// Validation is handled by the store
		// This method just creates the portfolio structure
		return {
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
	}

	/**
	 * Calculate token amounts based on allocations, total value, and current prices
	 * 
	 * @param {Object} allocations - Token allocations { symbol: percentage }
	 * @param {number} totalValue - Total portfolio value in USD
	 * @param {Object} prices - Current token prices { symbol: price }
	 * @returns {Object} Token amounts { symbol: { amount, initialPrice, currentPrice, percentage, value } }
	 */
	calculateTokenAmounts(allocations, totalValue, prices) {
		const tokenAmounts = {};
		
		for (const [symbol, percentage] of Object.entries(allocations)) {
			const price = prices[symbol];
			
			if (!price || price <= 0) {
				throw new Error(`Invalid price for ${symbol}: ${price}`);
			}
			
			// Calculate USD value for this token
			const usdValue = (totalValue * percentage) / 100;
			
			// Calculate token amount
			const amount = usdValue / price;
			
			tokenAmounts[symbol] = {
				amount,
				initialPrice: price,
				currentPrice: price,
				percentage,
				value: usdValue
			};
		}
		
		// Verify total value matches (within rounding tolerance)
		const calculatedTotal = Object.values(tokenAmounts).reduce((sum, token) => sum + token.value, 0);
		const difference = Math.abs(calculatedTotal - totalValue);
		
		if (difference > this.ROUNDING_TOLERANCE) {
			console.warn(`Token amount calculation mismatch: expected ${totalValue}, got ${calculatedTotal}, difference: ${difference}`);
		}
		
		return tokenAmounts;
	}

	/**
	 * Validate token allocations
	 * 
	 * @param {Object} allocations - Token allocations { symbol: percentage }
	 * @returns {Object} Validation result { valid: boolean, errors: string[] }
	 */
	validateAllocations(allocations) {
		const errors = [];
		
		// Check if allocations is an object
		if (!allocations || typeof allocations !== 'object') {
			errors.push('Allocations must be an object');
			return { valid: false, errors };
		}
		
		// Check if at least one token is selected
		const symbols = Object.keys(allocations);
		if (symbols.length === 0) {
			errors.push('Select at least one token');
			return { valid: false, errors };
		}
		
		// Validate each allocation
		let totalPercentage = 0;
		for (const [symbol, percentage] of Object.entries(allocations)) {
			// Check if percentage is a number
			if (typeof percentage !== 'number' || isNaN(percentage)) {
				errors.push(`Invalid percentage for ${symbol}: must be a number`);
				continue;
			}
			
			// Check if percentage is non-negative
			if (percentage < 0) {
				errors.push(`Percentage for ${symbol} cannot be negative`);
				continue;
			}
			
			totalPercentage += percentage;
		}
		
		// Check if total percentage equals 100%
		const percentageDifference = Math.abs(totalPercentage - 100);
		if (percentageDifference > 0.01) { // Allow 0.01% tolerance for rounding
			errors.push(`Total allocation must equal 100% (current: ${totalPercentage.toFixed(2)}%)`);
		}
		
		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Fetch current prices for specified token symbols with retry logic
	 * Uses the existing priceService to get real-time prices
	 * 
	 * @param {string[]} tokenSymbols - Array of token symbols
	 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
	 * @returns {Promise<Object>} Price map { symbol: price }
	 */
	async fetchCurrentPrices(tokenSymbols, maxRetries = 3) {
		let lastError = null;
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`📊 Fetching prices (attempt ${attempt}/${maxRetries})...`);
				
				// Ensure price service is initialized
				if (!priceService.isInitialized) {
					await priceService.initialize();
				}
				
				// Get all prices from the price service
				const allPrices = priceService.globalStorage.getAllPrices();
				
				// Validate we have price data
				if (!allPrices || Object.keys(allPrices).length === 0) {
					throw new Error('No price data available from price service');
				}
				
				// Extract prices for requested symbols
				const prices = {};
				const missingSymbols = [];
				
				for (const symbol of tokenSymbols) {
					// Find the token in the price data
					// Prices are keyed by address, so we need to find the matching symbol
					const priceEntry = Object.values(allPrices).find(p => p.symbol === symbol);
					
					if (priceEntry && priceEntry.price && priceEntry.price > 0) {
						prices[symbol] = priceEntry.price;
					} else {
						missingSymbols.push(symbol);
					}
				}
				
				// Log warnings for missing prices but don't fail
				if (missingSymbols.length > 0) {
					console.warn(`⚠️ Prices not found for: ${missingSymbols.join(', ')}`);
				}
				
				// If we got at least some prices, consider it a success
				if (Object.keys(prices).length > 0) {
					console.log(`✅ Successfully fetched ${Object.keys(prices).length} prices`);
					return prices;
				}
				
				throw new Error('No valid prices found for any requested tokens');
			} catch (error) {
				lastError = error;
				console.error(`❌ Price fetch attempt ${attempt} failed:`, error.message);
				
				// If this isn't the last attempt, wait before retrying (exponential backoff)
				if (attempt < maxRetries) {
					const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
					console.log(`⏳ Waiting ${delay}ms before retry...`);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}
		
		// All retries failed
		console.error('❌ All price fetch attempts failed');
		throw new Error(`Failed to fetch prices after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
	}

	/**
	 * Execute portfolio creation with token allocations
	 * This is called after the user confirms their allocations
	 * 
	 * @param {string} portfolioName - Portfolio name
	 * @param {Object} allocations - Token allocations { symbol: percentage }
	 * @param {number} totalValue - Total portfolio value
	 * @param {Object} prices - Current token prices
	 * @returns {Object} Portfolio holdings
	 */
	executePortfolioCreation(portfolioName, allocations, totalValue, prices) {
		// Validate allocations
		const validation = this.validateAllocations(allocations);
		if (!validation.valid) {
			throw new Error(`Invalid allocations: ${validation.errors.join(', ')}`);
		}
		
		// Calculate token amounts
		const holdings = this.calculateTokenAmounts(allocations, totalValue, prices);
		
		console.log(`✅ Portfolio ${portfolioName} created with ${Object.keys(holdings).length} tokens`);
		
		return holdings;
	}

	/**
	 * Calculate auto-distribute percentages for selected tokens
	 * 
	 * @param {string[]} selectedTokens - Array of token symbols
	 * @returns {Object} Equal allocations { symbol: percentage }
	 */
	autoDistribute(selectedTokens) {
		if (!selectedTokens || selectedTokens.length === 0) {
			throw new Error('No tokens selected for auto-distribute');
		}
		
		const percentage = 100 / selectedTokens.length;
		const allocations = {};
		
		for (const symbol of selectedTokens) {
			allocations[symbol] = percentage;
		}
		
		return allocations;
	}

	/**
	 * Calculate portfolio value from holdings and current prices
	 * 
	 * @param {Object} holdings - Portfolio holdings { symbol: { amount, ... } }
	 * @param {Object} currentPrices - Current token prices { symbol: price }
	 * @returns {number} Total portfolio value in USD
	 */
	calculatePortfolioValueFromHoldings(holdings, currentPrices) {
		let totalValue = 0;
		
		for (const [symbol, holding] of Object.entries(holdings)) {
			const currentPrice = currentPrices[symbol] || holding.currentPrice || holding.initialPrice;
			totalValue += holding.amount * currentPrice;
		}
		
		return totalValue;
	}

	/**
	 * Calculate profit/loss for a portfolio
	 * 
	 * @param {number} currentValue - Current portfolio value
	 * @param {number} initialDeposit - Initial deposit amount
	 * @returns {Object} P/L data { absolute, percentage }
	 */
	calculateProfitLossForPortfolio(currentValue, initialDeposit) {
		const profitLoss = currentValue - initialDeposit;
		const percentage = initialDeposit > 0 ? (profitLoss / initialDeposit) * 100 : 0;
		
		return {
			absolute: profitLoss,
			percentage
		};
	}
}

// Export singleton instance
export const simulationTradingService = new SimulationTradingService();
