import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Simple FREACT Deployment\n");

  try {
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "REACT\n");

    // Deploy with explicit gas settings
    console.log("Deploying contract...");
    const FREACTToken = await ethers.getContractFactory("FREACTToken");
    
    const freactToken = await FREACTToken.deploy({
      gasLimit: 5000000, // Generous gas limit (max cost: 0.005 REACT)
      gasPrice: ethers.parseUnits("1", "gwei")
    });
    
    console.log("Waiting for deployment transaction...");
    console.log("TX Hash:", freactToken.deploymentTransaction().hash);
    
    // Wait with progress indicator
    let dots = 0;
    const progressInterval = setInterval(() => {
      process.stdout.write(`\rWaiting${'.'.repeat(dots % 4)}   `);
      dots++;
    }, 500);
    
    await freactToken.waitForDeployment();
    clearInterval(progressInterval);
    
    const address = await freactToken.getAddress();
    console.log("\n\n✅ Deployed to:", address);
    
    // Quick verification
    const name = await freactToken.name();
    const symbol = await freactToken.symbol();
    console.log(`Token: ${name} (${symbol})`);
    
    console.log("\n📝 Add this to your .env:");
    console.log(`VITE_FREACT_CONTRACT_ADDRESS=${address}`);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code) console.error("Code:", error.code);
    if (error.reason) console.error("Reason:", error.reason);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
