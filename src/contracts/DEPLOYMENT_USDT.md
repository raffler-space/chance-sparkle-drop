# Deploying USDT-Based Raffle System to Sepolia

This guide will walk you through deploying the USDT-based raffle system with MockUSDT contract for testing.

## Prerequisites

1. **MetaMask or compatible wallet** with Sepolia ETH
   - Get Sepolia ETH from: https://sepoliafaucet.com/

2. **Chainlink VRF Subscription** with LINK tokens
   - Create subscription: https://vrf.chain.link/
   - Fund with test LINK from: https://faucets.chain.link/

3. **Node.js and npm** installed

## Environment Setup

1. Create a `.env` file in the `src/contracts` directory:

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
VRF_SUBSCRIPTION_ID=your_subscription_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**⚠️ Security Warning:** Never commit the `.env` file to version control!

## Step 1: Install Dependencies

```bash
cd src/contracts
npm install
```

## Step 2: Compile Contracts

```bash
npx hardhat compile
```

This will compile both `MockUSDT.sol` and `RaffleUSDT.sol` contracts.

## Step 3: Deploy Contracts

```bash
npx hardhat run deploy-usdt.js --network sepolia
```

This will:
1. Deploy MockUSDT token contract
2. Mint 1,000,000 test USDT to your deployer address
3. Deploy RaffleUSDT contract with the USDT token address
4. Save deployment info to `deployment-usdt-info.json`

**Important:** Save the contract addresses from the deployment output!

## Step 4: Add Contract as VRF Consumer

1. Visit https://vrf.chain.link/
2. Select your subscription
3. Click "Add Consumer"
4. Paste your **RaffleUSDT contract address** (NOT MockUSDT)
5. Confirm the transaction

## Step 5: Verify Contracts on Etherscan

### Verify MockUSDT:
```bash
npx hardhat verify --network sepolia <MOCK_USDT_ADDRESS>
```

### Verify RaffleUSDT:
```bash
npx hardhat verify --network sepolia <RAFFLE_USDT_ADDRESS> \
  "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B" \
  "<YOUR_SUBSCRIPTION_ID>" \
  "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c" \
  "500000" \
  "<MOCK_USDT_ADDRESS>"
```

## Step 6: Update Frontend Configuration

Edit `src/config/contracts.ts`:

```typescript
contracts: {
  raffle: "YOUR_RAFFLE_USDT_ADDRESS",
  usdt: "YOUR_MOCK_USDT_ADDRESS",
}
```

## Testing the Deployment

### 1. Mint Test USDT

In your app:
1. Connect your wallet
2. Click "Get Test USDT" button
3. Confirm the transaction
4. You'll receive 1000 test USDT

### 2. Create a Test Raffle

Use the admin interface to create a raffle with USDT pricing (use 6 decimals for USDT amounts).

### 3. Purchase Tickets

1. Go to the raffle page
2. Click "Buy Tickets"
3. First transaction: Approve USDT spending (happens automatically)
4. Second transaction: Purchase tickets with USDT
5. Confirm both transactions

### 4. Verify Purchase

- Check your USDT balance decreased
- Check ticket count increased
- Verify transaction on Sepolia Etherscan

## Common Issues

### "Insufficient USDT balance"
- Click "Get Test USDT" to mint more tokens
- Check your USDT balance in the purchase modal

### "Approval failed"
- Make sure you have enough ETH for gas fees
- Retry the approval transaction

### "Not a valid consumer"
- Verify you added the RaffleUSDT contract (not MockUSDT) as a VRF consumer
- Check your subscription has enough LINK tokens

### Transaction fails with "Transfer failed"
- Ensure you've approved enough USDT
- Check your USDT balance is sufficient

## Contract Addresses (after deployment)

Save these for reference:
- **MockUSDT:** `<paste address here>`
- **RaffleUSDT:** `<paste address here>`
- **VRF Coordinator:** `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`

## Important Notes

### USDT Decimals
MockUSDT uses 6 decimals (like real USDT), not 18 like ETH:
- 1 USDT = 1,000,000 (in smallest units)
- When creating raffles, ticket prices should account for this

### Two-Step Purchase Flow
Unlike ETH transfers, ERC20 tokens require:
1. **Approve:** Allow the raffle contract to spend your USDT
2. **Purchase:** Actually transfer USDT and mint tickets

The frontend handles this automatically, showing appropriate progress messages.

### Gas Fees
- All transactions still require ETH for gas
- USDT is only used for ticket purchases
- Keep some Sepolia ETH for transaction fees

## Next Steps

1. ✅ Deploy contracts
2. ✅ Add VRF consumer
3. ✅ Verify on Etherscan
4. ✅ Update frontend config
5. ✅ Test minting USDT
6. ✅ Test creating raffle
7. ✅ Test buying tickets
8. ✅ Test winner selection

## Support

For issues or questions:
- Check Hardhat documentation: https://hardhat.org/
- Chainlink VRF docs: https://docs.chain.link/vrf/v2/introduction
- OpenZeppelin ERC20: https://docs.openzeppelin.com/contracts/erc20
