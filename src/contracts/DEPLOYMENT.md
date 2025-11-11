# Raffle Smart Contract Deployment Guide

## Prerequisites

1. **Install Dependencies**
   ```bash
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
   npm install @chainlink/contracts @openzeppelin/contracts
   ```

2. **Create Hardhat Config** (hardhat.config.js)
   ```javascript
   require("@nomiclabs/hardhat-ethers");
   
   module.exports = {
     solidity: "0.8.20",
     networks: {
       sepolia: {
         url: process.env.SEPOLIA_RPC_URL,
         accounts: [process.env.PRIVATE_KEY],
         chainId: 11155111,
       },
       mainnet: {
         url: process.env.MAINNET_RPC_URL,
         accounts: [process.env.PRIVATE_KEY],
         chainId: 1,
       }
     }
   };
   ```

3. **Get Chainlink VRF Subscription**
   - Visit [Chainlink VRF](https://vrf.chain.link/)
   - Create a subscription on Sepolia testnet
   - Fund with testnet LINK tokens
   - Note your subscription ID

## Deployment Steps (Sepolia Testnet)

### 1. Set Environment Variables
Create a `.env.local` file:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### 2. Chainlink VRF Configuration (Sepolia)
```javascript
VRF_COORDINATOR: 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
GAS_LANE: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
CALLBACK_GAS_LIMIT: 500000
SUBSCRIPTION_ID: YOUR_SUBSCRIPTION_ID
```

### 3. Create Deployment Script
Create `scripts/deploy.js`:
```javascript
const hre = require("hardhat");

async function main() {
  const VRF_COORDINATOR = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";
  const SUBSCRIPTION_ID = "YOUR_SUBSCRIPTION_ID"; // Get from Chainlink
  const GAS_LANE = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const CALLBACK_GAS_LIMIT = 500000;

  console.log("Deploying Raffle contract...");

  const Raffle = await hre.ethers.getContractFactory("Raffle");
  const raffle = await Raffle.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    GAS_LANE,
    CALLBACK_GAS_LIMIT
  );

  await raffle.deployed();

  console.log("Raffle deployed to:", raffle.address);
  console.log("\nNOTE: Add this contract as a consumer in your Chainlink VRF subscription!");
  console.log("Visit: https://vrf.chain.link/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 4. Deploy
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 5. Post-Deployment
1. **Add Contract as VRF Consumer**
   - Go to [Chainlink VRF](https://vrf.chain.link/)
   - Select your subscription
   - Add the deployed contract address as a consumer

2. **Verify Contract on Etherscan**
   ```bash
   npx hardhat verify --network sepolia CONTRACT_ADDRESS VRF_COORDINATOR SUBSCRIPTION_ID GAS_LANE CALLBACK_GAS_LIMIT
   ```

3. **Update Frontend Config**
   - Copy the deployed contract address
   - Update `src/config/contracts.ts` with the address

## Testing the Contract

### Create a Test Raffle
```javascript
const raffle = await ethers.getContractAt("Raffle", CONTRACT_ADDRESS);

// Create raffle (owner only)
const tx = await raffle.createRaffle(
  "Test Raffle",
  "Testing on Sepolia",
  ethers.utils.parseEther("0.01"), // 0.01 ETH per ticket
  100, // max tickets
  86400, // 1 day duration
  "0x0000000000000000000000000000000000000000" // no NFT gating
);

await tx.wait();
console.log("Raffle created!");
```

### Buy Tickets
```javascript
const buyTx = await raffle.buyTickets(0, 1, {
  value: ethers.utils.parseEther("0.01")
});
await buyTx.wait();
console.log("Ticket purchased!");
```

## Mainnet Deployment

⚠️ **IMPORTANT**: Before mainnet deployment:
1. Audit the contract thoroughly
2. Test extensively on testnet
3. Get professional security audit
4. Double-check all parameters
5. Have sufficient LINK tokens for VRF

Use the same steps as testnet but with mainnet configuration:
- VRF Coordinator: `0x271682DEB8C4E0901D1a1550aD2e64D568E69909`
- Gas Lane: `0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef`
- Ensure your subscription has sufficient LINK

## Common Issues

1. **"VRF subscription not funded"**
   - Add LINK tokens to your Chainlink VRF subscription

2. **"Not a valid consumer"**
   - Add contract address as consumer in VRF subscription

3. **"Insufficient funds"**
   - Ensure wallet has enough ETH for gas and deployment

## Next Steps

After successful deployment:
1. Update frontend configuration with contract address
2. Test all contract functions through the UI
3. Monitor gas costs and optimize if needed
4. Set up event monitoring for raffle activities
