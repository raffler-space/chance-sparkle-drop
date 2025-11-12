import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Starting Raffle contract deployment...\n");

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

  // Deploy contract
  console.log("Deploying Raffle contract...");
  const Raffle = await hre.ethers.getContractFactory("Raffle");
  const raffle = await Raffle.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    GAS_LANE,
    CALLBACK_GAS_LIMIT
  );

  await raffle.deployed();

  console.log("\n✅ Raffle contract deployed successfully!");
  console.log("Contract address:", raffle.address);
  console.log("\n");

  // Post-deployment instructions
  console.log("📋 Next Steps:");
  console.log("==============");
  console.log("1. Add contract as VRF consumer:");
  console.log("   - Visit: https://vrf.chain.link/");
  console.log("   - Select your subscription (ID:", SUBSCRIPTION_ID + ")");
  console.log("   - Add consumer:", raffle.address);
  console.log("\n");
  console.log("2. Verify contract on Etherscan:");
  console.log("   npx hardhat verify --network", hre.network.name, raffle.address, VRF_COORDINATOR, SUBSCRIPTION_ID, GAS_LANE, CALLBACK_GAS_LIMIT);
  console.log("\n");
  console.log("3. Update frontend configuration:");
  console.log("   - Open: src/config/contracts.ts");
  console.log("   - Update raffle address to:", raffle.address);
  console.log("\n");
  console.log("4. Test the contract:");
  console.log("   - Create a test raffle");
  console.log("   - Buy some tickets");
  console.log("   - Trigger winner selection");
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
    }
  };

  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to: deployment-info.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
