import hardhat from "hardhat";
const { ethers, network } = hardhat;
import fs from "fs";
import path from "path";

// Update with deployed EnhancedPortfolioManager address
const CONTRACT_ADDRESS = process.env.PORTFOLIO_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000";

async function main() {
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Set PORTFOLIO_MANAGER_ADDRESS env var to your deployed contract address");
  }

  const configPath = path.resolve("token-config.json");
  if (!fs.existsSync(configPath)) throw new Error("token-config.json not found");

  const raw = fs.readFileSync(configPath, "utf-8");
  const data = JSON.parse(raw);

  const [deployer] = await ethers.getSigners();
  console.log(`Using deployer: ${deployer.address}`);

  const abi = ["function addToken(address token,string symbol,uint8 decimals,uint8 category,uint24 poolFee) external"];
  const contract = await ethers.getContractAt(abi, CONTRACT_ADDRESS, deployer);

  // Category mapping from string to enum numeric (must match TokenCategory order)
  const categoryMap = {
    ALTCOIN: 0,
    MEMECOIN: 1,
    STABLECOIN: 2,
    BTC: 3
  };

  const groups = ["stablecoins", "altcoins", "memecoins"]; // order stablecoins first
  for (const group of groups) {
    if (!data[group]) continue;
    for (const t of data[group]) {
      try {
        const catVal = categoryMap[t.category];
        if (catVal === undefined) throw new Error(`Unknown category ${t.category}`);
        console.log(`Adding ${t.symbol} (${t.address}) cat=${t.category} decimals=${t.decimals} fee=${t.poolFee}`);
        const tx = await contract.addToken(t.address, t.symbol, t.decimals, catVal, t.poolFee);
        await tx.wait();
        console.log(`✓ Added ${t.symbol}`);
      } catch (err) {
        console.error(`✗ Failed for ${t.symbol}:`, err.message);
      }
    }
  }

  console.log("Batch token registration complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});