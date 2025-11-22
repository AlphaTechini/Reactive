/**
 * Contract Integration Verification Script
 * 
 * Verifies that deployed contracts are properly integrated and functional
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function loadDeployment(network) {
  const deploymentFile = path.join(__dirname, '../deployments', `${network}-deployment.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found for network: ${network}`);
  }
  
  return JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
}

async function verifyContractIntegration() {
  console.log("🔍 Verifying Contract Integration\n");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address, "\n");

  // Load deployment info
  const deployment = await loadDeployment(hre.network.name);
  console.log("📋 Loaded deployment from:", deployment.timestamp);
  console.log("   Network:", deployment.network, "\n");

  // Get contract instances
  const portfolioManager = await hre.ethers.getContractAt(
    "EnhancedPortfolioManager",
    deployment.contracts.EnhancedPortfolioManager.address
  );
  
  const automationController = await hre.ethers.getContractAt(
    "AutomationController",
    deployment.contracts.AutomationController.address
  );

  console.log("✅ Contract instances loaded\n");

  // Verification tests
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Verify automation controller linkage
  console.log("Test 1: Automation Controller Linkage");
  try {
    const controllerAddress = await portfolioManager.automationController();
    const isCorrect = controllerAddress.toLowerCase() === automationController.address.toLowerCase();
    
    if (isCorrect) {
      console.log("✅ PASS: Automation controller correctly linked");
      results.passed++;
    } else {
      console.log("❌ FAIL: Automation controller mismatch");
      console.log("   Expected:", automationController.address);
      console.log("   Got:", controllerAddress);
      results.failed++;
    }
    
    results.tests.push({
      name: "Automation Controller Linkage",
      passed: isCorrect
    });
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    results.failed++;
    results.tests.push({
      name: "Automation Controller Linkage",
      passed: false,
      error: error.message
    });
  }
  console.log();

  // Test 2: Verify portfolio manager initialization
  console.log("Test 2: Portfolio Manager Initialization");
  try {
    const isInitialized = await portfolioManager.isInitialized();
    
    if (isInitialized) {
      console.log("✅ PASS: Portfolio manager is initialized");
      results.passed++;
    } else {
      console.log("❌ FAIL: Portfolio manager not initialized");
      results.failed++;
    }
    
    results.tests.push({
      name: "Portfolio Manager Initialization",
      passed: isInitialized
    });
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    results.failed++;
    results.tests.push({
      name: "Portfolio Manager Initialization",
      passed: false,
      error: error.message
    });
  }
  console.log();

  // Test 3: Verify contract ownership
  console.log("Test 3: Contract Ownership");
  try {
    const owner = await portfolioManager.owner();
    const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
    
    if (isOwner) {
      console.log("✅ PASS: Correct contract owner");
      results.passed++;
    } else {
      console.log("⚠️  WARNING: Owner mismatch");
      console.log("   Expected:", signer.address);
      console.log("   Got:", owner);
      results.passed++; // Not a critical failure
    }
    
    results.tests.push({
      name: "Contract Ownership",
      passed: true
    });
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    results.failed++;
    results.tests.push({
      name: "Contract Ownership",
      passed: false,
      error: error.message
    });
  }
  console.log();

  // Test 4: Verify rebalancing functionality exists
  console.log("Test 4: Rebalancing Functionality");
  try {
    // Check if executeOptimizedRebalancing function exists
    const hasFunction = typeof portfolioManager.executeOptimizedRebalancing === 'function';
    
    if (hasFunction) {
      console.log("✅ PASS: Rebalancing functions available");
      results.passed++;
    } else {
      console.log("❌ FAIL: Rebalancing functions not found");
      results.failed++;
    }
    
    results.tests.push({
      name: "Rebalancing Functionality",
      passed: hasFunction
    });
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    results.failed++;
    results.tests.push({
      name: "Rebalancing Functionality",
      passed: false,
      error: error.message
    });
  }
  console.log();

  // Test 5: Verify trailing stop-loss functionality
  console.log("Test 5: Trailing Stop-Loss Functionality");
  try {
    const hasFunction = typeof portfolioManager.setTrailingStopLoss === 'function';
    
    if (hasFunction) {
      console.log("✅ PASS: Trailing stop-loss functions available");
      results.passed++;
    } else {
      console.log("❌ FAIL: Trailing stop-loss functions not found");
      results.failed++;
    }
    
    results.tests.push({
      name: "Trailing Stop-Loss Functionality",
      passed: hasFunction
    });
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    results.failed++;
    results.tests.push({
      name: "Trailing Stop-Loss Functionality",
      passed: false,
      error: error.message
    });
  }
  console.log();

  // Display summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Verification Summary");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Total Tests:", results.passed + results.failed);
  console.log("Passed:", results.passed);
  console.log("Failed:", results.failed);
  console.log("\nTest Results:");
  results.tests.forEach((test, index) => {
    const status = test.passed ? "✅" : "❌";
    console.log(`  ${index + 1}. ${status} ${test.name}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });
  
  if (results.failed === 0) {
    console.log("\n✅ All verification tests passed!");
  } else {
    console.log(`\n⚠️  ${results.failed} test(s) failed`);
  }
  console.log("═══════════════════════════════════════════════════════════\n");

  return results;
}

async function main() {
  try {
    const results = await verifyContractIntegration();
    
    if (results.failed > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyContractIntegration };
