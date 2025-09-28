import hardhat from "hardhat";
const { ethers, network } = hardhat;

async function main() {
  console.log("🌐 Reactive Network Information\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("📋 Network Details:");
  console.log("  Name:", network.name);
  console.log("  Chain ID:", network.chainId);

  // Get signer info
  const [signer] = await ethers.getSigners();
  console.log("\n👤 Account Details:");
  console.log("  Address:", signer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("  Balance:", ethers.formatEther(balance), "ETH");

  // Get gas price
  const gasPrice = await ethers.provider.getFeeData();
  console.log("  Gas Price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");

  // Get latest block
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("\n🔗 Latest Block:", blockNumber);

  console.log("\n✅ Network info retrieved successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
