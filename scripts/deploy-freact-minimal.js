import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Minimal FREACT Deployment\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "REACT\n");

  // Get gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei\n");

  console.log("Deploying FREACTToken...");
  const FREACTToken = await ethers.getContractFactory("FREACTToken");
  
  // Deploy with manual gas settings
  const freactToken = await FREACTToken.deploy({
    gasLimit: 3000000,
    gasPrice: feeData.gasPrice,
  });

  const txHash = freactToken.deploymentTransaction().hash;
  console.log("\n📤 Transaction sent!");
  console.log("   Hash:", txHash);
  console.log("   Explorer:", `https://lasna.reactscan.net/tx/${txHash}`);
  
  console.log("\n⏳ Waiting for confirmation (60s timeout)...");
  
  try {
    const receipt = await Promise.race([
      freactToken.deploymentTransaction().wait(1),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 60000)
      )
    ]);
    
    const address = await freactToken.getAddress();
    console.log("\n✅ Deployed successfully!");
    console.log("   Contract:", address);
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("\n🔗 View on explorer:");
    console.log("   ", `https://lasna.reactscan.net/address/${address}`);
    
  } catch (error) {
    if (error.message === "Timeout") {
      console.log("\n⚠️  Deployment timed out, but transaction may still be pending");
      console.log("   Check transaction status:", `https://lasna.reactscan.net/tx/${txHash}`);
      console.log("\n💡 If transaction succeeds, you can get the contract address from the explorer");
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
