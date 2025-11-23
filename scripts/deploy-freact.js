import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying FREACT Token to Reactive Testnet...\n");

  // Debug: Check network configuration
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("Accounts configured:", hre.network.config.accounts?.length || 0);
  console.log();

  // Get deployer account
  const signers = await ethers.getSigners();
  
  if (!signers || signers.length === 0) {
    console.error("❌ Error: No signers available!");
    console.log("Please make sure PRIVATE_KEY is set in .env file");
    console.log("Current network config has", hre.network.config.accounts?.length || 0, "accounts");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "REACT\n");

  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no balance!");
    console.log("Please fund your account with testnet REACT tokens");
    process.exit(1);
  }

  // Deploy FREACT Token with explicit gas settings
  console.log("📦 Deploying FREACTToken contract...");
  
  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("⛽ Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  
  const FREACTToken = await ethers.getContractFactory("FREACTToken");
  
  // Deploy with explicit gas settings and shorter timeout
  console.log("📤 Broadcasting transaction...");
  const freactToken = await FREACTToken.deploy({
    gasLimit: 3000000, // 3M gas limit
    gasPrice: feeData.gasPrice,
  });
  
  console.log("⏳ Waiting for deployment transaction...");
  console.log("   Transaction hash:", freactToken.deploymentTransaction().hash);
  
  // Wait with timeout
  const receipt = await Promise.race([
    freactToken.deploymentTransaction().wait(1), // Wait for 1 confirmation
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Deployment timeout after 60s")), 60000)
    )
  ]);
  
  console.log("✅ Transaction mined in block:", receipt.blockNumber);
  
  const freactAddress = await freactToken.getAddress();

  console.log("✅ FREACTToken deployed to:", freactAddress);

  // Get initial stats
  const totalSupply = await freactToken.totalSupply();
  const faucetBalance = await freactToken.balanceOf(freactAddress);
  const claimAmount = await freactToken.CLAIM_AMOUNT();
  const maxPerAddress = await freactToken.MAX_PER_ADDRESS();
  const cooldownPeriod = await freactToken.COOLDOWN_PERIOD();

  console.log("\n📊 Token Information:");
  console.log("   Name:", await freactToken.name());
  console.log("   Symbol:", await freactToken.symbol());
  console.log("   Decimals:", await freactToken.decimals());
  console.log("   Total Supply:", ethers.formatEther(totalSupply), "FREACT");
  console.log("   Faucet Balance:", ethers.formatEther(faucetBalance), "FREACT");
  console.log("\n🚰 Faucet Configuration:");
  console.log("   Claim Amount:", ethers.formatEther(claimAmount), "FREACT");
  console.log("   Max Per Address:", ethers.formatEther(maxPerAddress), "FREACT");
  console.log("   Cooldown Period:", Number(cooldownPeriod) / 3600, "hours");

  // Test a claim
  console.log("\n🧪 Testing faucet claim...");
  try {
    const canClaim = await freactToken.canClaim(deployer.address);
    console.log("   Can claim:", canClaim);
    
    if (canClaim) {
      const claimTx = await freactToken.claim();
      await claimTx.wait();
      console.log("   ✅ Test claim successful!");
      
      const deployerBalance = await freactToken.balanceOf(deployer.address);
      console.log("   Deployer balance:", ethers.formatEther(deployerBalance), "FREACT");
    }
  } catch (error) {
    console.log("   ⚠️  Test claim failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "Reactive Lasna Testnet",
    chainId: 5318007,
    freactToken: {
      address: freactAddress,
      name: "Fake React",
      symbol: "FREACT",
      decimals: 18,
      totalSupply: ethers.formatEther(totalSupply),
      faucet: {
        claimAmount: ethers.formatEther(claimAmount),
        maxPerAddress: ethers.formatEther(maxPerAddress),
        cooldownHours: Number(cooldownPeriod) / 3600
      }
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  // Save to deployments.json
  const deploymentsPath = path.join(process.cwd(), "deployments.json");
  let deployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    const content = fs.readFileSync(deploymentsPath, "utf8");
    deployments = JSON.parse(content);
  }

  deployments.freactToken = deploymentInfo;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

  console.log("\n💾 Deployment info saved to deployments.json");

  // Update .env file
  console.log("\n📝 Updating environment configuration...");
  const envPath = path.join(process.cwd(), ".env");
  const envExamplePath = path.join(process.cwd(), ".env.example");
  
  // Update .env.example
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, "utf8");
    
    // Add FREACT token address if not present
    if (!envContent.includes("VITE_FREACT_TOKEN_ADDRESS")) {
      envContent += `\n# FREACT Token (Simulation Mode)\nVITE_FREACT_TOKEN_ADDRESS=${freactAddress}\n`;
      fs.writeFileSync(envExamplePath, envContent);
      console.log("   ✅ Updated .env.example");
    }
  }

  // Update .env if it exists
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    
    if (envContent.includes("VITE_FREACT_TOKEN_ADDRESS=")) {
      // Replace existing value
      envContent = envContent.replace(
        /VITE_FREACT_TOKEN_ADDRESS=.*/,
        `VITE_FREACT_TOKEN_ADDRESS=${freactAddress}`
      );
    } else {
      // Add new entry
      envContent += `\n# FREACT Token (Simulation Mode)\nVITE_FREACT_TOKEN_ADDRESS=${freactAddress}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("   ✅ Updated .env");
  }

  // Update client .env files
  const clientEnvPath = path.join(process.cwd(), "client", ".env");
  const clientEnvExamplePath = path.join(process.cwd(), "client", ".env.example");

  for (const clientPath of [clientEnvPath, clientEnvExamplePath]) {
    if (fs.existsSync(clientPath)) {
      let envContent = fs.readFileSync(clientPath, "utf8");
      
      if (envContent.includes("VITE_FREACT_TOKEN_ADDRESS=")) {
        envContent = envContent.replace(
          /VITE_FREACT_TOKEN_ADDRESS=.*/,
          `VITE_FREACT_TOKEN_ADDRESS=${freactAddress}`
        );
      } else {
        envContent += `\n# FREACT Token (Simulation Mode)\nVITE_FREACT_TOKEN_ADDRESS=${freactAddress}\n`;
      }
      
      fs.writeFileSync(clientPath, envContent);
      console.log(`   ✅ Updated ${path.basename(clientPath)}`);
    }
  }

  console.log("\n✨ Deployment Complete!");
  console.log("\n📋 Next Steps:");
  console.log("   1. Verify contract on block explorer:");
  console.log(`      https://lasna.reactscan.net/address/${freactAddress}`);
  console.log("   2. Test the faucet by calling the claim() function");
  console.log("   3. Update frontend to use FREACT token address");
  console.log("\n🔗 Contract Address:", freactAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
