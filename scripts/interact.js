const { ethers } = require("hardhat");

async function main() {
  console.log("🔗 Interacting with PortfolioManager contract...\n");

  // Load deployment info
  const fs = require("fs");
  let contractAddress;
  
  if (fs.existsSync("deployments.json")) {
    const deployments = JSON.parse(fs.readFileSync("deployments.json"));
    contractAddress = deployments[network.name]?.contractAddress;
  }

  if (!contractAddress) {
    console.log("❌ No deployment found for network:", network.name);
    console.log("Please deploy the contract first with: npm run deploy");
    process.exit(1);
  }

  console.log("📋 Contract Address:", contractAddress);

  // Get contract instance
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(contractAddress);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Interacting as:", signer.address);

  console.log("\n📊 Current Contract State:");
  console.log("=".repeat(40));

  // Get supported tokens
  const supportedTokens = await portfolioManager.getSupportedTokens();
  console.log("Supported Tokens:", supportedTokens.length);

  for (let i = 0; i < supportedTokens.length; i++) {
    const tokenInfo = await portfolioManager.getTokenInfo(supportedTokens[i]);
    const categoryNames = ["ALTCOIN", "MEMECOIN", "STABLECOIN", "BTC"];
    console.log(`  ${i + 1}. ${tokenInfo.symbol} - ${categoryNames[tokenInfo.category]}`);
  }

  // Get user's current portfolio
  console.log("\n👤 User Portfolio:");
  const userPortfolio = await portfolioManager.getUserPortfolio(signer.address);
  console.log("Stop Loss:", `${userPortfolio.stopLoss / 100}%`);
  console.log("Take Profit:", `${userPortfolio.takeProfit / 100}%`);
  console.log("Panic Mode:", userPortfolio.panicMode ? "ACTIVE" : "Inactive");
  console.log("Total Allocation:", `${userPortfolio.totalAllocation / 100}%`);

  const allocatedTokens = await portfolioManager.getUserAllocatedTokens(signer.address);
  if (allocatedTokens.length > 0) {
    console.log("\n💼 Current Allocations:");
    for (const tokenAddr of allocatedTokens) {
      const allocation = await portfolioManager.getUserTokenAllocation(signer.address, tokenAddr);
      const tokenInfo = await portfolioManager.getTokenInfo(tokenAddr);
      console.log(`  ${tokenInfo.symbol}: ${allocation / 100}%`);
    }
  } else {
    console.log("\n💼 No allocations set");
  }

  // Interactive menu
  console.log("\n🎛️  Available Actions:");
  console.log("1. Set Stop Loss");
  console.log("2. Set Take Profit");
  console.log("3. Activate Panic Mode");
  console.log("4. Deactivate Panic Mode");
  console.log("5. Rebalance Portfolio");
  console.log("6. Add New Token (Owner only)");
  console.log("7. Exit");

  // For demo purposes, let's show how to set a stop loss
  console.log("\n🔧 Demo: Setting Stop Loss to 15%...");
  
  try {
    const tx = await portfolioManager.setStopLoss(1500); // 15% in basis points
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Stop loss set successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check updated portfolio
    const updatedPortfolio = await portfolioManager.getUserPortfolio(signer.address);
    console.log("New stop loss:", `${updatedPortfolio.stopLoss / 100}%`);

  } catch (error) {
    console.log("❌ Failed to set stop loss:", error.message);
  }

  console.log("\n🔧 Demo: Setting Take Profit to 25%...");
  
  try {
    const tx = await portfolioManager.setTakeProfit(2500); // 25% in basis points
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Take profit set successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());

  } catch (error) {
    console.log("❌ Failed to set take profit:", error.message);
  }

  // Demo: Portfolio rebalancing (if tokens are available)
  if (supportedTokens.length >= 2) {
    console.log("\n🔧 Demo: Rebalancing Portfolio...");
    
    try {
      const tokens = supportedTokens.slice(0, 2); // Use first 2 tokens
      const allocations = [6000, 4000]; // 60%, 40%
      
      const tx = await portfolioManager.rebalancePortfolio(tokens, allocations);
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Portfolio rebalanced successfully!");
      console.log("Gas used:", receipt.gasUsed.toString());

      // Show new allocations
      console.log("\n💼 New Allocations:");
      for (let i = 0; i < tokens.length; i++) {
        const tokenInfo = await portfolioManager.getTokenInfo(tokens[i]);
        console.log(`  ${tokenInfo.symbol}: ${allocations[i] / 100}%`);
      }

    } catch (error) {
      console.log("❌ Failed to rebalance portfolio:", error.message);
    }
  }

  console.log("\n✨ Interaction completed!");
  console.log("\n🔗 Useful commands:");
  console.log("- View on explorer: [Add explorer URL]");
  console.log("- Connect frontend: Update contract address in frontend config");
  console.log("- Monitor events: Use event listeners for automation triggers");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });