import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🔍 Checking Account Balance on Reactive Testnet\n");

  const signers = await ethers.getSigners();
  
  if (!signers || signers.length === 0) {
    console.error("❌ No signers available!");
    console.log("Make sure PRIVATE_KEY is set in .env");
    process.exit(1);
  }

  const account = signers[0];
  console.log("📍 Address:", account.address);
  
  const balance = await ethers.provider.getBalance(account.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "REACT");
  
  if (balance === 0n) {
    console.log("\n❌ Account has no balance!");
    console.log("\n📋 To fund this account:");
    console.log("   1. Visit the Reactive Network faucet");
    console.log("   2. Request testnet REACT tokens for:", account.address);
    console.log("   3. Or use a different private key that has balance");
    console.log("\n💡 Alternative: Export your MetaMask private key");
    console.log("   (Settings → Security & Privacy → Show Private Key)");
    console.log("   and update PRIVATE_KEY in .env");
  } else {
    console.log("\n✅ Account is funded and ready to deploy!");
  }
  
  // Check network info
  const network = await ethers.provider.getNetwork();
  console.log("\n🌐 Network Info:");
  console.log("   Chain ID:", network.chainId);
  console.log("   Name:", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
