import { describe, it, expect, beforeEach } from 'vitest';
import { 
	createPortfolio, 
	depositToPortfolio,
	updatePortfolioAllocations,
	resetAllSimulation,
	simulationPortfolios,
	simulationBalance
} from './simulation.js';
import { get } from 'svelte/store';

describe('Deposit Distribution', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should distribute deposit based on current token percentages', () => {
		// Create a portfolio with $1000
		const portfolioName = 'Test Portfolio';
		createPortfolio(portfolioName, 'Test description', 1000);

		// Set up holdings with specific amounts
		// BTC: 0.025 BTC @ $40000 = $1000
		// ETH: 0.5 ETH @ $2000 = $1000
		// Total: $2000, so BTC = 50%, ETH = 50%
		const holdings = {
			BTC: {
				amount: 0.025,
				initialPrice: 40000,
				currentPrice: 40000,
				percentage: 50
			},
			ETH: {
				amount: 0.5,
				initialPrice: 2000,
				currentPrice: 2000,
				percentage: 50
			}
		};

		updatePortfolioAllocations(portfolioName, holdings);

		// Get initial state
		const initialPortfolios = get(simulationPortfolios);
		const initialBalance = get(simulationBalance);
		const initialPortfolio = initialPortfolios[portfolioName];
		
		// Verify initial state
		expect(initialPortfolio.currentValue).toBeCloseTo(2000, 1); // 1000 + 1000
		expect(initialPortfolio.initialDeposit).toBe(1000);
		expect(initialBalance).toBe(9000); // 10000 - 1000

		// Deposit $500
		const depositAmount = 500;
		const result = depositToPortfolio(portfolioName, depositAmount);

		// Get updated state
		const updatedPortfolios = get(simulationPortfolios);
		const updatedBalance = get(simulationBalance);
		const updatedPortfolio = updatedPortfolios[portfolioName];

		// Verify result
		expect(result.success).toBe(true);
		expect(result.amount).toBe(depositAmount);
		expect(result.newBalance).toBe(8500); // 9000 - 500

		// Verify balance was deducted
		expect(updatedBalance).toBe(8500);

		// Verify initial deposit remains unchanged
		expect(updatedPortfolio.initialDeposit).toBe(1000);

		// Verify deposit was distributed according to current percentages (50/50)
		// BTC should get 50% of $500 = $250 / $40000 = 0.00625 BTC
		// ETH should get 50% of $500 = $250 / $2000 = 0.125 ETH
		
		expect(updatedPortfolio.holdings.BTC.amount).toBeCloseTo(0.025 + 0.00625, 6);
		expect(updatedPortfolio.holdings.ETH.amount).toBeCloseTo(0.5 + 0.125, 6);

		// Verify portfolio value increased by deposit amount
		expect(updatedPortfolio.currentValue).toBeCloseTo(2000 + 500, 1);

		// Verify distribution details
		expect(result.distribution.BTC.usdValue).toBeCloseTo(250, 1);
		expect(result.distribution.ETH.usdValue).toBeCloseTo(250, 1);
	});

	it('should maintain token percentages after deposit', () => {
		// Create a portfolio
		const portfolioName = 'Percentage Test';
		createPortfolio(portfolioName, 'Test', 1000);

		// Set up holdings
		const holdings = {
			BTC: {
				amount: 0.025,
				initialPrice: 40000,
				currentPrice: 40000,
				percentage: 50
			},
			ETH: {
				amount: 0.5,
				initialPrice: 2000,
				currentPrice: 2000,
				percentage: 50
			}
		};

		updatePortfolioAllocations(portfolioName, holdings);

		// Deposit
		depositToPortfolio(portfolioName, 1000);

		// Get updated state
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios[portfolioName];

		// Calculate new percentages
		const btcValue = portfolio.holdings.BTC.amount * portfolio.holdings.BTC.currentPrice;
		const ethValue = portfolio.holdings.ETH.amount * portfolio.holdings.ETH.currentPrice;
		const totalValue = portfolio.currentValue;

		const btcPercentage = (btcValue / totalValue) * 100;
		const ethPercentage = (ethValue / totalValue) * 100;

		// Percentages should remain approximately the same (50/50)
		expect(btcPercentage).toBeCloseTo(50, 1);
		expect(ethPercentage).toBeCloseTo(50, 1);
	});

	it('should throw error if portfolio has no holdings', () => {
		// Create a portfolio without configuring holdings
		const portfolioName = 'Empty Portfolio';
		createPortfolio(portfolioName, 'Test', 1000);

		// Try to deposit without holdings
		expect(() => {
			depositToPortfolio(portfolioName, 500);
		}).toThrow('Portfolio has no holdings');
	});

	it('should throw error if deposit amount exceeds balance', () => {
		// Create a portfolio
		const portfolioName = 'Test Portfolio';
		createPortfolio(portfolioName, 'Test', 1000);

		// Set up holdings
		const holdings = {
			BTC: {
				amount: 0.025,
				initialPrice: 40000,
				currentPrice: 40000,
				percentage: 100
			}
		};

		updatePortfolioAllocations(portfolioName, holdings);

		// Try to deposit more than available balance
		expect(() => {
			depositToPortfolio(portfolioName, 10000); // Only 9000 available
		}).toThrow('Insufficient balance');
	});

	it('should keep initial deposit unchanged after multiple deposits', () => {
		// Create a portfolio
		const portfolioName = 'Multi Deposit Test';
		createPortfolio(portfolioName, 'Test', 1000);

		// Set up holdings
		const holdings = {
			BTC: {
				amount: 0.025,
				initialPrice: 40000,
				currentPrice: 40000,
				percentage: 100
			}
		};

		updatePortfolioAllocations(portfolioName, holdings);

		// Make multiple deposits
		depositToPortfolio(portfolioName, 500);
		depositToPortfolio(portfolioName, 300);
		depositToPortfolio(portfolioName, 200);

		// Get final state
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios[portfolioName];

		// Initial deposit should still be 1000
		expect(portfolio.initialDeposit).toBe(1000);

		// Current value should be initial + all deposits
		expect(portfolio.currentValue).toBeCloseTo(1000 + 500 + 300 + 200, 1);
	});
});
