require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const REACTIVE_NETWORK_RPC = process.env.REACTIVE_NETWORK_RPC || "https://kopli-rpc.reactive.network";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
      chainId: 5318008, // Reactive Network Chain ID
      gasPrice: 1000000000, // 1 gwei
    },
    reactiveTestnet: {
      url: "https://kopli-rpc.reactive.network",
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
      chainId: 5318008,
      gasPrice: 1000000000,
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "reactive",
        chainId: 5318008,
        urls: {
          apiURL: "https://kopli.reactscan.net/api",
          browserURL: "https://kopli.reactscan.net"
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
