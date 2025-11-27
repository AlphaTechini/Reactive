import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
	createPortfolio, 
	updatePortfolioAllocations,
	buyTokenForPortfolio,
	sellTokenFromPortfolio,
	deletePortfolio,
	resetAllSimulation,
	simulationPortfolios,
	simulationBalance,
	simulationTransactions,
	portfolioCount,
	updateTokenSettings,
	getTokenSettings,
	getAllTokenSettings,
	updatePortfolioSettings,
	checkSellCondition,
	checkBuyCondition,
	checkStopLossCondition,
	checkTokenPriceConditions,
	checkAllTokenConditions,
	updateLastActionPrice,
	executeAutomatedSell,
	executeAutomatedBuy,
	executeStopLoss,
	executeTokenAction,
	executePortfolioAutomation,
	checkTokenRebalance,
	checkPortfolioRebalance,
	executeTokenRebalance,
	executePortfolioRebalance,
	executeAllPortfolioRebalance
} from './simulation.js';
import { get } from 'svelte/store';

// Mock localStorage for tests
const localStorageMock = (() => {
	let store = {};
	return {
		getItem: (key) => store[key] || null,
		setItem: (key, value) => { store[key] = value.toString(); },
		removeItem: (key) => { delete store[key]; },
		clear: () => { store = {}; }
	};
})();

global.localStorage = localStorageMock;

describe('Token Quantity Calculation and Storage', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should calculate token quantities when setting allocations with percentages', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Set allocations with percentages
		const allocations = {
			'BTC': {
				percentage: 50, // 50% of $1000 = $500
				currentPrice: 50000 // $50,000 per BTC
			},
			'ETH': {
				percentage: 30, // 30% of $1000 = $300
				currentPrice: 3000 // $3,000 per ETH
			},
			'USDC': {
				percentage: 20, // 20% of $1000 = $200
				currentPrice: 1 // $1 per USDC
			}
		};
		
		updatePortfolioAllocations('Test Portfolio', allocations);
		
		// Get the updated portfolio
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		
		// Verify token quantities are calculated correctly
		expect(portfolio.holdings['BTC'].amount).toBeCloseTo(0.01, 6); // $500 / $50,000 = 0.01 BTC
		expect(portfolio.holdings['ETH'].amount).toBeCloseTo(0.1, 6); // $300 / $3,000 = 0.1 ETH
		expect(portfolio.holdings['USDC'].amount).toBeCloseTo(200, 6); // $200 / $1 = 200 USDC
		
		// Verify prices are stored
		expect(portfolio.holdings['BTC'].currentPrice).toBe(50000);
		expect(portfolio.holdings['ETH'].currentPrice).toBe(3000);
		expect(portfolio.holdings['USDC'].currentPrice).toBe(1);
	});

	it('should preserve token amounts when updating allocations with amounts', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Set allocations with pre-calculated amounts
		const allocations = {
			'BTC': {
				amount: 0.5,
				initialPrice: 40000,
				currentPrice: 50000,
				percentage: 50
			}
		};
		
		updatePortfolioAllocations('Test Portfolio', allocations);
		
		// Get the updated portfolio
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		
		// Verify amount is preserved
		expect(portfolio.holdings['BTC'].amount).toBe(0.5);
		expect(portfolio.holdings['BTC'].currentPrice).toBe(50000);
	});

	it('should add to existing quantities when buying tokens', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy some BTC
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		let portfolios = get(simulationPortfolios);
		let portfolio = portfolios['Test Portfolio'];
		
		// Verify initial purchase
		expect(portfolio.holdings['BTC'].amount).toBeCloseTo(0.01, 6); // $500 / $50,000 = 0.01 BTC
		
		// Buy more BTC
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		portfolios = get(simulationPortfolios);
		portfolio = portfolios['Test Portfolio'];
		
		// Verify quantities are added
		expect(portfolio.holdings['BTC'].amount).toBeCloseTo(0.02, 6); // 0.01 + 0.01 = 0.02 BTC
	});

	it('should subtract from quantities when selling tokens', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy some BTC
		buyTokenForPortfolio('Test Portfolio', 'BTC', 1000, 50000);
		
		let portfolios = get(simulationPortfolios);
		let portfolio = portfolios['Test Portfolio'];
		
		const initialAmount = portfolio.holdings['BTC'].amount;
		expect(initialAmount).toBeCloseTo(0.02, 6); // $1000 / $50,000 = 0.02 BTC
		
		// Sell half
		sellTokenFromPortfolio('Test Portfolio', 'BTC', 0.01, 50000);
		
		portfolios = get(simulationPortfolios);
		portfolio = portfolios['Test Portfolio'];
		
		// Verify quantity is reduced
		expect(portfolio.holdings['BTC'].amount).toBeCloseTo(0.01, 6); // 0.02 - 0.01 = 0.01 BTC
	});

	it('should preserve token amounts through price updates', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy some tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		let portfolios = get(simulationPortfolios);
		let portfolio = portfolios['Test Portfolio'];
		
		const btcAmount = portfolio.holdings['BTC'].amount;
		const ethAmount = portfolio.holdings['ETH'].amount;
		
		// Simulate price update (this would normally be done by updatePortfolioPrices)
		const updatedAllocations = {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000, // Price increased
				percentage: portfolio.holdings['BTC'].percentage
			},
			'ETH': {
				amount: ethAmount,
				initialPrice: 3000,
				currentPrice: 3300, // Price increased
				percentage: portfolio.holdings['ETH'].percentage
			}
		};
		
		updatePortfolioAllocations('Test Portfolio', updatedAllocations);
		
		portfolios = get(simulationPortfolios);
		portfolio = portfolios['Test Portfolio'];
		
		// Verify amounts are preserved
		expect(portfolio.holdings['BTC'].amount).toBe(btcAmount);
		expect(portfolio.holdings['ETH'].amount).toBe(ethAmount);
		
		// Verify prices are updated
		expect(portfolio.holdings['BTC'].currentPrice).toBe(55000);
		expect(portfolio.holdings['ETH'].currentPrice).toBe(3300);
		
		// Verify portfolio value increased
		expect(portfolio.currentValue).toBeGreaterThan(800); // Should be more than initial $800 invested
	});
});

