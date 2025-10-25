# 🚀 Ethereum Sepolia Deployment - Quick Start

## 📝 Network Information

**Network:** Ethereum Sepolia  
**Chain ID:** 11155111  
**Explorer:** https://sepolia.etherscan.io/

**Pre-configured Addresses:**

```
USDC (Aave V3 Reserve): 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
Aave V3 Pool: 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
```

**Important:** This is the USDC address that Aave V3's Sepolia market recognizes as a reserve asset.

## 🚰 Get Test Tokens

### 1. Get Sepolia ETH (for gas)

-   **Alchemy Faucet**: https://www.alchemy.com/faucets/ethereum-sepolia
-   **Infura Faucet**: https://www.infura.io/faucet/sepolia
-   **Chainlink Faucet**: https://faucets.chain.link/sepolia

You need at least **0.01 ETH** for deployment.

### 2. Get USDC on Sepolia

**For Aave V3 Testing:**
You need USDC at address `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8` which is the USDC reserve token that Aave V3 Sepolia uses.

**Option 1: Aave Faucet (Recommended)**

-   Visit Aave's testnet faucet (if available)
-   Request USDC directly for the Aave V3 reserve token

**Option 2: Circle Faucet + Swap**

-   **Circle Faucet**: https://faucet.circle.com/
-   Note: Circle may provide a different USDC token
-   You may need to swap or bridge to get Aave's USDC version

**Option 3: Direct Mint (if available)**

-   If the Aave USDC token has a public mint function, you can call it directly

## ⚡ Deploy in 3 Steps

```bash
# Step 1: Configure environment
cd contracts
cp .env.example .env
# Edit .env: Add PRIVATE_KEY and SEPOLIA_RPC_URL

# Step 2: Deploy contracts
./deploy.sh

# Step 3: Update frontend
cd ..
echo "VITE_VAULT_ADDRESS=0xYourVaultAddress" >> .env
npm run dev
```

## 🔧 Environment Setup

Edit `contracts/.env`:

```bash
# Your wallet private key (no 0x prefix)
PRIVATE_KEY=your_private_key_here

# Get from https://www.alchemy.com/
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Get from https://etherscan.io/myapikey
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 📊 What Gets Deployed

1. **YieldOptimizerUSDC** - ERC4626 vault contract
2. **AaveV3Adapter** - Aave V3 protocol adapter
3. **Configuration** - Aave protocol added to vault (ID: 0)

## 🧪 Testing

After deployment:

1. Copy vault address from deployment output
2. Update `.env`: `VITE_VAULT_ADDRESS=0xYourAddress`
3. Start frontend: `npm run dev`
4. Connect MetaMask to Sepolia
5. Test deposit flow:
    - Enter amount (e.g., "5")
    - Click "Deposit & Start Earning"
    - Approve USDC (first tx)
    - Deposit (second tx)
    - See success message!

## 🔍 Verify Deployment

**On Etherscan:**

```
https://sepolia.etherscan.io/address/YOUR_VAULT_ADDRESS
```

**Check your position:**

```bash
# Your shares
cast call YOUR_VAULT_ADDRESS \
  "balanceOf(address)(uint256)" YOUR_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL

# Your USDC value
SHARES=$(cast call YOUR_VAULT_ADDRESS "balanceOf(address)(uint256)" YOUR_ADDRESS --rpc-url $SEPOLIA_RPC_URL)
cast call YOUR_VAULT_ADDRESS \
  "convertToAssets(uint256)(uint256)" $SHARES \
  --rpc-url $SEPOLIA_RPC_URL
```

## ⚠️ Important Notes

-   This is **testnet only** - never use mainnet keys
-   Save your vault address - you'll need it for all interactions
-   Contracts are automatically verified if you set `ETHERSCAN_API_KEY`
-   Make sure MetaMask is on **Ethereum Sepolia** network

## 📚 Additional Resources

-   **Full Guide**: See `DEPLOYMENT_GUIDE.md` (updated for Sepolia)
-   **Quick Commands**: See `QUICK_REFERENCE.md`
-   **Testing Checklist**: See `TESTING_CHECKLIST.md`
-   **Vincent Integration**: See `VINCENT_BOUNTY_PLAN.md`

## 🎯 Next Steps

After successful deployment and testing:

-   [ ] Test withdraw functionality
-   [ ] Add more protocol adapters
-   [ ] Build Vincent automation backend
-   [ ] Consider mainnet deployment

---

**Need help?** Check the troubleshooting section in `DEPLOYMENT_GUIDE.md` 🚀
