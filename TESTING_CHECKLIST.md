# 📋 Arbitrum Sepolia Testing Checklist

Use this checklist to track your testing progress.

## ✅ Pre-Deployment Setup

-   [ ] Created Alchemy account and got Arbitrum Sepolia RPC URL
-   [ ] Created Arbiscan account and got API key (optional)
-   [ ] Have MetaMask installed with test wallet
-   [ ] Got Arbitrum Sepolia ETH from faucet (≥ 0.01 ETH)
    -   Faucet: https://www.alchemy.com/faucets/arbitrum-sepolia
-   [ ] Got testnet USDC from Circle faucet (≥ 5 USDC)
    -   Faucet: https://faucet.circle.com/
-   [ ] Copied `.env.example` to `.env` in contracts folder
-   [ ] Filled in `PRIVATE_KEY` in contracts/.env
-   [ ] Filled in `ARBITRUM_SEPOLIA_RPC_URL` in contracts/.env
-   [ ] Filled in `ETHERSCAN_API_KEY` in contracts/.env (optional)

**Wallet Address:** ******\_\_\_\_******
**Balance Check:** ******\_\_\_\_****** ETH | ******\_\_\_\_****** USDC

---

## 🏗️ Deployment

-   [ ] Ran `cd contracts && forge build` successfully
-   [ ] All contracts compiled without errors
-   [ ] Ran `./deploy.sh` or manual deploy command
-   [ ] Deployment successful - got vault address
-   [ ] Deployment successful - got adapter address
-   [ ] Contracts verified on Arbiscan (if API key provided)

**Deployed Addresses:**

```
Vault (YieldOptimizerUSDC): 0x________________________
Aave Adapter: 0x________________________
Deployer: 0x________________________
```

**Verification Links:**

-   Vault: https://sepolia.arbiscan.io/address/0x**********\_\_\_\_**********
-   Adapter: https://sepolia.arbiscan.io/address/0x**********\_\_\_\_**********

---

## ⚙️ Frontend Setup

-   [ ] Updated root `.env` with `VITE_VAULT_ADDRESS=0xYourVaultAddress`
-   [ ] Ran `npm install` (if needed)
-   [ ] Ran `npm run dev`
-   [ ] Frontend loaded at http://localhost:5173
-   [ ] No console errors in browser (F12)

---

## 🔌 Wallet Connection

-   [ ] MetaMask installed and unlocked
-   [ ] Switched to Arbitrum Sepolia network in MetaMask
    -   Network name: Arbitrum Sepolia
    -   Chain ID: 421614
    -   RPC: https://sepolia-rollup.arbitrum.io/rpc
-   [ ] Connected wallet to app
-   [ ] Wallet address displayed in UI
-   [ ] USDC balance showing correctly in UI

**Connected Address:** 0x**********\_\_\_\_**********

---

## 💰 Test Deposit Flow

### Test 1: Small Deposit (1 USDC)

-   [ ] Entered amount: 1 USDC
-   [ ] Selected chain: (any) - vault on Arbitrum Sepolia
-   [ ] Selected token: USDC
-   [ ] Clicked "Deposit & Start Earning" button
-   [ ] Button showed "Approving USDC..."
-   [ ] MetaMask popup appeared for approval
-   [ ] Confirmed approval transaction
-   [ ] Approval transaction confirmed
-   [ ] Button showed "Depositing..."
-   [ ] MetaMask popup appeared for deposit
-   [ ] Confirmed deposit transaction
-   [ ] Deposit transaction confirmed
-   [ ] Button showed "✓ Deposited Successfully!"
-   [ ] Green success message appeared
-   [ ] Form reset after 3 seconds
-   [ ] Balance updated in UI
-   [ ] Position shows: ~1 USDC

**Approval Tx:** 0x**********\_\_\_\_**********
**Deposit Tx:** 0x**********\_\_\_\_**********

### Test 2: Larger Deposit (5 USDC)

-   [ ] Entered amount: 5 USDC
-   [ ] Deposit process completed successfully
-   [ ] Position updated: ~6 USDC total

**Deposit Tx:** 0x**********\_\_\_\_**********

### Test 3: Error Handling

-   [ ] Tried depositing 0 USDC → Button disabled ✓
-   [ ] Tried depositing without wallet → Connect prompt ✓
-   [ ] Tried depositing more than balance → Error shown ✓

---

## 🔍 On-Chain Verification

### Check on Arbiscan

