import "@nomicfoundation/hardhat-toolbox";
import { config } from "dotenv";
config();

const REACTIVE_NETWORK_RPC = process.env.REACTIVE_NETWORK_RPC || "https://mainnet-rpc.rnk.dev/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
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
      url: "https://mainnet-rpc.rnk.dev/",
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
      chainId: 1597,
      gasPrice: 1000000000,
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