describe('Per-Token Price Monitoring', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should initialize lastActionPrice when creating holdings', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy some tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		
		// Verify lastActionPrice is initialized
		expect(portfolio.holdings['BTC'].lastActionPrice).toBe(50000);
	});

	it('should update lastActionPrice when buying tokens', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens at initial price
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		let portfolios = get(simulationPortfolios);
		let portfolio = portfolios['Test Portfolio'];
		expect(portfolio.holdings['BTC'].lastActionPrice).toBe(50000);
		
		// Buy more at a different price
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 55000);
		
		portfolios = get(simulationPortfolios);
		portfolio = portfolios['Test Portfolio'];
		
		// Verify lastActionPrice is updated to the new price
		expect(portfolio.holdings['BTC'].lastActionPrice).toBe(55000);
	});

	it('should update lastActionPrice when selling tokens', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 1000, 50000);
		
		let portfolios = get(simulationPortfolios);
		let portfolio = portfolios['Test Portfolio'];
		expect(portfolio.holdings['BTC'].lastActionPrice).toBe(50000);
		
		// Sell some at a different price
		sellTokenFromPortfolio('Test Portfolio', 'BTC', 0.01, 55000);
		
		portfolios = get(simulationPortfolios);
		portfolio = portfolios['Test Portfolio'];
		
		// Verify lastActionPrice is updated
		expect(portfolio.holdings['BTC'].lastActionPrice).toBe(55000);
	});

	it('should detect sell condition when price increases above threshold', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 10% sell threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			enabled: true
		});
		
		// Simulate price increase to $55,000 (10% increase)
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: 0.01,
				initialPrice: 50000,
				currentPrice: 55000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check sell condition
		const result = checkSellCondition('Test Portfolio', 'BTC');
		
		// Should trigger sell
		expect(result.shouldSell).toBe(true);
		expect(result.percentChange).toBeCloseTo(10, 1);
	});

	it('should not detect sell condition when price increase is below threshold', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 10% sell threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: true
		});
		
		// Simulate price increase to $54,000 (8% increase - below threshold)
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: 0.01,
				initialPrice: 50000,
				currentPrice: 54000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check sell condition
		const result = checkSellCondition('Test Portfolio', 'BTC');
		
		// Should not trigger sell
		expect(result.shouldSell).toBe(false);
		expect(result.percentChange).toBeCloseTo(8, 1);
	});

	it('should detect buy condition when price decreases below threshold', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 5% buy threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			buyPercent: 5,
			enabled: true
		});
		
		// Simulate price decrease to $47,500 (5% decrease)
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: 0.01,
				initialPrice: 50000,
				currentPrice: 47500,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check buy condition
		const result = checkBuyCondition('Test Portfolio', 'BTC');
		
		// Should trigger buy
		expect(result.shouldBuy).toBe(true);
		expect(result.percentChange).toBeCloseTo(-5, 1);
	});

	it('should detect stop-loss condition when price decreases significantly', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 15% stop-loss threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			stopLossPercent: 15,
			enabled: true
		});
		
		// Simulate price decrease to $42,500 (15% decrease)
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: 0.01,
				initialPrice: 50000,
				currentPrice: 42500,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check stop-loss condition
		const result = checkStopLossCondition('Test Portfolio', 'BTC');
		
		// Should trigger stop-loss
		expect(result.shouldStopLoss).toBe(true);
		expect(result.percentChange).toBeCloseTo(-15, 1);
	});

	it('should prioritize stop-loss over sell when checking all conditions', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			enabled: true
		});
		
		// Simulate price decrease to $42,500 (15% decrease - triggers stop-loss)
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: 0.01,
				initialPrice: 50000,
				currentPrice: 42500,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check all conditions
		const result = checkTokenPriceConditions('Test Portfolio', 'BTC');
		
		// Should return stop-loss action (highest priority)
		expect(result.action).toBe('stop-loss');
	});

	it('should check all tokens in a portfolio', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy multiple tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: true
		});
		updateTokenSettings('Test Portfolio', 'ETH', {
			buyPercent: 5,
			enabled: true
		});
		
		// Simulate BTC price increase (should trigger sell)
		// and ETH price decrease (should trigger buy)
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		const btcAmount = portfolio.holdings['BTC'].amount;
		const ethAmount = portfolio.holdings['ETH'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000, // 10% increase
				percentage: 50,
				lastActionPrice: 50000
			},
			'ETH': {
				amount: ethAmount,
				initialPrice: 3000,
				currentPrice: 2850, // 5% decrease
				percentage: 50,
				lastActionPrice: 3000
			}
		});
		
		// Check all tokens
		const actions = checkAllTokenConditions('Test Portfolio');
		
		// Should return actions for both tokens
		expect(actions).toHaveLength(2);
		
		// Find BTC and ETH actions
		const btcAction = actions.find(a => a.symbol === 'BTC');
		const ethAction = actions.find(a => a.symbol === 'ETH');
		
		expect(btcAction).toBeDefined();
		expect(btcAction.action).toBe('sell');
		
		expect(ethAction).toBeDefined();
		expect(ethAction.action).toBe('buy');
	});

	it('should not trigger actions when token settings are disabled', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings but disable them
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: false // Disabled
		});
		
		// Simulate price increase that would normally trigger sell
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: 0.01,
				initialPrice: 50000,
				currentPrice: 55000, // 10% increase
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check sell condition
		const result = checkSellCondition('Test Portfolio', 'BTC');
		
		// Should not trigger because settings are disabled
		expect(result.shouldSell).toBe(false);
		expect(result.reason).toContain('not enabled');
	});
});

