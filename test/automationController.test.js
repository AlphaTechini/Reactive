import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * Minimal test of AutomationController strategy lifecycle & evaluate path.
 * NOTE: EnhancedPortfolioManager not wired for automated swap custody; we test event emission logic only.
 */

describe('AutomationController', function () {
  let owner, user, operator;
  let portfolio; // mock minimal portfolio returning configurable price
  let automation;
  let mockToken;

  beforeEach(async () => {
    [owner, user, operator] = await ethers.getSigners();

    // Deploy mock token
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    mockToken = await ERC20Mock.deploy('Test Token', 'TT', user.address, ethers.parseEther('1000'));
    await mockToken.waitForDeployment();

    // Deploy mock portfolio (simple price storage + interface subset)
    const PortfolioMock = await ethers.getContractFactory('PortfolioPriceMock');
    portfolio = await PortfolioMock.deploy();
    await portfolio.waitForDeployment();

    // Set initial price (18 decimals) = $10
    await portfolio.setPrice(mockToken.target, ethers.parseEther('10'));

    // Deploy automation controller
    const Automation = await ethers.getContractFactory('AutomationController');
    automation = await Automation.deploy(portfolio.target, ethers.ZeroAddress);
    await automation.waitForDeployment();

    // Authorize operator
    await automation.connect(owner).setOperator(operator.address, true);

    // User approves controller to move tokens (simulate partial allowance)
    await mockToken.connect(user).approve(automation.target, ethers.parseEther('500'));
  });

  it('sets and reads a strategy', async () => {
    await automation.connect(user).setStrategy(
      mockToken.target,
      500, // 5% stop-loss
      800, // 8% take-profit
      300, // cooldown
      10000, // sellPortion 100%
      200, // slippage 2%
      true
    );

    const s = await automation.getStrategy(user.address, mockToken.target);
    expect(s.enabled).to.eq(true);
    expect(s.stopLossBps).to.eq(500);
    expect(s.takeProfitBps).to.eq(800);
    expect(s.entryPrice).to.gt(0);
  });

  it('emits StrategyExecuted on take-profit trigger', async () => {
    // Set strategy with TP 10%
    await automation.connect(user).setStrategy(
      mockToken.target,
      0,
      1000, // 10%
      60,
      10000,
      200,
      true
    );
    const sBefore = await automation.getStrategy(user.address, mockToken.target);
    const entry = sBefore.entryPrice;

    // Raise price +12%
    const newPrice = entry + (entry * 12n / 100n);
    await portfolio.setPrice(mockToken.target, newPrice);

    await expect(automation.connect(operator).evaluate(user.address, mockToken.target))
      .to.emit(automation, 'StrategyExecuted')
      .withArgs(user.address, mockToken.target, newPrice, 'TAKE_PROFIT', anyValue);
  });

  it('emits StrategyExecuted on stop-loss trigger', async () => {
    await automation.connect(user).setStrategy(
      mockToken.target,
      1000, // 10% stop-loss
      0,
      60,
      10000,
      200,
      true
    );
    const sBefore = await automation.getStrategy(user.address, mockToken.target);
    const entry = sBefore.entryPrice;

    // Drop price -15%
    const newPrice = entry - (entry * 15n / 100n);
    await portfolio.setPrice(mockToken.target, newPrice);

    await expect(automation.connect(operator).evaluate(user.address, mockToken.target))
      .to.emit(automation, 'StrategyExecuted')
      .withArgs(user.address, mockToken.target, newPrice, 'STOP_LOSS', anyValue);
  });
});
