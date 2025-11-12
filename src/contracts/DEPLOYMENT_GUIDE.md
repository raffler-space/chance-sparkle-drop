# Raffle Contract Deployment Guide

## Prerequisites

1. **Wallet with Sepolia ETH**
   - You'll need ~0.05 Sepolia ETH for deployment
   - Get free Sepolia ETH from faucets:
     - https://sepoliafaucet.com/
     - https://www.alchemy.com/faucets/ethereum-sepolia

2. **Chainlink VRF Subscription**
   - Visit https://vrf.chain.link/
   - Connect your wallet
   - Switch to Sepolia network
   - Click "Create Subscription"
   - Add 5 LINK tokens to your subscription (get test LINK from https://faucets.chain.link/sepolia)
   - Note your Subscription ID

## Step-by-Step Deployment

### 1. Setup Environment

Navigate to the contracts directory:
```bash
cd src/contracts
```

Create a `.env.local` file with your credentials:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
```
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.drpc.org
VRF_SUBSCRIPTION_ID=your_chainlink_subscription_id
ETHERSCAN_API_KEY=your_etherscan_api_key (optional)
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile the Contract

```bash
npx hardhat compile
```

### 4. Deploy to Sepolia

```bash
npx hardhat run deploy.js --network sepolia
```

You should see output like:
```
✅ Raffle contract deployed successfully!
Contract address: 0xYourNewContractAddress
```

**SAVE THIS ADDRESS!** You'll need it for the next steps.

### 5. Add Contract as VRF Consumer

1. Go to https://vrf.chain.link/
2. Select your subscription
3. Click "Add Consumer"
4. Paste your deployed contract address
5. Confirm the transaction

### 6. Verify on Etherscan (Recommended)

The deployment script will output the verification command. Run it:
```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B" YOUR_SUBSCRIPTION_ID "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c" 500000
```

### 7. Update Frontend Configuration

The deployment script will tell you to update `src/config/contracts.ts`.

Replace line 36:
```typescript
raffle: "0xYourNewContractAddress", // <- Use your new address here
```

## Testing Your Deployment

1. Go to your app's admin panel
2. Create a test raffle
3. Try purchasing tickets
4. After the raffle ends, trigger winner selection

## Troubleshooting

### "Insufficient funds" error
- Make sure your wallet has enough Sepolia ETH

### "VRF subscription not found"
- Double-check your VRF_SUBSCRIPTION_ID in .env.local
- Make sure the subscription has LINK tokens

### "Not authorized" when selecting winner
- Make sure you added the contract as a consumer on your VRF subscription
- It can take a few minutes for the transaction to be confirmed

### Contract verification fails
- Wait a few minutes after deployment
- Make sure ETHERSCAN_API_KEY is set correctly
- Verify manually on Etherscan using the constructor parameters

## Need Help?

- Chainlink VRF Docs: https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number
- Sepolia Etherscan: https://sepolia.etherscan.io/
- Hardhat Docs: https://hardhat.org/getting-started/