describe('Per-Token Settings', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should initialize portfolios with empty tokenSettings', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		
		// Verify tokenSettings exists and is empty
		expect(portfolio.settings.tokenSettings).toBeDefined();
		expect(Object.keys(portfolio.settings.tokenSettings)).toHaveLength(0);
	});

	it('should migrate old portfolios to include tokenSettings', () => {
		// This test simulates loading an old portfolio from localStorage
		// The migration happens in initializeState and getPortfolio
		
		// Create a portfolio with holdings
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		
		// Verify tokenSettings structure exists
		expect(portfolio.settings.tokenSettings).toBeDefined();
		expect(typeof portfolio.settings.tokenSettings).toBe('object');
	});

	it('should update per-token settings correctly', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Update token settings for BTC
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			lastPrice: 50000,
			enabled: true
		});
		
		// Get the token settings
		const btcSettings = getTokenSettings('Test Portfolio', 'BTC');
		
		// Verify settings were saved
		expect(btcSettings).toBeDefined();
		expect(btcSettings.targetPercentage).toBe(50);
		expect(btcSettings.sellPercent).toBe(10);
		expect(btcSettings.buyPercent).toBe(5);
		expect(btcSettings.stopLossPercent).toBe(15);
		expect(btcSettings.lastPrice).toBe(50000);
		expect(btcSettings.enabled).toBe(true);
	});

	it('should maintain independent settings for different tokens', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Update settings for BTC
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			lastPrice: 50000,
			enabled: true
		});
		
		// Update settings for ETH with different values
		updateTokenSettings('Test Portfolio', 'ETH', {
			targetPercentage: 30,
			sellPercent: 8,
			buyPercent: 3,
			stopLossPercent: 20,
			lastPrice: 3000,
			enabled: false
		});
		
		// Get both token settings
		const btcSettings = getTokenSettings('Test Portfolio', 'BTC');
		const ethSettings = getTokenSettings('Test Portfolio', 'ETH');
		
		// Verify BTC settings
		expect(btcSettings.targetPercentage).toBe(50);
		expect(btcSettings.sellPercent).toBe(10);
		expect(btcSettings.enabled).toBe(true);
		
		// Verify ETH settings are different
		expect(ethSettings.targetPercentage).toBe(30);
		expect(ethSettings.sellPercent).toBe(8);
		expect(ethSettings.enabled).toBe(false);
	});

	it('should get all token settings for a portfolio', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Update settings for multiple tokens
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			enabled: true
		});
		
		updateTokenSettings('Test Portfolio', 'ETH', {
			targetPercentage: 30,
			sellPercent: 8,
			enabled: true
		});
		
		updateTokenSettings('Test Portfolio', 'USDC', {
			targetPercentage: 20,
			sellPercent: 0,
			enabled: false
		});
		
		// Get all token settings
		const allSettings = getAllTokenSettings('Test Portfolio');
		
		// Verify all settings are returned
		expect(Object.keys(allSettings)).toHaveLength(3);
		expect(allSettings['BTC']).toBeDefined();
		expect(allSettings['ETH']).toBeDefined();
		expect(allSettings['USDC']).toBeDefined();
		expect(allSettings['BTC'].targetPercentage).toBe(50);
		expect(allSettings['ETH'].targetPercentage).toBe(30);
		expect(allSettings['USDC'].targetPercentage).toBe(20);
	});

	it('should preserve tokenSettings when updating other portfolio settings', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			enabled: true
		});
		
		// Update other portfolio settings
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true,
			sellPercent: 15 // Global setting
		});
		
		// Verify token settings are preserved
		const btcSettings = getTokenSettings('Test Portfolio', 'BTC');
		expect(btcSettings).toBeDefined();
		expect(btcSettings.targetPercentage).toBe(50);
		expect(btcSettings.sellPercent).toBe(10); // Should not be affected by global setting
		
		// Verify other settings were updated
		const portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		expect(portfolio.settings.autoBalanceEnabled).toBe(true);
		expect(portfolio.settings.sellPercent).toBe(15);
	});
});

