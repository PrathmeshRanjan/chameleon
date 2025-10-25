# 🚀 Arbitrum Sepolia Deployment Guide

Complete guide to deploy and test your Smart Yield Optimizer on Arbitrum Sepolia testnet.

---

## 📋 Prerequisites

### 1. Get Arbitrum Sepolia ETH (for gas)

You need testnet ETH on Arbitrum Sepolia for deployment and transactions.

**Option A: Arbitrum Bridge from Sepolia**

1. Get Sepolia ETH from [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia) or [Infura Faucet](https://www.infura.io/faucet/sepolia)
2. Bridge to Arbitrum Sepolia: https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia

**Option B: Direct Arbitrum Sepolia Faucet**

-   https://faucet.quicknode.com/arbitrum/sepolia
-   https://www.alchemy.com/faucets/arbitrum-sepolia

### 2. Get Testnet USDC

Get USDC on Arbitrum Sepolia for testing deposits:

-   Circle Faucet: https://faucet.circle.com/
-   Select "Arbitrum Sepolia" and enter your wallet address
-   You'll receive 10 USDC for testing

### 3. Get RPC URL

Sign up for a free Alchemy account and create an Arbitrum Sepolia app:

1. Go to https://www.alchemy.com/
2. Create account and new app
3. Select "Arbitrum Sepolia" network
4. Copy the HTTPS RPC URL

### 4. Get Arbiscan API Key (Optional, for verification)

1. Create account at https://arbiscan.io/
2. Go to https://arbiscan.io/myapikey
3. Generate new API key

---

## ⚙️ Setup

### 1. Configure Environment Variables

```bash
cd contracts
cp .env.example .env
```

Edit `.env` and fill in:

```bash
# Your wallet private key (from MetaMask)
PRIVATE_KEY=your_private_key_without_0x_prefix

# Your Alchemy RPC URL
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY

# Your Arbiscan API key (for verification)
ETHERSCAN_API_KEY=your_arbiscan_api_key
```

### 2. Make Sure You Have Enough ETH

Check your balance:

```bash
cast balance YOUR_WALLET_ADDRESS --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

You need at least **0.01 ETH** for deployment.

---

## 🏗️ Deployment

### 1. Build Contracts

```bash
cd contracts
forge build
```

Expected output: ✅ All contracts compile successfully

### 2. Deploy to Arbitrum Sepolia

```bash
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

**What this does:**

-   Deploys `YieldOptimizerUSDC` vault contract
-   Deploys `AaveV3Adapter` protocol adapter
-   Adds Aave V3 protocol to vault (ID: 0)
-   Verifies contracts on Arbiscan

**Expected output:**

```
=== Deploying YieldOptimizerUSDC Vault ===
YieldOptimizerUSDC deployed at: 0xYourVaultAddress

=== Deploying AaveV3Adapter ===
AaveV3Adapter deployed at: 0xYourAdapterAddress

=== Adding Aave V3 protocol to vault ===
Aave V3 protocol added with ID: 0

========================================
DEPLOYMENT SUMMARY
========================================
Network: Arbitrum Sepolia
Chain ID: 421614
Deployer: 0xYourAddress

Contracts:
- YieldOptimizerUSDC: 0xVaultAddress
- AaveV3Adapter: 0xAdapterAddress
```

### 3. Copy Vault Address

From the deployment output, copy the `YieldOptimizerUSDC` address.

### 4. Update Frontend Environment

```bash
cd .. # Back to root directory
echo "VITE_VAULT_ADDRESS=0xYourVaultAddress" >> .env
```

---

## 🧪 Testing the Deposit Flow

### 1. Start the Frontend

```bash
npm run dev
```

### 2. Connect Wallet

-   Open http://localhost:5173
-   Connect your MetaMask wallet
-   Make sure you're on **Arbitrum Sepolia** network

### 3. Check USDC Balance

Your wallet should show the USDC balance from the Circle faucet.

### 4. Test Deposit

**Step 1: Approve USDC**

1. Enter amount (e.g., "5" for 5 USDC)
2. Click "Deposit & Start Earning"
3. Button shows "Approving USDC..."
4. MetaMask will ask to approve USDC spending
5. Confirm transaction

**Step 2: Deposit to Vault**

1. After approval confirms, button shows "Depositing..."
2. MetaMask will ask to confirm deposit
3. Confirm transaction
4. Wait for confirmation

**Step 3: Success!**

1. Button shows "✓ Deposited Successfully!"
2. Green success message appears
3. You'll see your vault position below the input
4. Form resets after 3 seconds

### 5. Verify on Arbiscan

**Check your deposit:**

1. Go to https://sepolia.arbiscan.io/
2. Search for your vault address
3. Go to "Contract" → "Read Contract"
4. Call `balanceOf(yourAddress)` to see your syUSDC shares
5. Call `convertToAssets(yourShares)` to see USDC value

**Check vault stats:**

1. Call `totalAssets()` to see total USDC in vault
2. Call `totalSupply()` to see total syUSDC shares

---

## 🔍 Contract Verification

Your contracts should auto-verify during deployment. If verification fails:

```bash
# Verify YieldOptimizerUSDC
forge verify-contract \
  0xYourVaultAddress \
  src/YieldOptimizerUSDC.sol:YieldOptimizerUSDC \
  --chain-id 421614 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" 0xUSDC 0xTreasury 0xNexus)

# Verify AaveV3Adapter
forge verify-contract \
  0xYourAdapterAddress \
  src/adapters/AaveV3Adapter.sol:AaveV3Adapter \
  --chain-id 421614 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xAavePool 0xVault)
```

---

## 📊 Monitoring & Debugging

### Check Transaction Status

```bash
cast receipt YOUR_TX_HASH --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

### Check USDC Balance

```bash
cast call 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
  "balanceOf(address)(uint256)" \
  YOUR_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

### Check Vault Balance

```bash
cast call YOUR_VAULT_ADDRESS \
  "balanceOf(address)(uint256)" \
  YOUR_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

### Check Approval

```bash
cast call 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
  "allowance(address,address)(uint256)" \
  YOUR_ADDRESS \
  YOUR_VAULT_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

---

## 🐛 Troubleshooting

### "Insufficient funds" error

-   Make sure you have enough Arbitrum Sepolia ETH
-   Check balance: `cast balance YOUR_ADDRESS --rpc-url $ARBITRUM_SEPOLIA_RPC_URL`

### "Nonce too low" error

-   Reset MetaMask account: Settings → Advanced → Clear Activity Tab Data

### "User rejected transaction"

-   This is normal, user cancelled in MetaMask
-   Try again

### Contracts not verifying

-   Wait 1-2 minutes after deployment
-   Try manual verification command (see above)
-   Check Arbiscan API key is correct

### UI not showing balance

-   Make sure VITE_VAULT_ADDRESS is set correctly in `.env`
-   Restart dev server: `npm run dev`
-   Check browser console for errors (F12)

### Deposit button disabled

-   Connect wallet to Arbitrum Sepolia network
-   Make sure you have USDC balance
-   Enter valid amount > 0

---

## 🎯 What You're Testing

### Deposit Flow ✅

1. **USDC Approval**: User approves vault to spend USDC
2. **Vault Deposit**: User deposits USDC, receives syUSDC shares
3. **Share Calculation**: ERC4626 automatically calculates shares
4. **Position Tracking**: Vault tracks user's deposit metadata
5. **Guardrails Setup**: Default guardrails set for user

### Smart Contract Features ✅

-   ✅ ERC4626 tokenized vault
-   ✅ Auto-compounding yield (via share price)
-   ✅ User guardrails system
-   ✅ Protocol adapter architecture
-   ✅ Vincent automation hooks (ready but not active)
-   ✅ Fee management (performance + management fees)
-   ✅ Emergency pause functionality

### Frontend Features ✅

-   ✅ Wallet connection
-   ✅ Balance display (USDC + vault position)
-   ✅ Two-step deposit (approve + deposit)
-   ✅ Transaction status tracking
-   ✅ Error handling with user-friendly messages
-   ✅ Success feedback
-   ✅ Auto-reset form

---

## 🔐 Security Notes

### ⚠️ Testnet Only

-   This is testnet deployment
-   Private key in `.env` is for testing only
-   **NEVER** commit `.env` to git
-   **NEVER** use mainnet private keys on testnet

### 🛡️ Before Mainnet

-   [ ] Complete security audit
-   [ ] Set proper treasury address
-   [ ] Configure fee parameters
-   [ ] Set Vincent automation address
-   [ ] Deploy protocol adapters for production
-   [ ] Test all edge cases
-   [ ] Set up monitoring and alerts

---

## 📝 Post-Deployment Checklist

-   [ ] Vault deployed and verified on Arbiscan
-   [ ] Aave adapter deployed and verified
-   [ ] Aave protocol added to vault (ID: 0)
-   [ ] Frontend `.env` updated with vault address
-   [ ] Wallet connected to Arbitrum Sepolia
-   [ ] Testnet USDC obtained from faucet
-   [ ] Approval transaction successful
-   [ ] Deposit transaction successful
-   [ ] Balance shows correctly in UI
-   [ ] Vault position displays correctly
-   [ ] Can see shares on Arbiscan
-   [ ] Transaction history visible on Arbiscan

---

## 🚀 Next Steps After Testing

### 1. Test Withdraw Flow

-   Build withdraw UI component
-   Test withdrawing partial amounts
-   Test full withdrawal

### 2. Add More Protocols

-   Deploy Compound V3 adapter
-   Add more yield sources
-   Test cross-protocol functionality

### 3. Build Vincent Backend

-   Follow `VINCENT_BOUNTY_PLAN.md`
-   Set up Node.js backend
-   Integrate Lit Protocol
-   Build custom abilities
-   Test automated rebalancing

### 4. Production Deployment

-   Deploy to Arbitrum mainnet
-   Use real treasury address
-   Set proper fee parameters
-   Complete security audit
-   Set up monitoring

---

## 📚 Useful Links

-   **Arbitrum Sepolia Explorer**: https://sepolia.arbiscan.io/
-   **Arbitrum Bridge**: https://bridge.arbitrum.io/
-   **USDC Faucet**: https://faucet.circle.com/
-   **Alchemy Dashboard**: https://dashboard.alchemy.com/
-   **Aave V3 Docs**: https://docs.aave.com/developers/
-   **Foundry Book**: https://book.getfoundry.sh/

---

## 💬 Questions?

If you encounter any issues:

1. Check the troubleshooting section above
2. Review transaction on Arbiscan
3. Check browser console (F12) for errors
4. Verify environment variables are set correctly
5. Make sure you're on Arbitrum Sepolia network

Happy testing! 🎉
