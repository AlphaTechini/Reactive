// Deployment script for ReactToken + ReactivePortfolioManager
import hardhat from "hardhat";
const { ethers } = hardhat;
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying ReactToken...");
  const Token = await ethers.getContractFactory("ReactToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ ReactToken deployed at", tokenAddress);

  console.log("🚀 Deploying ReactivePortfolioManager...");
  const Manager = await ethers.getContractFactory("ReactivePortfolioManager");
  const manager = await Manager.deploy(tokenAddress);
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();
  console.log("✅ ReactivePortfolioManager deployed at", managerAddress);

  console.log("🚀 Deploying MockSwapRouter...");
  const Router = await ethers.getContractFactory("MockSwapRouter");
  const router = await Router.deploy();
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ MockSwapRouter deployed at", routerAddress);

  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outfile = path.join(outDir, "reactive-mainnet.json");
  const data = {
    chainId: 1597,
    reactToken: tokenAddress,
    portfolioManager: managerAddress,
    network: "reactive",
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(outfile, JSON.stringify(data, null, 2));
  console.log("📝 Deployment info written to", outfile);
  // Also write a small client .env snippet to help local frontend pick it up
  const clientEnv = `VITE_REACT_TOKEN_ADDRESS=${tokenAddress}\nVITE_PORTFOLIO_MANAGER_ADDRESS=${managerAddress}\nVITE_SWAP_ROUTER_ADDRESS=${routerAddress}\n`;
  fs.writeFileSync(path.join(process.cwd(), 'client', '.env.local'), clientEnv);
  console.log('📝 Wrote client/.env.local with deployed addresses');
}

main().catch((e) => { console.error(e); process.exit(1); });
