/**
 * Simulation Trading Service
 * Handles all mock trading operations without blockchain interactions
 * Uses price data to calculate profits, losses, and portfolio values
 */

class SimulationTradingService {
	constructor() {
		this.STORAGE_KEY = 'simulation_portfolio';
		this.INITIAL_BALANCE = 10000; // $10,000 starting balance
	}

	/**
	 * Initialize or get simulation portfolio
	 */
	getPortfolio() {
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
		localStorage.removeItem(this.STORAGE_KEY);
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
}

// Export singleton instance
export const simulationTradingService = new SimulationTradingService();
