import * as dotenv from "dotenv";

dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import { task } from "hardhat/config";
import generateTsAbis from "./scripts/generateTsAbis";

// If not set, it uses ours Alchemy's default API key.
// You can get your own at https://dashboard.alchemyapi.io
// If not set, it uses the hardhat account 0 private key.
// You can generate a random account with `yarn generate` or `yarn account:import` to import your existing PK
const deployerPrivateKey =
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhat: {
      allowUnlimitedContractSize: true,
      gas: 30000000,
      blockGasLimit: 30000000,
    },
    dev_net: {
      url: `http://140.210.218.31:8565`,
      chainId: 30303,
      accounts: [deployerPrivateKey],
    },
    potos_testnet: {
      allowUnlimitedContractSize: true,
      url: `https://rpc-testnet.potos.hk`,
      chainId: 60600,
      accounts: [deployerPrivateKey],
    },
  },
  // configuration for hardhat-verify plugin
  etherscan: {
    apiKey: {
      potos_testnet: "empty",
    },
    customChains: [
      {
        network: "potos_testnet",
        chainId: 60600,
        urls: {
          apiURL: "https://scan-testnet.potos.hk/api",
          browserURL: "https://scan-testnet.potos.hk",
        },
      },
    ],
  },
};

// Extend the deploy task
task("deploy").setAction(async (args, hre, runSuper) => {
  // Run the original deploy task
  await runSuper(args);
  // Force run the generateTsAbis script
  await generateTsAbis(hre);
});

export default config;