-   [ ] Opened vault on Arbiscan: https://sepolia.arbiscan.io/address/YOUR_VAULT
-   [ ] Contract verified and readable
-   [ ] Went to "Contract" → "Read Contract"
-   [ ] Called `balanceOf(yourAddress)` - shows shares ✓
-   [ ] Called `convertToAssets(yourShares)` - shows USDC value ✓
-   [ ] Called `totalAssets()` - shows total USDC in vault ✓
-   [ ] Called `totalSupply()` - shows total shares ✓
-   [ ] Went to "Contract" → "Write Contract"
-   [ ] Can see `deposit`, `withdraw`, `updateGuardrails` functions ✓

**Your Shares:** ******\_\_\_\_****** syUSDC
**Your USDC Value:** ******\_\_\_\_****** USDC
**Total Vault Assets:** ******\_\_\_\_****** USDC

### Check Transactions

-   [ ] Found approval tx on Arbiscan
    -   Status: Success ✓
    -   Method: Approve
    -   To: USDC Contract
-   [ ] Found deposit tx on Arbiscan
    -   Status: Success ✓
    -   Method: Deposit
    -   To: Vault Contract
    -   Event: Deposited emitted ✓

---

## 🧪 Advanced Testing (Optional)

### Test Guardrails UI

-   [ ] Opened Automation tab (if Vincent UI integrated)
-   [ ] Can see default guardrails:
    -   Max Slippage: 100 bps (1%)
    -   Gas Ceiling: $10
    -   Min APY Diff: 50 bps (0.5%)
    -   Auto Rebalance: Enabled
-   [ ] Updated guardrails
-   [ ] Transaction confirmed
-   [ ] New guardrails reflected in UI

### Test Withdraw (if implemented)

-   [ ] Clicked withdraw button
-   [ ] Entered amount to withdraw
-   [ ] Transaction confirmed
-   [ ] USDC received back in wallet
-   [ ] Balance updated in UI

**Withdraw Tx:** 0x**********\_\_\_\_**********

### Test Edge Cases

-   [ ] Deposited 0.01 USDC (very small amount) → Works ✓
-   [ ] Deposited exact wallet balance → Works ✓
-   [ ] Tried depositing while paused (if paused) → Reverts ✓

---

## 📊 Performance Check

### Transaction Costs

| Action    | Gas Used   | Gas Price  | Cost (ETH) | Cost (USD) |
| --------- | ---------- | ---------- | ---------- | ---------- |
| Approval  | **\_\_\_** | **\_\_\_** | **\_\_\_** | **\_\_\_** |
| Deposit   | **\_\_\_** | **\_\_\_** | **\_\_\_** | **\_\_\_** |
| **Total** | **\_\_\_** | **\_\_\_** | **\_\_\_** | **\_\_\_** |

### Transaction Speed

| Action   | Time to Confirm    |
| -------- | ------------------ |
| Approval | **\_\_\_** seconds |
| Deposit  | **\_\_\_** seconds |

---

## 🐛 Issues Encountered

**List any issues you encountered and how you resolved them:**

1. Issue: ************************\_************************
   Solution: ************************\_************************

2. Issue: ************************\_************************
   Solution: ************************\_************************

3. Issue: ************************\_************************
   Solution: ************************\_************************

---

## ✅ Final Verification

-   [ ] All deposits successful
-   [ ] All transactions confirmed on Arbiscan
-   [ ] Balances correct in UI
-   [ ] Balances correct on-chain
-   [ ] No console errors
-   [ ] UI responsive and smooth
-   [ ] Error messages clear and helpful
-   [ ] Success feedback works well

---

## 📝 Notes & Observations

**What worked well:**

---

---

**What could be improved:**

---

---

**Suggestions for Vincent integration:**

---

---

**Other feedback:**

---

---

---

## 🎯 Next Steps

After completing all tests:

-   [ ] Document any bugs found
-   [ ] Save vault address for future use
-   [ ] Consider testing withdrawal flow
-   [ ] Consider adding more protocols
-   [ ] Consider building Vincent backend
-   [ ] Consider mainnet deployment

**Status:** ⬜ Not Started | 🔄 In Progress | ✅ Completed | ❌ Failed

**Overall Test Result:** ******\_\_\_\_******

**Date Completed:** ******\_\_\_\_******

---

## 🎉 Success Criteria

You've successfully completed testing if:

-   ✅ Vault deployed and verified
-   ✅ Can deposit USDC from UI
-   ✅ Transactions confirm on Arbiscan
-   ✅ Balances show correctly
-   ✅ No critical errors
-   ✅ User experience is smooth

**Congratulations! Your Smart Yield Optimizer is working! 🚀**

---

**Tester:** ******\_\_\_\_******
**Date:** ******\_\_\_\_******
**Version:** v1.0.0
