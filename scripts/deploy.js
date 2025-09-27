import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PortfolioManager to Reactive Testnet...\n");
  console.log("🌐 Network:", network.name);
  console.log("⛽ Using testnet tokens for gas-free testing\n");

  // Get the contract factory
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");

  // Deploy the contract
  console.log("📋 Deploying PortfolioManager contract...");
  const portfolioManager = await PortfolioManager.deploy();
  await portfolioManager.waitForDeployment();

  console.log("✅ PortfolioManager deployed to:", await portfolioManager.getAddress());
  console.log("🔗 Transaction hash:", portfolioManager.deploymentTransaction().hash);

  // Deploy AutomationController for RCS trigger strategies
  console.log("\n🤖 Deploying AutomationController...");
  const Automation = await ethers.getContractFactory("AutomationController");
  // Use USDC (or stable) from supported tokens list (3rd in provided sample) as stable quote token
  const usdcAddress = supportedTokens.find(t => t.symbol === 'USDC')?.address || supportedTokens[2].address;
  const automation = await Automation.deploy(await portfolioManager.getAddress(), usdcAddress);
  await automation.waitForDeployment();
  console.log("✅ AutomationController deployed to:", await automation.getAddress());
  console.log("🔗 Automation tx:", automation.deploymentTransaction().hash);

  // Define testnet mock tokens for percentage-based trading simulation
  const supportedTokens = [
    // Mock Major Cryptocurrencies (Testnet)
    {
      name: "Mock Bitcoin",
      symbol: "mBTC",
      address: "0x1111111111111111111111111111111111111111", // Mock testnet address
      category: 3, // BTC
      basePrice: 45000, // Starting price in USD
      volatility: 0.05 // 5% daily volatility
    },
    {
      name: "Mock Ethereum",
      symbol: "mETH", 
      address: "0x2222222222222222222222222222222222222222", // Mock testnet address
      category: 0, // ALTCOIN
      basePrice: 2800,
      volatility: 0.04
    },
    // Mock Stablecoins
    {
      name: "Mock USD Coin",
      symbol: "mUSDC",
      address: "0x3333333333333333333333333333333333333333", // Mock testnet address
      category: 2, // STABLECOIN
      basePrice: 1.00,
      volatility: 0.001 // Very low volatility for stablecoin
    },
    {
      name: "Mock Tether",
      symbol: "mUSDT",
      address: "0x4444444444444444444444444444444444444444", // Mock testnet address
      category: 2, // STABLECOIN
      basePrice: 1.00,
      volatility: 0.001
    },
    // Mock Popular Altcoins
    {
      name: "Mock Chainlink",
      symbol: "mLINK",
      address: "0x5555555555555555555555555555555555555555", // Mock testnet address
      category: 0, // ALTCOIN
      basePrice: 15.50,
      volatility: 0.06
    },
    {
      name: "Mock Solana",
      symbol: "mSOL",
      address: "0x6666666666666666666666666666666666666666",
      category: 0, // ALTCOIN
      basePrice: 95.00,
      volatility: 0.07
    },
    {
      name: "Mock Cardano",
      symbol: "mADA",
      address: "0x7777777777777777777777777777777777777777",
      category: 0, // ALTCOIN
      basePrice: 0.45,
      volatility: 0.05
    },
    // Mock Memecoins (higher volatility)
    {
      name: "Mock Dogecoin",
      symbol: "mDOGE",
      address: "0x8888888888888888888888888888888888888888",
      category: 1, // MEMECOIN
      basePrice: 0.08,
      volatility: 0.12 // High volatility for memecoin
    },
    {
      name: "Mock Shiba Inu", 
      symbol: "mSHIB",
      address: "0x9999999999999999999999999999999999999999",
      category: 1, // MEMECOIN
      basePrice: 0.000012,
      volatility: 0.15 // Very high volatility
    }
  ];

  console.log("\n📝 Adding supported tokens...");

  // Note: In production, you should add tokens one by one and handle errors
  // For demo purposes, we'll add a few sample tokens
  const sampleTokens = supportedTokens.slice(0, 5); // Add first 5 tokens

  for (const token of sampleTokens) {
    try {
      console.log(`🪙 Adding ${token.name} (${token.symbol})...`);
      const tx = await portfolioManager.addSupportedToken(
        token.address,
        token.symbol,
        token.category
      );
      await tx.wait();
      console.log(`   ✅ ${token.symbol} added successfully`);
    } catch (error) {
      console.log(`   ❌ Failed to add ${token.symbol}:`, error.message);
    }
  }

  console.log("\n📊 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Contract:", "PortfolioManager");
  console.log("Address:", portfolioManager.address);
  console.log("Network:", network.name);
  console.log("Owner:", await portfolioManager.owner());
  
  const supportedTokensList = await portfolioManager.getSupportedTokens();
  console.log("Supported Tokens:", supportedTokensList.length);

  console.log("\n🔧 Next Steps:");
  console.log("1. Verify the contract on Reactive testnet explorer");
  console.log("2. Update frontend with the contract address");
  console.log("3. Configure MetaMask for Reactive testnet (get free test tokens)");
  console.log("4. Set up webhook endpoint for automated triggers");
  console.log("5. Test percentage-based price movements");

  console.log("\n💡 Testnet Features:");
  console.log("- Mock tokens with simulated price movements");
  console.log("- Percentage-based trading (no real swaps)");
  console.log("- Webhook-triggered contract reactions");
  console.log("- Free testnet gas for all transactions");

  console.log("\n🔗 Webhook Endpoints:");
  console.log("- Price trigger: POST /api/trigger-price-action");
  console.log("- Stop loss: POST /api/trigger-stop-loss");
  console.log("- Take profit: POST /api/trigger-take-profit");
  console.log("- Rebalance: POST /api/trigger-rebalance");

  // Save deployment info
  const deploymentInfo = {
    portfolioManager: {
      contractName: "PortfolioManager",
      contractAddress: await portfolioManager.getAddress(),
      deploymentTransaction: portfolioManager.deploymentTransaction().hash
    },
    automationController: {
      contractName: "AutomationController",
      contractAddress: await automation.getAddress(),
      deploymentTransaction: automation.deploymentTransaction().hash
    },
    network: network.name,
    deployedAt: new Date().toISOString(),
    owner: await portfolioManager.owner(),
    supportedTokensCount: supportedTokensList.length
  };

  console.log("\n💾 Saving deployment info to deployments.json...");
  const fs = require("fs");
  const deployments = fs.existsSync("deployments.json") 
    ? JSON.parse(fs.readFileSync("deployments.json")) 
    : {};
  
  deployments[network.name] = deploymentInfo;
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
  
  console.log("✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
