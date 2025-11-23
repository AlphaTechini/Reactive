import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🔍 Testing Reactive Testnet RPC Connection\n");
  console.log("Network:", hre.network.name);
  console.log("RPC URL:", hre.network.config.url);
  console.log();

  try {
    // Test 1: Get chain ID
    console.log("Test 1: Getting chain ID...");
    const network = await ethers.provider.getNetwork();
    console.log("✅ Chain ID:", network.chainId.toString());
    console.log();

    // Test 2: Get block number
    console.log("Test 2: Getting latest block...");
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("✅ Latest block:", blockNumber);
    console.log();

    // Test 3: Get account balance
    console.log("Test 3: Getting account balance...");
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("✅ Address:", signer.address);
    console.log("✅ Balance:", ethers.formatEther(balance), "REACT");
    console.log();

    // Test 4: Get gas price
    console.log("Test 4: Getting gas price...");
    const feeData = await ethers.provider.getFeeData();
    console.log("✅ Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
    console.log();

    // Test 5: Estimate gas for a simple transaction
    console.log("Test 5: Estimating deployment gas...");
    const FREACTToken = await ethers.getContractFactory("FREACTToken");
    const deployTx = FREACTToken.getDeployTransaction();
    const gasEstimate = await ethers.provider.estimateGas({
      ...deployTx,
      from: signer.address
    });
    console.log("✅ Estimated gas:", gasEstimate.toString());
    console.log("✅ Estimated cost:", ethers.formatEther(gasEstimate * feeData.gasPrice), "REACT");
    console.log();

    console.log("✅ All RPC tests passed!");
    console.log("\n💡 The RPC endpoint is working correctly.");
    console.log("   If deployment still hangs, it may be a testnet issue.");
    
  } catch (error) {
    console.error("❌ RPC Test Failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Check if the RPC URL is correct");
    console.log("   2. Try a different RPC endpoint");
    console.log("   3. Check if the testnet is operational");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
