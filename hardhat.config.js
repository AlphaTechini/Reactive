import "@nomicfoundation/hardhat-toolbox";
import { config } from "dotenv";
config();

const REACTIVE_NETWORK_RPC = process.env.REACTIVE_NETWORK_RPC || "https://mainnet-rpc.rnk.dev/";
let PRIVATE_KEY = process.env.PRIVATE_KEY || "";
// Add 0x prefix if not present
if (PRIVATE_KEY && !PRIVATE_KEY.startsWith('0x')) {
  PRIVATE_KEY = '0x' + PRIVATE_KEY;
}
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// Debug logging
if (!PRIVATE_KEY) {
  console.warn("⚠️  Warning: PRIVATE_KEY not found in environment variables");
} else {
  console.log("✅ PRIVATE_KEY loaded (length:", PRIVATE_KEY.length, ")");
}

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    reactive: {
      url: REACTIVE_NETWORK_RPC,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
      chainId: 1597, // Reactive Mainnet Chain ID
      gasPrice: 1000000000, // 1 gwei
    },
    reactiveTestnet: {
      url: "https://lasna-rpc.rnk.dev/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 5318007, // Reactive Lasna Testnet
      gasPrice: 1000000000,
      timeout: 120000, // 2 minutes
      confirmations: 1, // Only wait for 1 confirmation
      httpHeaders: {
        'Content-Type': 'application/json'
      }
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "reactive",
        chainId: 1597,
        urls: {
          apiURL: "https://reactscan.net/api",
          browserURL: "https://reactscan.net"
        }
      },
      {
        network: "reactiveTestnet",
        chainId: 5318007,
        urls: {
          browserURL: "https://lasna.reactscan.net"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};
