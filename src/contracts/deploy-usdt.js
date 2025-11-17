const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting MockUSDT and RaffleUSDT deployment...\n");

  // Network detection and configuration
  const isMainnet = hre.network.name === "mainnet";
  
  // Network-specific Chainlink VRF V2.5 Configuration
  const VRF_COORDINATOR = isMainnet 
    ? "0xD7f86b4b8Cae7D942340FF628F82735b7a20893a" // Mainnet VRF v2.5 Coordinator
    : "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B"; // Sepolia VRF v2.5 Coordinator
  
  const GAS_LANE = isMainnet
    ? "0x9fe0eebf5e446e3c998ec9bb19951541aee00bb90ea201ae456421a2ded86805" // Mainnet 500 gwei Key Hash
    : "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"; // Sepolia 500 gwei Key Hash
  
  const CALLBACK_GAS_LIMIT = 500000;
  
  // IMPORTANT: Replace with your actual Chainlink VRF Subscription ID
  const SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID || "0";
  
  if (SUBSCRIPTION_ID === "0") {
    console.error("\n❌ ERROR: Please set VRF_SUBSCRIPTION_ID in your .env.local file");
    console.error("Visit https://vrf.chain.link/ to create a subscription\n");
    process.exit(1);
  }

  console.log("Deployment Configuration:");
  console.log("========================");
  console.log("Network:", hre.network.name);
  console.log("VRF Coordinator:", VRF_COORDINATOR);
  console.log("Subscription ID:", SUBSCRIPTION_ID);
  console.log("Gas Lane:", GAS_LANE);
  console.log("Callback Gas Limit:", CALLBACK_GAS_LIMIT);
  console.log("\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Step 1: Use existing USDT (real USDT on mainnet, MockUSDT on testnet)
  const EXISTING_USDT = isMainnet
    ? "0xdAC17F958D2ee523a2206206994597C13D831ec7" // Real USDT on Mainnet
    : "0x11BBef28D8effD775F9674798cd219394F9C1969"; // MockUSDT on Sepolia
  
  console.log("1. Using", isMainnet ? "real USDT" : "MockUSDT", "at:", EXISTING_USDT);
  console.log("   (Skipping deployment - reusing deployed contract)\n");

  // Step 2: Deploy RaffleUSDT with USDT token address
  console.log("2. Deploying RaffleUSDT contract...");
  const RaffleUSDT = await hre.ethers.getContractFactory("RaffleUSDT");
  const raffleUSDT = await RaffleUSDT.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    GAS_LANE,
    CALLBACK_GAS_LIMIT,
    EXISTING_USDT
  );
  await raffleUSDT.deployed();
  console.log("✅ RaffleUSDT deployed at:", raffleUSDT.address);
  console.log("\n");

  // Post-deployment instructions
  console.log("📋 Next Steps:");
  console.log("==============");
  console.log("1. Add RaffleUSDT contract as VRF consumer:");
  console.log("   - Visit: https://vrf.chain.link/");
  console.log("   - Select your subscription (ID:", SUBSCRIPTION_ID + ")");
  console.log("   - Add consumer:", raffleUSDT.address);
  console.log("\n");
  console.log("2. Verify contract on Etherscan:");
  console.log("   RaffleUSDT:");
  console.log("   npx hardhat verify --network", hre.network.name, raffleUSDT.address, VRF_COORDINATOR, SUBSCRIPTION_ID, GAS_LANE, CALLBACK_GAS_LIMIT, EXISTING_USDT);
  console.log("\n");
  console.log("3. Update frontend configuration:");
  console.log("   - Open: src/config/contracts.ts");
  console.log("   - Update raffle address to:", raffleUSDT.address);
  console.log("   - USDT address remains:", EXISTING_USDT);
  console.log("\n");
  console.log("4. Test the contracts:");
  console.log("   - Mint test USDT tokens");
  console.log("   - Approve RaffleUSDT to spend your USDT");
  console.log("   - Create a test raffle");
  console.log("   - Buy tickets with USDT");
  console.log("\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    mockUSDT: EXISTING_USDT,
    raffleUSDT: raffleUSDT.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    vrfConfig: {
      coordinator: VRF_COORDINATOR,
      subscriptionId: SUBSCRIPTION_ID,
      gasLane: GAS_LANE,
      callbackGasLimit: CALLBACK_GAS_LIMIT
    }
  };

  fs.writeFileSync(
    'deployment-usdt-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to: deployment-usdt-info.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