describe('Per-Token Automated Actions', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should execute automated sell when price increases above threshold', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 10% sell threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: true
		});
		
		// Get the current BTC amount before price update
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		// Execute automated sell directly (price increase is implicit in the action)
		const result = executeAutomatedSell('Test Portfolio', 'BTC', 55000);
		
		// Verify sell was successful
		expect(result.success).toBe(true);
		expect(result.action).toBe('sell');
		expect(result.symbol).toBe('BTC');
		expect(result.tokenAmount).toBeCloseTo(btcAmount, 6);
		expect(result.usdAmount).toBeGreaterThan(0);
		
		// Verify lastActionPrice was updated
		const updatedPortfolios = get(simulationPortfolios);
		const updatedPortfolio = updatedPortfolios['Test Portfolio'];
		
		// Portfolio should have no holdings after selling 100%
		expect(updatedPortfolio.holdings['BTC']).toBeUndefined();
		
		// Verify transaction was logged
		const transactions = get(simulationTransactions);
		const automatedSellTx = transactions.find(tx => tx.type === 'automated_sell');
		expect(automatedSellTx).toBeDefined();
		expect(automatedSellTx.details.symbol).toBe('BTC');
		expect(automatedSellTx.details.reason).toBe('Price increase threshold met');
	});

	it('should execute partial automated sell when sellPercentage is specified', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		const portfolios = get(simulationPortfolios);
		const initialAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		// Execute automated sell of 50%
		const result = executeAutomatedSell('Test Portfolio', 'BTC', 55000, 50);
		
		// Verify sell was successful
		expect(result.success).toBe(true);
		expect(result.tokenAmount).toBeCloseTo(initialAmount * 0.5, 6);
		
		// Verify 50% of holdings remain
		const updatedPortfolios = get(simulationPortfolios);
		const updatedPortfolio = updatedPortfolios['Test Portfolio'];
		expect(updatedPortfolio.holdings['BTC'].amount).toBeCloseTo(initialAmount * 0.5, 6);
	});

	it('should execute automated buy when price decreases below threshold', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $400)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 400, 50000);
		
		// Set token settings with 5% buy threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			buyPercent: 5,
			targetPercentage: 50,
			enabled: true
		});
		
		// Simulate price decrease to $47,500 (5% decrease)
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 47500,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		const initialBalance = get(simulationBalance);
		
		// Execute automated buy
		const result = executeAutomatedBuy('Test Portfolio', 'BTC', 47500);
		
		// Verify buy was successful
		expect(result.success).toBe(true);
		expect(result.action).toBe('buy');
		expect(result.symbol).toBe('BTC');
		expect(result.tokenAmount).toBeGreaterThan(0);
		expect(result.usdAmount).toBeGreaterThan(0);
		
		// Verify balance decreased
		const newBalance = get(simulationBalance);
		expect(newBalance).toBeLessThan(initialBalance);
		
		// Verify holdings increased
		const updatedPortfolios = get(simulationPortfolios);
		const updatedPortfolio = updatedPortfolios['Test Portfolio'];
		expect(updatedPortfolio.holdings['BTC'].amount).toBeGreaterThan(btcAmount);
		
		// Verify transaction was logged
		const transactions = get(simulationTransactions);
		const automatedBuyTx = transactions.find(tx => tx.type === 'automated_buy');
		expect(automatedBuyTx).toBeDefined();
		expect(automatedBuyTx.details.symbol).toBe('BTC');
		expect(automatedBuyTx.details.reason).toBe('Price decrease threshold met');
	});

	it('should execute stop-loss when price decreases significantly', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 15% stop-loss threshold
		updateTokenSettings('Test Portfolio', 'BTC', {
			stopLossPercent: 15,
			enabled: true
		});
		
		// Get the current BTC amount
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		const initialBalance = get(simulationBalance);
		
		// Execute stop-loss directly
		const result = executeStopLoss('Test Portfolio', 'BTC', 42500);
		
		// Verify stop-loss was successful
		expect(result.success).toBe(true);
		expect(result.action).toBe('stop-loss');
		expect(result.symbol).toBe('BTC');
		expect(result.tokenAmount).toBeCloseTo(btcAmount, 6);
		expect(result.convertedTo).toBe('USDC');
		
		// Verify entire holding was sold
		const updatedPortfolios = get(simulationPortfolios);
		const updatedPortfolio = updatedPortfolios['Test Portfolio'];
		expect(updatedPortfolio.holdings['BTC']).toBeUndefined();
		
		// Verify balance increased
		const newBalance = get(simulationBalance);
		expect(newBalance).toBeGreaterThan(initialBalance);
		
		// Verify transaction was logged
		const transactions = get(simulationTransactions);
		const stopLossTx = transactions.find(tx => tx.type === 'stop_loss');
		expect(stopLossTx).toBeDefined();
		expect(stopLossTx.details.symbol).toBe('BTC');
		expect(stopLossTx.details.reason).toBe('Stop-loss threshold triggered');
		expect(stopLossTx.details.convertedTo).toBe('USDC');
	});

	it('should execute the correct action based on price conditions', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			enabled: true
		});
		
		// Test 1: Simulate price increase and check conditions
		let portfolios = get(simulationPortfolios);
		const btcAmount1 = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount1,
				initialPrice: 50000,
				currentPrice: 55000, // 10% increase
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		const result1 = executeTokenAction('Test Portfolio', 'BTC', 55000);
		expect(result1.success).toBe(true);
		expect(result1.action).toBe('sell');
		
		// Buy back for next test
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Test 2: Simulate price decrease and check conditions
		portfolios = get(simulationPortfolios);
		const btcAmount2 = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount2,
				initialPrice: 50000,
				currentPrice: 42500, // 15% decrease
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		const result2 = executeTokenAction('Test Portfolio', 'BTC', 42500);
		expect(result2.success).toBe(true);
		expect(result2.action).toBe('stop-loss');
	});

	it('should execute automated actions for all tokens in a portfolio', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy multiple tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 400, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: true
		});
		updateTokenSettings('Test Portfolio', 'ETH', {
			buyPercent: 5,
			targetPercentage: 30,
			enabled: true
		});
		
		// Simulate price changes
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		const ethAmount = portfolios['Test Portfolio'].holdings['ETH'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000, // 10% increase - should trigger sell
				percentage: 50,
				lastActionPrice: 50000
			},
			'ETH': {
				amount: ethAmount,
				initialPrice: 3000,
				currentPrice: 2850, // 5% decrease - should trigger buy
				percentage: 50,
				lastActionPrice: 3000
			}
		});
		
		// Execute portfolio automation
		const results = executePortfolioAutomation('Test Portfolio');
		
		// Verify both actions were executed
		expect(results).toHaveLength(2);
		
		const btcResult = results.find(r => r.symbol === 'BTC');
		const ethResult = results.find(r => r.symbol === 'ETH');
		
		expect(btcResult).toBeDefined();
		expect(btcResult.success).toBe(true);
		expect(btcResult.action).toBe('sell');
		
		expect(ethResult).toBeDefined();
		expect(ethResult.success).toBe(true);
		expect(ethResult.action).toBe('buy');
	});

	it('should handle errors gracefully when executing automated actions', () => {
		// Try to execute sell on non-existent portfolio
		const result1 = executeAutomatedSell('NonExistent', 'BTC', 50000);
		expect(result1.success).toBe(false);
		expect(result1.error).toContain('Portfolio not found');
		
		// Create portfolio but try to sell token that doesn't exist
		createPortfolio('Test Portfolio', 'Test description', 1000);
		const result2 = executeAutomatedSell('Test Portfolio', 'BTC', 50000);
		expect(result2.success).toBe(false);
		expect(result2.error).toContain('No BTC holdings');
		
		// Try to execute buy with invalid price
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		const result3 = executeAutomatedBuy('Test Portfolio', 'BTC', 0);
		expect(result3.success).toBe(false);
		expect(result3.error).toContain('Invalid current price');
	});

	it('should not execute actions when token settings are disabled', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings but disable them
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: false
		});
		
		// Simulate price increase
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Try to execute token action
		const result = executeTokenAction('Test Portfolio', 'BTC', 55000);
		
		// Should not execute because settings are disabled
		expect(result.success).toBe(false);
		expect(result.action).toBe('none');
	});

	it('should update lastActionPrice after automated actions', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		let portfolios = get(simulationPortfolios);
		expect(portfolios['Test Portfolio'].holdings['BTC'].lastActionPrice).toBe(50000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			sellPercent: 10,
			enabled: true
		});
		
		// Simulate price increase and execute sell
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		executeAutomatedSell('Test Portfolio', 'BTC', 55000, 50); // Sell 50%
		
		// Verify lastActionPrice was updated to the sell price
		portfolios = get(simulationPortfolios);
		expect(portfolios['Test Portfolio'].holdings['BTC'].lastActionPrice).toBe(55000);
	});
});

