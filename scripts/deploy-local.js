import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying to Local Hardhat Network\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy FREACT Token
  console.log("📦 Deploying FREACTToken...");
  const FREACTToken = await ethers.getContractFactory("FREACTToken");
  const freactToken = await FREACTToken.deploy();
  await freactToken.waitForDeployment();
  const freactAddress = await freactToken.getAddress();
  console.log("✅ FREACTToken:", freactAddress);

  // Get token info
  const totalSupply = await freactToken.totalSupply();
  console.log("   Supply:", ethers.formatEther(totalSupply), "FREACT");

  // Claim some tokens for testing
  console.log("\n🧪 Claiming test tokens...");
  const claimTx = await freactToken.claim();
  await claimTx.wait();
  const deployerBalance = await freactToken.balanceOf(deployer.address);
  console.log("✅ Claimed:", ethers.formatEther(deployerBalance), "FREACT");

  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    chainId: 1337,
    freactToken: {
      address: freactAddress,
      name: "Fake React",
      symbol: "FREACT",
      decimals: 18
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  const deploymentsPath = path.join(process.cwd(), "deployments-local.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n💾 Saved to deployments-local.json");
  console.log("\n📋 Add to your .env:");
  console.log(`VITE_LOCAL_FREACT_ADDRESS=${freactAddress}`);
  console.log(`VITE_LOCAL_CHAIN_ID=1337`);
  console.log(`VITE_LOCAL_RPC=http://127.0.0.1:8545`);
  
  console.log("\n✨ Local deployment complete!");
  console.log("\n💡 Keep the Hardhat node running in another terminal:");
  console.log("   npx hardhat node");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
