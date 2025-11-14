const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting MockUSDT and RaffleUSDT deployment...\n");

  // Sepolia Testnet Chainlink VRF V2 Configuration
  const VRF_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
  const GAS_LANE = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
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

  // Step 1: Deploy MockUSDT
  console.log("1. Deploying MockUSDT contract...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.deployed();
  console.log("✅ MockUSDT deployed at:", mockUSDT.address);
  console.log("   Initial supply minted to deployer\n");

  // Step 2: Deploy RaffleUSDT with USDT token address
  console.log("2. Deploying RaffleUSDT contract...");
  const RaffleUSDT = await hre.ethers.getContractFactory("RaffleUSDT");
  const raffleUSDT = await RaffleUSDT.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    GAS_LANE,
    CALLBACK_GAS_LIMIT,
    mockUSDT.address
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
  console.log("2. Verify contracts on Etherscan:");
  console.log("   MockUSDT:");
  console.log("   npx hardhat verify --network", hre.network.name, mockUSDT.address);
  console.log("\n   RaffleUSDT:");
  console.log("   npx hardhat verify --network", hre.network.name, raffleUSDT.address, VRF_COORDINATOR, SUBSCRIPTION_ID, GAS_LANE, CALLBACK_GAS_LIMIT, mockUSDT.address);
  console.log("\n");
  console.log("3. Update frontend configuration:");
  console.log("   - Open: src/config/contracts.ts");
  console.log("   - Update raffle address to:", raffleUSDT.address);
  console.log("   - Update usdt address to:", mockUSDT.address);
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
    mockUSDT: mockUSDT.address,
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
