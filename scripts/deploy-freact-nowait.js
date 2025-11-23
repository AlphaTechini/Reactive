import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 FREACT Deployment (No Wait Mode)\n");
  console.log("This script will broadcast the transaction and exit immediately.");
  console.log("You'll need to check the explorer manually for the contract address.\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "REACT\n");

  // Get gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");

  // Estimate gas
  const FREACTToken = await ethers.getContractFactory("FREACTToken");
  const deployTx = FREACTToken.getDeployTransaction();
  const gasEstimate = await ethers.provider.estimateGas({
    ...deployTx,
    from: deployer.address
  });
  
  console.log("Estimated Gas:", gasEstimate.toString());
  console.log("Estimated Cost:", ethers.formatEther(gasEstimate * feeData.gasPrice), "REACT\n");

  console.log("📤 Broadcasting deployment transaction...");
  
  // Deploy with manual gas settings
  const freactToken = await FREACTToken.deploy({
    gasLimit: gasEstimate * 120n / 100n, // 20% buffer
    gasPrice: feeData.gasPrice,
  });

  const txHash = freactToken.deploymentTransaction().hash;
  
  console.log("\n✅ Transaction broadcast successfully!");
  console.log("\n📋 Transaction Details:");
  console.log("   Hash:", txHash);
  console.log("   From:", deployer.address);
  console.log("\n🔗 Check status on explorer:");
  console.log("   ", `https://lasna.reactscan.net/tx/${txHash}`);
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Wait a few minutes for the transaction to be mined");
  console.log("   2. Check the transaction on the explorer (link above)");
  console.log("   3. Once confirmed, find the contract address in the transaction details");
  console.log("   4. Update your .env files with:");
  console.log("      VITE_FREACT_TOKEN_ADDRESS=<contract_address>");
  
  console.log("\n💡 Tip: The contract address will be shown in the 'To' field");
  console.log("   of the transaction once it's mined.");
}

main()
  .then(() => {
    console.log("\n✨ Script complete. Check the explorer for confirmation.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
