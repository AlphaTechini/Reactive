/**
 * Deployment Script for Enhanced Portfolio Management Contracts
 * 
 * Deploys:
 * - EnhancedPortfolioManager with optimized rebalancing and trailing stops
 * - AutomationController with new functionality
 * - Verifies contract integration with existing system
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Enhanced Portfolio Management Contract Deployment\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Step 1: Deploy EnhancedPortfolioManager
  console.log("📦 Deploying EnhancedPortfolioManager...");
  const EnhancedPortfolioManager = await hre.ethers.getContractFactory("EnhancedPortfolioManager");
  const portfolioManager = await EnhancedPortfolioManager.deploy();
  await portfolioManager.deployed();
  
  console.log("✅ EnhancedPortfolioManager deployed to:", portfolioManager.address);
  console.log("   Transaction hash:", portfolioManager.deployTransaction.hash, "\n");

  // Step 2: Deploy AutomationController
  console.log("📦 Deploying AutomationController...");
  const AutomationController = await hre.ethers.getContractFactory("AutomationController");
  const automationController = await AutomationController.deploy(portfolioManager.address);
  await automationController.deployed();
  
  console.log("✅ AutomationController deployed to:", automationController.address);
  console.log("   Transaction hash:", automationController.deployTransaction.hash, "\n");

  // Step 3: Configure contracts
  console.log("⚙️  Configuring contracts...");
  
  // Set automation controller in portfolio manager
  const setControllerTx = await portfolioManager.setAutomationController(automationController.address);
  await setControllerTx.wait();
  console.log("✅ Automation controller set in portfolio manager");
  
  // Initialize default parameters
  const initTx = await portfolioManager.initialize();
  await initTx.wait();
  console.log("✅ Portfolio manager initialized\n");

  // Step 4: Verify deployment
  console.log("🔍 Verifying deployment...");
  
  const controllerAddress = await portfolioManager.automationController();
  console.log("   Automation controller address:", controllerAddress);
  console.log("   Match:", controllerAddress === automationController.address ? "✅" : "❌");
  
  const isInitialized = await portfolioManager.isInitialized();
  console.log("   Portfolio manager initialized:", isInitialized ? "✅" : "❌", "\n");

  // Step 5: Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EnhancedPortfolioManager: {
        address: portfolioManager.address,
        transactionHash: portfolioManager.deployTransaction.hash
      },
      AutomationController: {
        address: automationController.address,
        transactionHash: automationController.deployTransaction.hash
      }
    }
  };

  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentFile, "\n");

  // Step 6: Display summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Deployment Summary");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\nContract Addresses:");
  console.log("  EnhancedPortfolioManager:", portfolioManager.address);
  console.log("  AutomationController:", automationController.address);
  console.log("\n✅ Deployment completed successfully!");
  console.log("═══════════════════════════════════════════════════════════\n");

  return {
    portfolioManager: portfolioManager.address,
    automationController: automationController.address
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

module.exports = { main };