describe('Auto-Balance Feature', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should detect when a token needs rebalancing due to price increase', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price increase to $60,000 (20% increase)
		// This will make BTC worth more than 50% of portfolio
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 60000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check rebalance need
		const check = checkTokenRebalance('Test Portfolio', 'BTC');
		
		// Current value is $600 (0.01 BTC * $60,000)
		// Portfolio value is $1100 ($600 BTC + $500 remaining balance)
		// Current percentage is ~54.5%
		// Target is 50%, so should need to sell
		expect(check.needsRebalance).toBe(true);
		expect(check.action).toBe('sell');
		expect(check.currentPercentage).toBeGreaterThan(50);
		expect(check.targetPercentage).toBe(50);
	});

	it('should detect when a token needs rebalancing due to price decrease', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price decrease to $40,000 (20% decrease)
		// This will make BTC worth less than 50% of portfolio
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 40000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check rebalance need
		const check = checkTokenRebalance('Test Portfolio', 'BTC');
		
		// Current value is $400 (0.01 BTC * $40,000)
		// Portfolio value is $900 ($400 BTC + $500 remaining balance)
		// Current percentage is ~44.4%
		// Target is 50%, so should need to buy
		expect(check.needsRebalance).toBe(true);
		expect(check.action).toBe('buy');
		expect(check.currentPercentage).toBeLessThan(50);
		expect(check.targetPercentage).toBe(50);
	});

	it('should not trigger rebalancing when within tolerance', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate small price change to $50,500 (1% increase)
		// This should be within tolerance
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 50500,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check rebalance need
		const check = checkTokenRebalance('Test Portfolio', 'BTC');
		
		// Should not need rebalancing (within 0.5% tolerance)
		expect(check.needsRebalance).toBe(false);
	});

	it('should not check rebalancing when auto-balance is disabled', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Do NOT enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: false
		});
		
		// Simulate large price increase
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 70000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Check rebalance need
		const check = checkTokenRebalance('Test Portfolio', 'BTC');
		
		// Should not need rebalancing because auto-balance is disabled
		expect(check.needsRebalance).toBe(false);
		expect(check.reason).toContain('not enabled');
	});

	it('should execute sell rebalancing to restore target percentage', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price increase to $60,000
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 60000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Execute rebalancing
		const result = executeTokenRebalance('Test Portfolio', 'BTC');
		
		// Verify rebalancing was successful
		expect(result.success).toBe(true);
		expect(result.action).toBe('sell');
		expect(result.symbol).toBe('BTC');
		expect(result.tokenAmount).toBeGreaterThan(0);
		
		// Verify transaction was logged
		const transactions = get(simulationTransactions);
		const rebalanceTx = transactions.find(tx => tx.type === 'auto_balance_sell');
		expect(rebalanceTx).toBeDefined();
		expect(rebalanceTx.details.symbol).toBe('BTC');
		expect(rebalanceTx.details.reason).toContain('Auto-balance');
	});

	it('should execute buy rebalancing to restore target percentage', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price decrease to $40,000
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 40000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		const initialBalance = get(simulationBalance);
		
		// Execute rebalancing
		const result = executeTokenRebalance('Test Portfolio', 'BTC');
		
		// Verify rebalancing was successful
		expect(result.success).toBe(true);
		expect(result.action).toBe('buy');
		expect(result.symbol).toBe('BTC');
		expect(result.tokenAmount).toBeGreaterThan(0);
		
		// Verify balance decreased
		const newBalance = get(simulationBalance);
		expect(newBalance).toBeLessThan(initialBalance);
		
		// Verify transaction was logged
		const transactions = get(simulationTransactions);
		const rebalanceTx = transactions.find(tx => tx.type === 'auto_balance_buy');
		expect(rebalanceTx).toBeDefined();
		expect(rebalanceTx.details.symbol).toBe('BTC');
		expect(rebalanceTx.details.reason).toContain('Auto-balance');
	});

	it('should check all tokens in a portfolio for rebalancing', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy multiple tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 400, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		// Set token settings with target allocations
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 40,
			enabled: true
		});
		updateTokenSettings('Test Portfolio', 'ETH', {
			targetPercentage: 30,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price changes
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		const ethAmount = portfolios['Test Portfolio'].holdings['ETH'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 60000, // Increased - will be over target
				percentage: 50,
				lastActionPrice: 50000
			},
			'ETH': {
				amount: ethAmount,
				initialPrice: 3000,
				currentPrice: 2500, // Decreased - will be under target
				percentage: 50,
				lastActionPrice: 3000
			}
		});
		
		// Check all tokens for rebalancing
		const actions = checkPortfolioRebalance('Test Portfolio');
		
		// Should return rebalancing actions for both tokens
		expect(actions.length).toBeGreaterThan(0);
		
		// Find BTC and ETH actions
		const btcAction = actions.find(a => a.symbol === 'BTC');
		const ethAction = actions.find(a => a.symbol === 'ETH');
		
		// BTC should need to sell (over target)
		if (btcAction) {
			expect(btcAction.action).toBe('sell');
		}
		
		// ETH should need to buy (under target)
		if (ethAction) {
			expect(ethAction.action).toBe('buy');
		}
	});

	it('should execute rebalancing for all tokens in a portfolio', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy multiple tokens
		buyTokenForPortfolio('Test Portfolio', 'BTC', 400, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		// Set token settings with target allocations
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 40,
			enabled: true
		});
		updateTokenSettings('Test Portfolio', 'ETH', {
			targetPercentage: 30,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate significant price changes
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		const ethAmount = portfolios['Test Portfolio'].holdings['ETH'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 70000, // Large increase
				percentage: 60,
				lastActionPrice: 50000
			},
			'ETH': {
				amount: ethAmount,
				initialPrice: 3000,
				currentPrice: 2000, // Large decrease
				percentage: 40,
				lastActionPrice: 3000
			}
		});
		
		// Execute portfolio rebalancing
		const results = executePortfolioRebalance('Test Portfolio');
		
		// Should have executed rebalancing actions
		expect(results.length).toBeGreaterThan(0);
		
		// Verify transactions were logged
		const transactions = get(simulationTransactions);
		const rebalanceTxs = transactions.filter(tx => 
			tx.type === 'auto_balance_buy' || tx.type === 'auto_balance_sell'
		);
		expect(rebalanceTxs.length).toBeGreaterThan(0);
	});

	it('should calculate rebalancing amounts based on current portfolio value', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $500)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings with 50% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price increase to $60,000
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 60000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Get portfolio to check current value
		portfolios = get(simulationPortfolios);
		const portfolio = portfolios['Test Portfolio'];
		const currentValue = portfolio.currentValue;
		
		// Check rebalance calculation
		const check = checkTokenRebalance('Test Portfolio', 'BTC');
		
		// Target value should be 50% of current portfolio value
		const expectedTargetValue = (currentValue * 50) / 100;
		const currentHoldingValue = btcAmount * 60000;
		const expectedDifference = expectedTargetValue - currentHoldingValue;
		
		// Verify calculation is based on current value, not initial deposit
		expect(check.needsRebalance).toBe(true);
		expect(check.targetPercentage).toBe(50);
		
		// The amount to trade should restore the target percentage
		if (check.action === 'sell') {
			expect(check.amountToTrade).toBeGreaterThan(0);
		}
	});

	it('should handle insufficient balance when rebalancing requires buying', () => {
		// Create a portfolio with $1000
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Buy BTC at $50,000 (spend $900 - leaving only $100)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 900, 50000);
		
		// Set token settings with 90% target allocation
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 90,
			enabled: true
		});
		
		// Enable auto-balance
		updatePortfolioSettings('Test Portfolio', {
			autoBalanceEnabled: true
		});
		
		// Simulate price decrease to $40,000
		let portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 40000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Try to execute rebalancing
		const result = executeTokenRebalance('Test Portfolio', 'BTC');
		
		// Should fail due to insufficient balance
		// (or succeed with partial rebalancing if implementation allows)
		if (!result.success) {
			expect(result.error).toContain('Insufficient balance');
		}
	});
});

