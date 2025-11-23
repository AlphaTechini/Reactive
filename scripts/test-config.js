import hre from "hardhat";
const { ethers } = hre;
import { config } from "dotenv";

config();

async function main() {
  console.log("Testing Hardhat Configuration...\n");
  
  // Check environment
  console.log("Environment Variables:");
  console.log("  PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);
  console.log("  PRIVATE_KEY length:", process.env.PRIVATE_KEY?.length || 0);
  
  // Check network
  console.log("\nNetwork Configuration:");
  console.log("  Network:", hre.network.name);
  console.log("  Chain ID:", hre.network.config.chainId);
  console.log("  RPC URL:", hre.network.config.url);
  console.log("  Accounts configured:", hre.network.config.accounts?.length || 0);
  
  // Try to get signers
  try {
    const signers = await ethers.getSigners();
    console.log("\nSigners:");
    console.log("  Count:", signers.length);
    
    if (signers.length > 0) {
      const deployer = signers[0];
      console.log("  Deployer address:", deployer.address);
      
      const balance = await ethers.provider.getBalance(deployer.address);
      console.log("  Balance:", ethers.formatEther(balance), "REACT");
    }
  } catch (error) {
    console.error("\n❌ Error getting signers:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
