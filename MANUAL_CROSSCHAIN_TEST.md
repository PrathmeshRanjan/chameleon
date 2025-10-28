# Manual Cross-Chain Rebalancing Test

This guide will help you test Avail Nexus cross-chain bridging **manually without Vincent automation**.

## Prerequisites

✅ Contracts deployed on:

-   Ethereum Sepolia: Vault `0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a`
-   Base Sepolia: Vault `0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81`

✅ Requirements:

-   Sepolia ETH for gas (get from [Sepolia faucet](https://sepoliafaucet.com/))
-   Sepolia USDC (get from [Aave faucet](https://staging.aave.com/faucet/))
-   Base Sepolia ETH for gas
-   Node.js and npm installed

---

## Test Flow Overview

```
1. Deposit USDC to Sepolia Vault (on-chain)
   └─ Your USDC → Sepolia Vault

2. Trigger Cross-Chain Rebalance (on-chain)
   └─ Vault approves you to spend USDC
   └─ Emits CrossChainRebalanceInitiated event

3. Use Nexus SDK to Bridge (off-chain)
   └─ Pull USDC from vault (transferFrom)
   └─ Bridge USDC to Base Sepolia
   └─ Call adapter.deposit() on destination

4. Verify (on-chain)
   └─ Check Base Sepolia adapter has deposited to Aave
```

---

## Option 1: Automated Test Script (Recommended)

### Step 1: Run the on-chain part

```bash
cd /Users/prathmeshranjan/Desktop/Chameleon
./test-cross-chain.sh
```

This will:

-   Deposit USDC to Sepolia vault (if needed)
-   Set user guardrails
-   Call `vault.executeRebalance()` to initiate cross-chain rebalance
-   Vault will approve your address to spend USDC

### Step 2: Run the Nexus bridging part

```bash
cd nexus-test

# Install dependencies
npm install

# Run the bridge script
npm run bridge
```

This will:

-   Initialize Nexus SDK
-   Use `transferFrom` to pull USDC from vault
-   Bridge USDC from Sepolia to Base Sepolia
-   Execute `adapter.deposit()` on Base Sepolia

### Step 3: Verify

Check on Base Sepolia that:

-   Adapter has deposited USDC to Aave
-   aUSDC balance increased
-   Transaction succeeded

---

## Option 2: Manual Step-by-Step (Using Foundry)

### Step 1: Get Testnet Tokens

```bash
# Get Sepolia ETH
# Visit: https://sepoliafaucet.com/

# Get Sepolia USDC
# Visit: https://staging.aave.com/faucet/
# Select Sepolia testnet
# Request USDC tokens
```

### Step 2: Deposit to Vault

```bash
cd contracts

# Run cast commands to deposit
export SEPOLIA_VAULT=0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a
export USDC_SEPOLIA=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
export PRIVATE_KEY=your_private_key
export SEPOLIA_RPC_URL=your_rpc_url

# Approve vault to spend USDC
cast send $USDC_SEPOLIA \
  "approve(address,uint256)" \
  $SEPOLIA_VAULT \
  100000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Deposit 100 USDC to vault
cast send $SEPOLIA_VAULT \
  "deposit(uint256,address)" \
  100000000 \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Step 3: Set Guardrails

```bash
# Set user guardrails (required before rebalancing)
cast send $SEPOLIA_VAULT \
  "updateGuardrails(uint256,uint256,uint256,bool)" \
  500 \
  10000000000000000000 \
  25 \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Step 4: Trigger Cross-Chain Rebalance

```bash
# This is complex - easier to use the Forge script:
forge script script/TestCrossChainRebalance.s.sol:TestCrossChainRebalance \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### Step 5: Bridge with Nexus

After the on-chain transaction succeeds, the vault has approved you to spend USDC.

Now you need to use Nexus SDK (see Option 1, Step 2 above) or use the Nexus Dashboard manually.

---

## Option 3: Using Nexus Dashboard (No Code)

### Step 1-4: Same as Option 2

Complete steps 1-4 from Option 2 to get to the point where the vault has approved you.

### Step 5: Manual Bridge via Nexus Dashboard

```bash
# 1. Go to Nexus Dashboard
open https://nexus.availproject.org

# 2. Connect your wallet (same address that deployed contracts)

# 3. Configure bridge:
#    - From: Ethereum Sepolia
#    - To: Base Sepolia
#    - Token: USDC
#    - Amount: 10 USDC
#    - Advanced: Set destination contract to Base Sepolia Adapter
#      0x73951d806B2f2896e639e75c413DD09bA52f61a6

# 4. Execute the bridge transaction

# 5. Wait for confirmation (2-10 minutes)
```

---

## Verification Commands

### Check Sepolia Vault State

```bash
export SEPOLIA_VAULT=0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a

# Your vault shares
cast call $SEPOLIA_VAULT \
  "balanceOf(address)(uint256)" \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $SEPOLIA_RPC_URL

# Total vault assets
cast call $SEPOLIA_VAULT \
  "totalAssets()(uint256)" \
  --rpc-url $SEPOLIA_RPC_URL

# USDC allowance to your address (should be set after executeRebalance)
export USDC_SEPOLIA=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
cast call $USDC_SEPOLIA \
  "allowance(address,address)(uint256)" \
  $SEPOLIA_VAULT \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $SEPOLIA_RPC_URL
```

### Check Base Sepolia Adapter State

```bash
export BASE_SEPOLIA_ADAPTER=0x73951d806B2f2896e639e75c413DD09bA52f61a6
export USDC_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export BASE_SEPOLIA_RPC_URL=your_base_sepolia_rpc

# Check adapter's aUSDC balance (should increase after bridge)
export AUSDC_BASE_SEPOLIA=0x5ba7fd868c40c16f7aDfAe6CF87121E13FC2F7a0

cast call $AUSDC_BASE_SEPOLIA \
  "balanceOf(address)(uint256)" \
  $BASE_SEPOLIA_ADAPTER \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## Expected Results

### After Step 2 (On-Chain Rebalance Initiated)

✅ Transaction succeeds  
✅ Event `CrossChainRebalanceInitiated` emitted  
✅ Vault has approved your address to spend USDC  
✅ You can see the approval with the verification command above

### After Step 5 (Nexus Bridge Complete)

✅ USDC transferred from Sepolia to Base Sepolia  
✅ Base Sepolia adapter receives USDC  
✅ Adapter deposits USDC to Aave on Base Sepolia  
✅ Adapter's aUSDC balance increases  
✅ Event `ProtocolDeposit` emitted on Base Sepolia

---

## Troubleshooting

### "Only Vincent automation" Error

**Problem**: You get this error when calling `executeRebalance()`

**Solution**: You deployed the vault with your address as Vincent, so you should be able to call it. Check:

```bash
# Verify your address matches Vincent automation address
cast call $SEPOLIA_VAULT \
  "vincentAutomation()(address)" \
  --rpc-url $SEPOLIA_RPC_URL
```

If it doesn't match, you need to update it:

```bash
# Update Vincent address (only owner can do this)
cast send $SEPOLIA_VAULT \
  "setVincentAutomation(address)" \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### "Insufficient USDC balance"

**Problem**: Vault doesn't have enough USDC

**Solution**: Deposit more USDC first (see Step 2 above)

### "Gas ceiling exceeded"

**Problem**: Estimated gas cost is higher than your guardrails allow

**Solution**: Increase gas ceiling in guardrails:

```bash
cast send $SEPOLIA_VAULT \
  "updateGuardrails(uint256,uint256,uint256,bool)" \
  500 \
  20000000000000000000 \
  25 \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Nexus Bridge Fails

**Problem**: Nexus SDK throws an error

**Solutions**:

1. Check you have enough USDC approved
2. Verify destination adapter address is correct
3. Ensure both chains have gas tokens
4. Check Nexus network status
5. Try using Nexus Dashboard instead of SDK

---

## What This Simulates

This manual test simulates what Vincent automation will do:

1. **Monitor Events** → You manually run the script
2. **Validate Guardrails** → Script checks guardrails
3. **Execute Rebalance** → Script calls `executeRebalance()`
4. **Bridge with Nexus** → You use Nexus SDK (or dashboard)
5. **Verify Result** → You check final state

Once this works manually, Vincent can do it automatically!

---

## Next Steps After Successful Test

1. ✅ Verify the entire flow works end-to-end
2. 🔧 Build Vincent automation service
3. 📊 Implement yield monitoring
4. 🔄 Add automatic triggering based on APY differences
5. 🚀 Deploy Vincent to run 24/7

See `NEXUS_INTEGRATION.md` and `VINCENT_ABILITIES_REVIEW.md` for implementation details.
