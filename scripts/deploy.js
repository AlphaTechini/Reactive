import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PortfolioManager to Reactive Network...\n");

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

  // Define popular tokens for mainnet (you'll need to update these addresses)
  const supportedTokens = [
    // Major Cryptocurrencies
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // Ethereum mainnet WBTC
      category: 3 // BTC
    },
    {
      name: "Ethereum",
      symbol: "ETH", 
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      category: 0 // ALTCOIN
    },
    // Stablecoins
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xA0b86a33E6441b8FadB9c2FF932293e3dD4ff8cE", // Replace with actual Reactive Network USDC
      category: 2 // STABLECOIN
    },
    {
      name: "Tether",
      symbol: "USDT",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Replace with actual Reactive Network USDT
      category: 2 // STABLECOIN
    },
    // Popular Altcoins
    {
      name: "Chainlink",
      symbol: "LINK",
      address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", // Replace with actual addresses
      category: 0 // ALTCOIN
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      category: 0 // ALTCOIN
    },
    {
      name: "Polygon",
      symbol: "MATIC",
      address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
      category: 0 // ALTCOIN
    },
    {
      name: "Aave",
      symbol: "AAVE",
      address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
      category: 0 // ALTCOIN
    },
    {
      name: "Compound",
      symbol: "COMP",
      address: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
      category: 0 // ALTCOIN
    },
    {
      name: "Maker",
      symbol: "MKR",
      address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
      category: 0 // ALTCOIN
    },
    // Popular Memecoins (add real addresses for Reactive Network)
    {
      name: "Dogecoin",
      symbol: "DOGE",
      address: "0x4206931337dc273a630d328dA6441786BfaD668f", // Placeholder - update with real address
      category: 1 // MEMECOIN
    },
    {
      name: "Shiba Inu", 
      symbol: "SHIB",
      address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", // Placeholder
      category: 1 // MEMECOIN
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
  console.log("1. Verify the contract on the block explorer");
  console.log("2. Update frontend with the contract address");
  console.log("3. Add more tokens using addSupportedToken()");
  console.log("4. Configure your MetaMask to interact with the contract");

  console.log("\n💡 Contract Interaction:");
  console.log("- Set stop loss: setStopLoss(uint256 percent)");
  console.log("- Set take profit: setTakeProfit(uint256 percent)");
  console.log("- Activate panic mode: activatePanicMode()");
  console.log("- Rebalance portfolio: rebalancePortfolio(address[], uint256[])");

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
