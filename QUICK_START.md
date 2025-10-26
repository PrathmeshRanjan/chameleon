# YieldPro Quick Start - Deployment Ready

## ✅ Configuration Complete

Your environment is now configured with:

### Vincent AI Setup
- **App ID:** 7506411077
- **Executor Address:** 0x8c8569c5A1A810E10C55741c2c6a86F2355FB324
- **Private Key:** Configured ✓
- **Abilities:**
  - `@lit-protocol/vincent-ability-erc20-approval`
  - `@lit-protocol/vincent-ability-erc20-transfer`
  - `@lit-protocol/vincent-ability-evm-transaction-signer`
  - `@lit-protocol/vincent-ability-morpho`
  - `@vaultlayer/vincent-ability-call-contract`

### RPC URLs (Alchemy)
- **Base:** Configured ✓
- **Arbitrum:** Configured ✓

### API Keys
- **Etherscan/Basescan/Arbiscan:** Configured ✓

### Protocol Addresses
- **Morpho Blue:** 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb (all chains)

---

## ⚠️ Before Deployment - Complete These

### 1. Add Your Deployer Private Key
Edit `.env` line 27:
```bash
PRIVATE_KEY=YOUR_ACTUAL_DEPLOYER_WALLET_PRIVATE_KEY
```

### 2. Get Full Morpho IRM Addresses

The screenshots show truncated addresses. Get the full addresses from:

**Option A: From Morpho App**
1. Go to https://app.morpho.org/base
2. Select any USDC market
3. Click on "Market Details"
4. Copy the full IRM address

**Option B: From Block Explorers**
- Base: https://basescan.org/address/0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb#readContract
- Arbitrum: https://arbiscan.io/address/0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb#readContract

Then update `.env`:
```bash
MORPHO_IRM_BASE=0x46415998764C29aB2a25CbeA625414... (full address)
MORPHO_IRM_ARBITRUM=0x66F30587F8BD4206918... (full address)
```

### 3. Fund Vincent Executor Wallet

Your Vincent executor needs ETH for gas:
```bash
# Check current balance
cast balance 0x8c8569c5A1A810E10C55741c2c6a86F2355FB324 --rpc-url $BASE_RPC_URL
cast balance 0x8c8569c5A1A810E10C55741c2c6a86F2355FB324 --rpc-url $ARBITRUM_RPC_URL

# Send at least:
# Base: 0.05 ETH
# Arbitrum: 0.05 ETH
```

### 4. Fund Deployer Wallet

Your deployer wallet also needs ETH:
```bash
# Base: 0.05 ETH
# Arbitrum: 0.05 ETH
```

---

## 🚀 Deployment Steps (Once Ready)

### Step 1: Deploy Base Vault

```bash
cd contracts

# Deploy on Base Mainnet
forge script script/Deploy.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# Copy the addresses from output to .env:
# BASE_VAULT_ADDRESS=...
# BASE_AAVE_ADAPTER=...
```

### Step 2: Deploy Arbitrum Vault

```bash
# Deploy on Arbitrum Mainnet
forge script script/DeployArbitrum.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY

# Copy addresses to .env:
# ARBITRUM_VAULT_ADDRESS=...
# ARBITRUM_AAVE_ADAPTER=...
# ARBITRUM_MORPHO_ADAPTER=...
```

### Step 3: Deploy VincentAutomation

```bash
# Deploy on Base (primary chain)
forge script script/DeployMultiChain.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# Copy to .env:
# VINCENT_AUTOMATION_ADDRESS=...
```

### Step 4: Update Arbitrum Vault

```bash
# Set Vincent address in Arbitrum vault
cast send $ARBITRUM_VAULT_ADDRESS \
  "setVincentAutomation(address)" \
  $VINCENT_AUTOMATION_ADDRESS \
  --rpc-url $ARBITRUM_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Step 5: Test Vincent Monitoring

```bash
cd ../vincent
npm install

# Test APY monitoring
npm run monitor

# Expected: Should show APY data from Base and Arbitrum
```

---

## 🧪 Testing the Demo

### Prepare Test User
```bash
# Use your test wallet or create new one
export TEST_USER=YOUR_TEST_WALLET_ADDRESS
export TEST_USER_PRIVATE_KEY=YOUR_TEST_WALLET_PRIVATE_KEY

# Fund with 100 USDC on Base
# Get USDC from exchange or bridge
```

### Execute Demo Workflow

1. **Approve USDC**
```bash
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "approve(address,uint256)" \
  $BASE_VAULT_ADDRESS \
  100000000 \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY
```

2. **Deposit to Base Vault**
```bash
cast send $BASE_VAULT_ADDRESS \
  "deposit(uint256,address)" \
  100000000 \
  $TEST_USER \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY
```

3. **Enable Auto-Rebalancing**
```bash
cast send $BASE_VAULT_ADDRESS \
  "updateGuardrails(uint256,uint256,uint256,bool)" \
  100 5000000 50 true \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY
```

4. **Trigger Rebalancing**
```bash
cd vincent
TEST_USER_ADDRESS=$TEST_USER npm run rebalance
```

5. **Verify on Arbitrum** (wait 5-10 min for bridge)
```bash
cast call $ARBITRUM_VAULT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $TEST_USER \
  --rpc-url $ARBITRUM_RPC_URL
```

---

## 📋 Current Status

✅ **Completed:**
- [x] Vincent configuration
- [x] RPC URLs configured
- [x] API keys configured
- [x] Morpho Blue address configured
- [x] Code compilation fixes
- [x] Deployment scripts created
- [x] Vincent monitoring setup

⚠️ **Pending (You Need to Provide):**
- [ ] Deployer wallet private key
- [ ] Full Morpho IRM addresses (Base + Arbitrum)
- [ ] Fund Vincent executor wallet (0.1 ETH total)
- [ ] Fund deployer wallet (0.1 ETH total)
- [ ] Nexus contract address (later)

---

## 🆘 Need Help?

### Get Full Morpho IRM Address (Example)
```bash
# Query from Morpho Blue contract
cast call 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb \
  "market(bytes32)((address,address,address,address,uint256))" \
  <MARKET_ID> \
  --rpc-url $BASE_RPC_URL

# The 4th value in the tuple is the IRM address
```

### Check Vincent Executor Balance
```bash
cast balance 0x8c8569c5A1A810E10C55741c2c6a86F2355FB324 --rpc-url $BASE_RPC_URL
cast balance 0x8c8569c5A1A810E10C55741c2c6a86F2355FB324 --rpc-url $ARBITRUM_RPC_URL
```

### Verify Contract Compilation
```bash
cd contracts
forge build

# Should compile successfully with no errors
```

---

## 🎯 Next Actions

**Immediate (Do These Now):**
1. Add your deployer private key to `.env`
2. Get full Morpho IRM addresses and update `.env`
3. Fund both wallets (deployer + Vincent executor)

**Then Deploy:**
1. Run deployment scripts (Steps 1-4 above)
2. Test Vincent monitoring
3. Execute demo workflow

**You're almost ready to deploy! Just need the deployer key and full IRM addresses.** 🚀
