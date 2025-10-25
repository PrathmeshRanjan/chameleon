# 🎯 Quick Reference Card - Arbitrum Sepolia Testing

## 🔗 Important Addresses

```
Network: Arbitrum Sepolia
Chain ID: 421614
RPC: https://sepolia-rollup.arbitrum.io/rpc

USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
Aave V3 Pool: 0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff
```

## 🚰 Faucets

**Get Arbitrum Sepolia ETH:**

-   https://www.alchemy.com/faucets/arbitrum-sepolia
-   https://faucet.quicknode.com/arbitrum/sepolia

**Get Testnet USDC:**

-   https://faucet.circle.com/ (Select "Arbitrum Sepolia")

## ⚡ Quick Deploy

```bash
cd contracts

# 1. Setup environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and RPC_URL

# 2. Run deploy script
./deploy.sh

# 3. Copy vault address from output
# Update root .env: VITE_VAULT_ADDRESS=0xYourAddress
```

## 🧪 Quick Test

```bash
# Start frontend
npm run dev

# In browser (http://localhost:5173):
# 1. Connect wallet (Arbitrum Sepolia)
# 2. Enter amount (e.g., "5")
# 3. Click "Deposit & Start Earning"
# 4. Approve USDC (first tx)
# 5. Deposit (second tx)
# 6. See success message!
```

## 📊 Quick Checks

**Check USDC Balance:**

```bash
cast call 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
  "balanceOf(address)(uint256)" YOUR_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

**Check Vault Shares:**

```bash
cast call YOUR_VAULT_ADDRESS \
  "balanceOf(address)(uint256)" YOUR_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

**Check Your Position Value:**

```bash
# First get your shares
SHARES=$(cast call YOUR_VAULT_ADDRESS "balanceOf(address)(uint256)" YOUR_ADDRESS --rpc-url $ARBITRUM_SEPOLIA_RPC_URL)

# Then convert to USDC value
cast call YOUR_VAULT_ADDRESS \
  "convertToAssets(uint256)(uint256)" $SHARES \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

## 🔍 Explorer Links

**View Your Transactions:**

```
https://sepolia.arbiscan.io/address/YOUR_ADDRESS
```

**View Vault Contract:**

```
https://sepolia.arbiscan.io/address/YOUR_VAULT_ADDRESS
```

## 🐛 Common Issues

| Issue                | Solution                                             |
| -------------------- | ---------------------------------------------------- |
| "Insufficient funds" | Get testnet ETH from faucet                          |
| "User rejected"      | Click confirm in MetaMask                            |
| "Nonce too low"      | Reset MetaMask: Settings → Advanced → Clear Activity |
| Balance not showing  | Restart dev server, check VITE_VAULT_ADDRESS         |
| Button disabled      | Connect wallet, check USDC balance                   |

## 📝 Expected Flow

```
1. User clicks "Deposit & Start Earning"
   ↓
2. Button: "Approving USDC..."
   → MetaMask: Approve USDC spending
   ↓
3. Button: "Depositing..."
   → MetaMask: Confirm deposit
   ↓
4. Button: "✓ Deposited Successfully!"
   → Green success message
   → Form resets after 3s
```

## 🎯 What You Should See

**After Approval:**

-   ✅ Transaction confirmed on Arbiscan
-   ✅ Allowance set for vault

**After Deposit:**

-   ✅ USDC balance decreased
-   ✅ syUSDC shares in wallet
-   ✅ Position shows in UI
-   ✅ Vault has your USDC
-   ✅ Can see shares on Arbiscan

## 🛠️ Useful Commands

**Check Gas Price:**

```bash
cast gas-price --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

**Estimate Gas:**

```bash
cast estimate --from YOUR_ADDRESS --to VAULT_ADDRESS \
  "deposit(uint256,address)" 1000000 YOUR_ADDRESS \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

**Get Transaction Receipt:**

```bash
cast receipt YOUR_TX_HASH --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

**Call Vault Functions:**

```bash
# Total USDC in vault
cast call VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $ARBITRUM_SEPOLIA_RPC_URL

# Total syUSDC supply
cast call VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $ARBITRUM_SEPOLIA_RPC_URL

# Your metadata
cast call VAULT_ADDRESS "userMetadata(address)" YOUR_ADDRESS --rpc-url $ARBITRUM_SEPOLIA_RPC_URL
```

## 📞 Support Resources

-   **Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
-   **Vincent Plan**: See `VINCENT_BOUNTY_PLAN.md`
-   **Contract Code**: See `contracts/src/YieldOptimizerUSDC.sol`
-   **React Hook**: See `src/hooks/useYieldVault.ts`

---

💡 **Pro Tip**: Save your vault address! You'll need it for all future interactions.
