const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting Raffle contract deployment on MAINNET...\n");

  // Ethereum Mainnet Chainlink VRF V2.5 Configuration
  const VRF_COORDINATOR = "0xD7f86b4b8Cae7D942340FF628F82735b7a20893a"; // VRF v2.5 Coordinator
  const GAS_LANE = "0x3fd2fec10d06ee8f65e7f2e95f5c56511359ece3f33960ad8a866ae24a8ff10b"; // 500 gwei Key Hash
  const CALLBACK_GAS_LIMIT = 500000;
  
  // IMPORTANT: Replace with your actual Chainlink VRF Subscription ID
  const SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID || "0";
  
  if (SUBSCRIPTION_ID === "0") {
    console.error("\n❌ ERROR: Please set VRF_SUBSCRIPTION_ID in your .env file");
    console.error("Visit https://vrf.chain.link/ to create a subscription\n");
    process.exit(1);
  }

  console.log("⚠️  WARNING: DEPLOYING TO ETHEREUM MAINNET");
  console.log("========================");
  console.log("Network:", hre.network.name);
  console.log("VRF Coordinator:", VRF_COORDINATOR);
  console.log("Subscription ID:", SUBSCRIPTION_ID);
  console.log("Gas Lane (500 gwei):", GAS_LANE);
  console.log("Callback Gas Limit:", CALLBACK_GAS_LIMIT);
  console.log("\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(hre.ethers.utils.parseEther("0.05"))) {
    console.error("\n❌ ERROR: Insufficient ETH balance for deployment");
    console.error("Please ensure you have at least 0.05 ETH for deployment\n");
    process.exit(1);
  }

  console.log("\n");

  // Deploy RaffleUSDT contract
  console.log("Deploying RaffleUSDT contract...");
  const RaffleUSDT = await hre.ethers.getContractFactory("RaffleUSDT");
  const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Real USDT on mainnet
  
  const raffle = await RaffleUSDT.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    GAS_LANE,
    CALLBACK_GAS_LIMIT,
    USDT_ADDRESS
  );

  await raffle.deployed();

  console.log("\n✅ RaffleUSDT contract deployed successfully!");
  console.log("Contract address:", raffle.address);
  console.log("\n");

  // Post-deployment instructions
  console.log("📋 CRITICAL: Next Steps:");
  console.log("==============");
  console.log("1. Add contract as VRF consumer:");
  console.log("   - Visit: https://vrf.chain.link/");
  console.log("   - Select your subscription (ID:", SUBSCRIPTION_ID + ")");
  console.log("   - Add consumer:", raffle.address);
  console.log("   - IMPORTANT: Do this BEFORE selecting any winners!");
  console.log("\n");
  console.log("2. Verify contract on Etherscan:");
  console.log("   npx hardhat verify --network mainnet", raffle.address, VRF_COORDINATOR, SUBSCRIPTION_ID, GAS_LANE, CALLBACK_GAS_LIMIT, USDT_ADDRESS);
  console.log("\n");
  console.log("3. Update frontend configuration:");
  console.log("   - Open: src/config/contracts.ts");
  console.log("   - Update mainnetConfig.contracts.raffle to:", raffle.address);
  console.log("\n");
  console.log("4. Transfer ownership (if needed):");
  console.log("   - Contract deployer:", deployer.address);
  console.log("   - Update in Admin panel if using different admin address");
  console.log("\n");
  console.log("5. Ensure VRF subscription has enough LINK:");
  console.log("   - Check balance at https://vrf.chain.link/");
  console.log("   - Minimum recommended: 5 LINK");
  console.log("   - Cost per request: ~0.25 LINK");
  console.log("\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: raffle.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    vrfConfig: {
      coordinator: VRF_COORDINATOR,
      subscriptionId: SUBSCRIPTION_ID,
      gasLane: GAS_LANE,
      callbackGasLimit: CALLBACK_GAS_LIMIT
    },
    usdtAddress: USDT_ADDRESS
  };

  fs.writeFileSync(
    'deployment-info-mainnet.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to: deployment-info-mainnet.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
