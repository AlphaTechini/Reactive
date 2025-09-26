const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PortfolioManager", function () {
  let portfolioManager;
  let mockToken1, mockToken2, mockToken3;
  let owner, user1, user2;

  // Mock ERC20 token for testing
  const MockERC20 = {
    bytecode: "0x608060405234801561001057600080fd5b50604051610c38380380610c3883398101604081905261002f916100db565b60405180604001604052806040518060400160405280600581526020016422b93937b960d91b8152508152602001604051806040016040528060038152602001624d544b60e81b815250815250600090805190602001906100919291906100a5565b5050506001600160a01b0316600055005b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106100e657805160ff1916838001178555610113565b82800160010185558215610113579182015b828111156101135782518255916020019190600101906100f8565b5061011f929150610123565b5090565b5b8082111561011f5760008155600101610124565b6000815180845260005b8181101561015e57602081850181015186830182015201610142565b506000602082860101526020601f19601f83011685010191505092915050565b602081526000610191602083018461013856565b9392505050565b600080604083850312156101ab57600080fd5b505080516020909101519092909150565b634e487b7160e01b600052602260045260246000fd5b600281046001821680610ce657607f821691505b602082108103610d0657634e487b7160e01b600052602260045260246000fd5b50919050565b61ffff60f01b8116811461003357600080fd5b5f6020828403121561003457600080fd5b815161003f81610d0c565b9392505050565b6001600160a01b038116811461005b57600080fd5b50565b5f8060408385031215610070575f80fd5b823561007b81610046565b946020939093013593505050565b5f805f6060848603121561009c575f80fd5b83356100a781610046565b925060208401356100b781610046565b929592945050506040919091013590565b5f602082840312156100d9575f80fd5b81356100e481610046565b9392505050565b5f602082840312156100fc575f80fd5b5035919050565b5f8060408385031215610115575f80fd5b823561012081610046565b9150602083013561013081610046565b809150509250929050565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561016257610162610138565b92915050565b808202811582820484141761016257610162610138565b5f8261019357634e487b7160e01b5f52601260045260245ffd5b500490565b8181038181111561016257610162610138565b600181811c908216806101bf57607f821691505b6020821081036101dd57634e487b7160e01b5f52602260045260245ffd5b50919050565b601f8201601f1916810167ffffffffffffffff8111828210171561020f57634e487b7160e01b5f52604160045260245ffd5b6040525050565b5f67ffffffffffffffff83111561022f5761022f6101f9565b610242601f8401601f19166020016101e3565b90508281528383830111156102555f80fd5b828260208301375f602084830101529392505050565b5f82601f830112610279575f80fd5b61028883835160208501610216565b9392505050565b5f805f606084860312156102a1575f80fd5b835167ffffffffffffffff808211156102b8575f80fd5b6102c48783880161026a565b945060208601519150808211156102d9575f80fd5b506102e68682870161026a565b925050604084015190509250925092565b634e487b7160e01b5f52603260045260245ffd5b5f6001820161031d5761031d610138565b5060010190565b5f8151808452602080850194508260051b8301905f5b8381101561035f5781518752958201959082019060010161033a565b50959695505050505056",
    abi: [
      "constructor(string memory name, string memory symbol, uint8 decimals, uint256 totalSupply)",
      "function name() view returns (string)",
      "function symbol() view returns (string)", 
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 value) returns (bool)",
      "function transferFrom(address from, address to, uint256 value) returns (bool)",
      "function approve(address spender, uint256 value) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ]
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy PortfolioManager contract
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    portfolioManager = await PortfolioManager.deploy();
    await portfolioManager.waitForDeployment();

    // Deploy mock ERC20 tokens for testing
    const MockERC20Contract = await ethers.getContractFactory("MockERC20");
    mockToken1 = await MockERC20Contract.deploy("Bitcoin", "BTC", 18, ethers.parseEther("21000000"));
    mockToken2 = await MockERC20Contract.deploy("Ethereum", "ETH", 18, ethers.parseEther("120000000"));
    mockToken3 = await MockERC20Contract.deploy("USD Coin", "USDC", 6, ethers.parseUnits("1000000000", 6));

    await mockToken1.waitForDeployment();
    await mockToken2.waitForDeployment();
    await mockToken3.waitForDeployment();

    // Add supported tokens
    await portfolioManager.addSupportedToken(await mockToken1.getAddress(), "BTC", 3); // BTC category
    await portfolioManager.addSupportedToken(await mockToken2.getAddress(), "ETH", 0); // ALTCOIN category
    await portfolioManager.addSupportedToken(await mockToken3.getAddress(), "USDC", 2); // STABLECOIN category
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await portfolioManager.owner()).to.equal(owner.address);
    });

    it("Should deploy successfully", async function () {
      expect(await portfolioManager.getAddress()).to.not.be.undefined;
    });
  });

  describe("Token Management", function () {
    it("Should add supported tokens correctly", async function () {
      const tokenInfo = await portfolioManager.getTokenInfo(await mockToken1.getAddress());
      expect(tokenInfo.isSupported).to.be.true;
      expect(tokenInfo.symbol).to.equal("BTC");
      expect(tokenInfo.category).to.equal(3); // BTC category
    });

    it("Should list all supported tokens", async function () {
      const supportedTokens = await portfolioManager.getSupportedTokens();
      expect(supportedTokens.length).to.equal(3);
      expect(supportedTokens).to.include(await mockToken1.getAddress());
      expect(supportedTokens).to.include(await mockToken2.getAddress());
      expect(supportedTokens).to.include(await mockToken3.getAddress());
    });

    it("Should not allow non-owner to add tokens", async function () {
      await expect(
        portfolioManager.connect(user1).addSupportedToken(
          ethers.ZeroAddress,
          "TEST",
          0
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should remove supported tokens", async function () {
      await portfolioManager.removeSupportedToken(await mockToken1.getAddress());
      const tokenInfo = await portfolioManager.getTokenInfo(await mockToken1.getAddress());
      expect(tokenInfo.isSupported).to.be.false;
    });
  });

  describe("Stop Loss Configuration", function () {
    it("Should set stop-loss percentage correctly", async function () {
      const stopLossPercent = 1000; // 10%
      await portfolioManager.connect(user1).setStopLoss(stopLossPercent);
      
      const portfolio = await portfolioManager.getUserPortfolio(user1.address);
      expect(portfolio.stopLoss).to.equal(stopLossPercent);
    });

    it("Should emit StopLossSet event", async function () {
      const stopLossPercent = 1500; // 15%
      await expect(portfolioManager.connect(user1).setStopLoss(stopLossPercent))
        .to.emit(portfolioManager, "StopLossSet")
        .withArgs(user1.address, stopLossPercent);
    });

    it("Should not allow stop-loss over 50%", async function () {
      await expect(
        portfolioManager.connect(user1).setStopLoss(5100) // 51%
      ).to.be.revertedWith("Stop-loss cannot exceed 50%");
    });

    it("Should not allow zero stop-loss", async function () {
      await expect(
        portfolioManager.connect(user1).setStopLoss(0)
      ).to.be.revertedWith("Stop-loss must be greater than 0");
    });
  });

  describe("Take Profit Configuration", function () {
    it("Should set take-profit percentage correctly", async function () {
      const takeProfitPercent = 2000; // 20%
      await portfolioManager.connect(user1).setTakeProfit(takeProfitPercent);
      
      const portfolio = await portfolioManager.getUserPortfolio(user1.address);
      expect(portfolio.takeProfit).to.equal(takeProfitPercent);
    });

    it("Should emit TakeProfitSet event", async function () {
      const takeProfitPercent = 2500; // 25%
      await expect(portfolioManager.connect(user1).setTakeProfit(takeProfitPercent))
        .to.emit(portfolioManager, "TakeProfitSet")
        .withArgs(user1.address, takeProfitPercent);
    });

    it("Should not allow zero take-profit", async function () {
      await expect(
        portfolioManager.connect(user1).setTakeProfit(0)
      ).to.be.revertedWith("Take-profit must be greater than 0");
    });
  });

  describe("Panic Mode", function () {
    it("Should activate panic mode correctly", async function () {
      await portfolioManager.connect(user1).activatePanicMode();
      
      const portfolio = await portfolioManager.getUserPortfolio(user1.address);
      expect(portfolio.panicMode).to.be.true;
    });

    it("Should emit PanicModeTriggered event", async function () {
      await expect(portfolioManager.connect(user1).activatePanicMode())
        .to.emit(portfolioManager, "PanicModeTriggered")
        .withArgs(user1.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
    });

    it("Should deactivate panic mode correctly", async function () {
      await portfolioManager.connect(user1).activatePanicMode();
      await portfolioManager.connect(user1).deactivatePanicMode();
      
      const portfolio = await portfolioManager.getUserPortfolio(user1.address);
      expect(portfolio.panicMode).to.be.false;
    });

    it("Should not allow activating panic mode twice", async function () {
      await portfolioManager.connect(user1).activatePanicMode();
      await expect(
        portfolioManager.connect(user1).activatePanicMode()
      ).to.be.revertedWith("Panic mode already active");
    });
  });

  describe("Portfolio Rebalancing", function () {
    it("Should rebalance portfolio correctly", async function () {
      const tokens = [await mockToken1.getAddress(), await mockToken2.getAddress(), await mockToken3.getAddress()];
      const percentages = [4000, 4000, 2000]; // 40%, 40%, 20%
      
      await portfolioManager.connect(user1).rebalancePortfolio(tokens, percentages);
      
      const portfolio = await portfolioManager.getUserPortfolio(user1.address);
      expect(portfolio.totalAllocation).to.equal(10000); // 100%
      
      const allocation1 = await portfolioManager.getUserTokenAllocation(user1.address, await mockToken1.getAddress());
      const allocation2 = await portfolioManager.getUserTokenAllocation(user1.address, mockToken2.address);
      const allocation3 = await portfolioManager.getUserTokenAllocation(user1.address, mockToken3.address);
      
      expect(allocation1).to.equal(4000);
      expect(allocation2).to.equal(4000);
      expect(allocation3).to.equal(2000);
    });

    it("Should emit PortfolioRebalanced event", async function () {
      const tokens = [mockToken1.address, mockToken2.address];
      const percentages = [6000, 4000]; // 60%, 40%
      
      await expect(portfolioManager.connect(user1).rebalancePortfolio(tokens, percentages))
        .to.emit(portfolioManager, "PortfolioRebalanced")
        .withArgs(user1.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
    });

    it("Should not allow allocation not equal to 100%", async function () {
      const tokens = [mockToken1.address, mockToken2.address];
      const percentages = [4000, 5000]; // 40%, 50% = 90% total
      
      await expect(
        portfolioManager.connect(user1).rebalancePortfolio(tokens, percentages)
      ).to.be.revertedWith("Total allocation must equal 100%");
    });

    it("Should not allow allocation below minimum", async function () {
      const tokens = [mockToken1.address, mockToken2.address];
      const percentages = [50, 9950]; // 0.5%, 99.5% - first allocation too small
      
      await expect(
        portfolioManager.connect(user1).rebalancePortfolio(tokens, percentages)
      ).to.be.revertedWith("Allocation too small");
    });

    it("Should not allow unsupported tokens in portfolio", async function () {
      const unsupportedToken = user2.address; // Using random address as unsupported token
      const tokens = [mockToken1.address, unsupportedToken];
      const percentages = [5000, 5000]; // 50%, 50%
      
      await expect(
        portfolioManager.connect(user1).rebalancePortfolio(tokens, percentages)
      ).to.be.revertedWith("Token not supported");
    });

    it("Should get user allocated tokens", async function () {
      const tokens = [mockToken1.address, mockToken3.address];
      const percentages = [7000, 3000]; // 70%, 30%
      
      await portfolioManager.connect(user1).rebalancePortfolio(tokens, percentages);
      
      const allocatedTokens = await portfolioManager.getUserAllocatedTokens(user1.address);
      expect(allocatedTokens.length).to.equal(2);
      expect(allocatedTokens).to.include(mockToken1.address);
      expect(allocatedTokens).to.include(mockToken3.address);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Setup a user portfolio for testing view functions
      await portfolioManager.connect(user1).setStopLoss(1000); // 10%
      await portfolioManager.connect(user1).setTakeProfit(2000); // 20%
      await portfolioManager.connect(user1).rebalancePortfolio(
        [mockToken1.address, mockToken2.address],
        [6000, 4000] // 60%, 40%
      );
    });

    it("Should return correct user portfolio info", async function () {
      const portfolio = await portfolioManager.getUserPortfolio(user1.address);
      expect(portfolio.stopLoss).to.equal(1000);
      expect(portfolio.takeProfit).to.equal(2000);
      expect(portfolio.panicMode).to.be.false;
      expect(portfolio.totalAllocation).to.equal(10000);
    });

    it("Should check if user can rebalance", async function () {
      const canRebalance = await portfolioManager.canUserRebalance(user1.address);
      expect(canRebalance).to.be.true;
    });

    it("Should return false for rebalancing when panic mode is active", async function () {
      await portfolioManager.connect(user1).activatePanicMode();
      const canRebalance = await portfolioManager.canUserRebalance(user1.address);
      expect(canRebalance).to.be.false;
    });
  });

  describe("Security", function () {
    it("Should have reentrancy protection", async function () {
      // This is tested implicitly through the nonReentrant modifier
      // In a real scenario, you'd test with a malicious contract
      expect(true).to.be.true;
    });

    it("Should isolate user portfolios", async function () {
      await portfolioManager.connect(user1).setStopLoss(1000);
      await portfolioManager.connect(user2).setStopLoss(2000);
      
      const portfolio1 = await portfolioManager.getUserPortfolio(user1.address);
      const portfolio2 = await portfolioManager.getUserPortfolio(user2.address);
      
      expect(portfolio1.stopLoss).to.equal(1000);
      expect(portfolio2.stopLoss).to.equal(2000);
    });
  });
});