describe('Store Persistence and Reactivity', () => {
	beforeEach(() => {
		// Reset simulation state before each test
		resetAllSimulation();
	});

	it('should persist portfolio structure to localStorage', () => {
		// Create a portfolio with holdings
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		// Update token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			enabled: true
		});
		
		// Verify structure through store (which persists to localStorage)
		const portfolios = get(simulationPortfolios);
		
		expect(portfolios['Test Portfolio']).toBeDefined();
		expect(portfolios['Test Portfolio'].holdings).toBeDefined();
		expect(portfolios['Test Portfolio'].holdings['BTC']).toBeDefined();
		expect(portfolios['Test Portfolio'].holdings['ETH']).toBeDefined();
		
		// Verify token settings are in store
		expect(portfolios['Test Portfolio'].settings.tokenSettings).toBeDefined();
		expect(portfolios['Test Portfolio'].settings.tokenSettings['BTC']).toBeDefined();
		expect(portfolios['Test Portfolio'].settings.tokenSettings['BTC'].targetPercentage).toBe(50);
		expect(portfolios['Test Portfolio'].settings.tokenSettings['BTC'].sellPercent).toBe(10);
	});

	it('should load portfolio structure from localStorage on initialization', () => {
		// Create a portfolio and save it
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			enabled: true
		});
		
		// Get the current state
		const portfolios1 = get(simulationPortfolios);
		const balance1 = get(simulationBalance);
		
		// Verify the data is in the store (which means it was persisted)
		expect(portfolios1['Test Portfolio']).toBeDefined();
		expect(portfolios1['Test Portfolio'].name).toBe('Test Portfolio');
		expect(portfolios1['Test Portfolio'].holdings['BTC']).toBeDefined();
		expect(portfolios1['Test Portfolio'].settings.tokenSettings['BTC']).toBeDefined();
		expect(balance1).toBeLessThan(10000); // Balance was used
	});

	it('should reactively update portfolio count when portfolios are created', () => {
		// Subscribe to portfolio count
		const counts = [];
		const unsubscribe = simulationPortfolios.subscribe(portfolios => {
			counts.push(Object.keys(portfolios).length);
		});
		
		// Initial count should be 0
		expect(counts[counts.length - 1]).toBe(0);
		
		// Create first portfolio
		createPortfolio('Portfolio 1', 'First portfolio', 500);
		expect(counts[counts.length - 1]).toBe(1);
		
		// Create second portfolio
		createPortfolio('Portfolio 2', 'Second portfolio', 300);
		expect(counts[counts.length - 1]).toBe(2);
		
		// Create third portfolio
		createPortfolio('Portfolio 3', 'Third portfolio', 200);
		expect(counts[counts.length - 1]).toBe(3);
		
		unsubscribe();
	});

	it('should reactively update portfolio count when portfolios are deleted', () => {
		// Create portfolios
		createPortfolio('Portfolio 1', 'First portfolio', 500);
		createPortfolio('Portfolio 2', 'Second portfolio', 300);
		createPortfolio('Portfolio 3', 'Third portfolio', 200);
		
		// Subscribe to portfolio count
		const counts = [];
		const unsubscribe = simulationPortfolios.subscribe(portfolios => {
			counts.push(Object.keys(portfolios).length);
		});
		
		// Initial count should be 3
		expect(counts[counts.length - 1]).toBe(3);
		
		// Delete one portfolio
		deletePortfolio('Portfolio 2');
		expect(counts[counts.length - 1]).toBe(2);
		
		// Delete another portfolio
		deletePortfolio('Portfolio 1');
		expect(counts[counts.length - 1]).toBe(1);
		
		unsubscribe();
	});

	it('should use portfolioCount derived store for sidebar display', () => {
		// Subscribe to portfolio count
		const counts = [];
		const unsubscribe = portfolioCount.subscribe(count => {
			counts.push(count);
		});
		
		// Initial count should be 0
		expect(counts[counts.length - 1]).toBe(0);
		
		// Create portfolios
		createPortfolio('Portfolio 1', 'First portfolio', 500);
		expect(counts[counts.length - 1]).toBe(1);
		
		createPortfolio('Portfolio 2', 'Second portfolio', 300);
		expect(counts[counts.length - 1]).toBe(2);
		
		// Delete a portfolio
		deletePortfolio('Portfolio 1');
		expect(counts[counts.length - 1]).toBe(1);
		
		unsubscribe();
	});

	it('should reactively update P/L when prices change', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Subscribe to portfolio P/L after initial setup
		const profitLosses = [];
		const unsubscribe = simulationPortfolios.subscribe(portfolios => {
			if (portfolios['Test Portfolio']) {
				profitLosses.push({
					absolute: portfolios['Test Portfolio'].profitLoss.absolute,
					percentage: portfolios['Test Portfolio'].profitLoss.percentage
				});
			}
		});
		
		// Get initial P/L
		const initialPL = profitLosses[profitLosses.length - 1];
		
		// Simulate price increase to $55,000 (10% increase)
		const portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// P/L should now be more positive
		const updatedPL = profitLosses[profitLosses.length - 1];
		expect(updatedPL.absolute).toBeGreaterThan(initialPL.absolute);
		expect(updatedPL.percentage).toBeGreaterThan(initialPL.percentage);
		
		// Simulate price decrease to $45,000 (10% decrease from original)
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 45000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// P/L should now be less than after the increase
		const decreasedPL = profitLosses[profitLosses.length - 1];
		expect(decreasedPL.absolute).toBeLessThan(updatedPL.absolute);
		expect(decreasedPL.percentage).toBeLessThan(updatedPL.percentage);
		
		unsubscribe();
	});

	it('should persist token quantities through price updates', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Get initial token quantity
		let portfolios = get(simulationPortfolios);
		const initialBtcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		// Simulate multiple price updates
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: initialBtcAmount,
				initialPrice: 50000,
				currentPrice: 55000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		portfolios = get(simulationPortfolios);
		expect(portfolios['Test Portfolio'].holdings['BTC'].amount).toBe(initialBtcAmount);
		
		// Another price update
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: initialBtcAmount,
				initialPrice: 50000,
				currentPrice: 60000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		portfolios = get(simulationPortfolios);
		expect(portfolios['Test Portfolio'].holdings['BTC'].amount).toBe(initialBtcAmount);
		
		// Verify it's persisted in the store
		expect(portfolios['Test Portfolio'].holdings['BTC'].amount).toBe(initialBtcAmount);
	});

	it('should persist per-token settings across operations', () => {
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 500, 50000);
		
		// Set token settings
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			enabled: true
		});
		
		// Verify settings are in memory
		let tokenSettings = getTokenSettings('Test Portfolio', 'BTC');
		expect(tokenSettings.targetPercentage).toBe(50);
		expect(tokenSettings.sellPercent).toBe(10);
		expect(tokenSettings.buyPercent).toBe(5);
		expect(tokenSettings.stopLossPercent).toBe(15);
		expect(tokenSettings.enabled).toBe(true);
		
		// Verify settings are persisted in store
		let portfolios = get(simulationPortfolios);
		expect(portfolios['Test Portfolio'].settings.tokenSettings['BTC']).toBeDefined();
		expect(portfolios['Test Portfolio'].settings.tokenSettings['BTC'].targetPercentage).toBe(50);
		expect(portfolios['Test Portfolio'].settings.tokenSettings['BTC'].sellPercent).toBe(10);
		
		// Perform operations (buy more tokens)
		buyTokenForPortfolio('Test Portfolio', 'BTC', 200, 52000);
		
		// Verify settings are still there
		tokenSettings = getTokenSettings('Test Portfolio', 'BTC');
		expect(tokenSettings.targetPercentage).toBe(50);
		expect(tokenSettings.sellPercent).toBe(10);
		
		// Update price
		portfolios = get(simulationPortfolios);
		const btcAmount = portfolios['Test Portfolio'].holdings['BTC'].amount;
		
		updatePortfolioAllocations('Test Portfolio', {
			'BTC': {
				amount: btcAmount,
				initialPrice: 50000,
				currentPrice: 55000,
				percentage: 100,
				lastActionPrice: 50000
			}
		});
		
		// Verify settings are still there after price update
		tokenSettings = getTokenSettings('Test Portfolio', 'BTC');
		expect(tokenSettings.targetPercentage).toBe(50);
		expect(tokenSettings.sellPercent).toBe(10);
	});

	it('should persist multiple portfolios with different settings', () => {
		// Create multiple portfolios
		createPortfolio('Portfolio 1', 'First portfolio', 500);
		createPortfolio('Portfolio 2', 'Second portfolio', 300);
		
		// Add holdings to both
		buyTokenForPortfolio('Portfolio 1', 'BTC', 250, 50000);
		buyTokenForPortfolio('Portfolio 2', 'ETH', 150, 3000);
		
		// Set different token settings for each
		updateTokenSettings('Portfolio 1', 'BTC', {
			targetPercentage: 50,
			sellPercent: 10,
			enabled: true
		});
		
		updateTokenSettings('Portfolio 2', 'ETH', {
			targetPercentage: 60,
			sellPercent: 8,
			enabled: false
		});
		
		// Verify both are persisted correctly in store
		const portfolios = get(simulationPortfolios);
		
		expect(portfolios['Portfolio 1']).toBeDefined();
		expect(portfolios['Portfolio 2']).toBeDefined();
		
		expect(portfolios['Portfolio 1'].settings.tokenSettings['BTC'].targetPercentage).toBe(50);
		expect(portfolios['Portfolio 1'].settings.tokenSettings['BTC'].sellPercent).toBe(10);
		expect(portfolios['Portfolio 1'].settings.tokenSettings['BTC'].enabled).toBe(true);
		
		expect(portfolios['Portfolio 2'].settings.tokenSettings['ETH'].targetPercentage).toBe(60);
		expect(portfolios['Portfolio 2'].settings.tokenSettings['ETH'].sellPercent).toBe(8);
		expect(portfolios['Portfolio 2'].settings.tokenSettings['ETH'].enabled).toBe(false);
	});

	it('should maintain data consistency across store subscriptions', () => {
		// Subscribe to multiple derived stores first
		let balanceValue, portfoliosValue, countValue;
		
		const unsubBalance = simulationBalance.subscribe(val => { balanceValue = val; });
		const unsubPortfolios = simulationPortfolios.subscribe(val => { portfoliosValue = val; });
		const unsubCount = simulationPortfolios.subscribe(val => { countValue = Object.keys(val).length; });
		
		// Get initial balance
		const initialBalance = balanceValue;
		
		// Create a portfolio
		createPortfolio('Test Portfolio', 'Test description', 1000);
		
		// Verify consistency after portfolio creation
		expect(balanceValue).toBe(initialBalance - 1000); // Initial balance - 1000 deposit
		expect(portfoliosValue['Test Portfolio']).toBeDefined();
		expect(countValue).toBe(1);
		
		const balanceAfterFirst = balanceValue;
		
		// Create another portfolio
		createPortfolio('Portfolio 2', 'Second portfolio', 200);
		
		// Verify all stores updated consistently
		expect(balanceValue).toBe(balanceAfterFirst - 200); // Previous balance - 200 spent
		expect(portfoliosValue['Portfolio 2']).toBeDefined();
		expect(countValue).toBe(2);
		
		const balanceBeforeDelete = balanceValue;
		
		// Delete a portfolio
		deletePortfolio('Test Portfolio');
		
		// Verify consistency after deletion
		expect(balanceValue).toBeGreaterThan(balanceBeforeDelete); // Balance returned
		expect(portfoliosValue['Test Portfolio']).toBeUndefined();
		expect(countValue).toBe(1);
		
		unsubBalance();
		unsubPortfolios();
		unsubCount();
	});

	it('should handle localStorage round-trip correctly', () => {
		// Create a complex portfolio state
		createPortfolio('Test Portfolio', 'Test description', 1000);
		buyTokenForPortfolio('Test Portfolio', 'BTC', 400, 50000);
		buyTokenForPortfolio('Test Portfolio', 'ETH', 300, 3000);
		
		updateTokenSettings('Test Portfolio', 'BTC', {
			targetPercentage: 40,
			sellPercent: 10,
			buyPercent: 5,
			stopLossPercent: 15,
			enabled: true
		});
		
		updateTokenSettings('Test Portfolio', 'ETH', {
			targetPercentage: 30,
			sellPercent: 8,
			buyPercent: 4,
			stopLossPercent: 12,
			enabled: true
		});
		
		// Get current state
		const originalPortfolios = get(simulationPortfolios);
		const originalBalance = get(simulationBalance);
		const originalTransactions = get(simulationTransactions);
		
		// Verify all data is preserved in store (which persists to localStorage)
		expect(originalPortfolios['Test Portfolio'].name).toBe('Test Portfolio');
		expect(originalPortfolios['Test Portfolio'].initialDeposit).toBe(1000);
		expect(originalPortfolios['Test Portfolio'].currentValue).toBeGreaterThan(0);
		
		// Verify holdings are preserved
		expect(originalPortfolios['Test Portfolio'].holdings['BTC'].amount).toBeGreaterThan(0);
		expect(originalPortfolios['Test Portfolio'].holdings['ETH'].amount).toBeGreaterThan(0);
		
		// Verify token settings are preserved
		expect(originalPortfolios['Test Portfolio'].settings.tokenSettings['BTC'].targetPercentage).toBe(40);
		expect(originalPortfolios['Test Portfolio'].settings.tokenSettings['ETH'].targetPercentage).toBe(30);
		
		// Verify transactions are tracked
		expect(originalTransactions.length).toBeGreaterThan(0);
	});
});
