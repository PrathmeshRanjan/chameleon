# YieldPro Deployment Guide - Base → Arbitrum Cross-Chain Demo

Complete step-by-step guide to deploy and test the Vincent-powered cross-chain yield optimization system.

## 📋 Overview

This guide walks you through deploying:
1. **Base Vault** - Users deposit USDC here, earns from Aave V3
2. **Arbitrum Vault** - Higher yield from Morpho Blue
3. **VincentAutomation** - AI-powered cross-chain rebalancing
4. **Vincent Backend** - APY monitoring and decision engine

**Demo Workflow:**
```
User deposits 100 USDC on Base
        ↓
Sits in Base vault earning from Base Aave (e.g., 3.5% APY)
        ↓
Vincent detects Arbitrum Morpho has higher APY (e.g., 5.8% APY)
        ↓
Vincent withdraws from Base vault
        ↓
Nexus bridges Base → Arbitrum
        ↓
Vincent deposits into Arbitrum Morpho
        ↓
User now earning 5.8% APY on Arbitrum (2.3% gain!)
```

---

## ⚠️ Prerequisites

### Required Tools
- [ ] **Foundry** - `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- [ ] **Node.js v18+** - `node --version`
- [ ] **Git**

### Required Accounts
- [ ] Deployer Wallet (~0.2 ETH total: Base + Arbitrum)
- [ ] Vincent Executor Wallet (~0.2 ETH total: Base + Arbitrum)
- [ ] RPC Provider (Alchemy or Infura)
- [ ] Basescan + Arbiscan API keys

---

## 🚀 Step 1: Environment Setup

```bash
cd /home/manibajpai/YieldPro/YieldStar

# Install dependencies
npm install
cd contracts && forge install && cd ..

# Configure environment
cp .env.example .env
nano .env  # Fill in your values
```

**Required `.env` values:**
```bash
PRIVATE_KEY=0x...
VINCENT_EXECUTOR_ADDRESS=0x...
VINCENT_PRIVATE_KEY=0x...
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASESCAN_API_KEY=YOUR_KEY
ARBISCAN_API_KEY=YOUR_KEY
```

---

## 🏗️ Step 2: Deploy Base Infrastructure

```bash
cd contracts

# Deploy on Base
forge script script/Deploy.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Save addresses to `.env`:**
```bash
BASE_VAULT_ADDRESS=0x...      # From deployment output
BASE_AAVE_ADAPTER=0x...       # From deployment output
```

---

## 🏗️ Step 3: Deploy Arbitrum Infrastructure

```bash
# Deploy on Arbitrum
forge script script/DeployArbitrum.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

**Save addresses to `.env`:**
```bash
ARBITRUM_VAULT_ADDRESS=0x...        # From deployment output
ARBITRUM_AAVE_ADAPTER=0x...         # From deployment output
ARBITRUM_MORPHO_ADAPTER=0x...       # From deployment output
```

---

## 🤖 Step 4: Deploy VincentAutomation

```bash
# Deploy on Base (primary chain)
forge script script/DeployMultiChain.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Save address:**
```bash
VINCENT_AUTOMATION_ADDRESS=0x...
```

**Update Arbitrum vault:**
```bash
cast send $ARBITRUM_VAULT_ADDRESS \
  "setVincentAutomation(address)" \
  $VINCENT_AUTOMATION_ADDRESS \
  --rpc-url $ARBITRUM_RPC_URL \
  --private-key $PRIVATE_KEY
```

---

## 📊 Step 5: Test Vincent Monitoring

```bash
cd vincent
npm install

# Test APY monitoring
npm run monitor
```

**Expected output:**
```
📊 Monitoring Base (Chain ID: 8453)
  ✅ APY: 3.45% | Aave V3

📊 Monitoring Arbitrum (Chain ID: 42161)
  ✅ APY: 5.80% | Morpho Blue

🎯 Top Opportunities:
1. Base → Arbitrum 🌉
   Gain: 2.35% APY ✅
```

---

## 🧪 Step 6: Test Demo Workflow

### Deposit USDC on Base
```bash
# Approve vault
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "approve(address,uint256)" \
  $BASE_VAULT_ADDRESS \
  100000000 \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY

# Deposit 100 USDC
cast send $BASE_VAULT_ADDRESS \
  "deposit(uint256,address)" \
  100000000 \
  $TEST_USER \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY
```

### Enable Auto-Rebalancing
```bash
cast send $BASE_VAULT_ADDRESS \
  "updateGuardrails(uint256,uint256,uint256,bool)" \
  100 5000000 50 true \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY
```

### Trigger Rebalancing
```bash
cd vincent
TEST_USER_ADDRESS=$TEST_USER npm run rebalance
```

**Expected:**
```
✅ Transaction submitted: 0x...
🌉 Cross-chain bridge initiated
✅ Rebalancing completed
```

### Verify Transfer
```bash
# Wait 5-10 minutes for bridge, then check:
cast call $ARBITRUM_VAULT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $TEST_USER \
  --rpc-url $ARBITRUM_RPC_URL
```

---

## ✅ Success Checklist

- [ ] Base vault deployed and verified
- [ ] Arbitrum vault deployed and verified
- [ ] VincentAutomation deployed
- [ ] Vincent monitoring works
- [ ] User can deposit on Base
- [ ] Cross-chain rebalance executes
- [ ] Funds arrive on Arbitrum

---

## 🐛 Troubleshooting

**"VaultNotRegistered" error:**
```bash
cast send $VINCENT_AUTOMATION_ADDRESS \
  "registerVault(uint256,address)" \
  42161 $ARBITRUM_VAULT_ADDRESS \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
```

**APY monitor shows no data:**
- Verify adapter addresses in `.env`
- Check RPC URLs are correct

**Bridge fails:**
- Set Nexus contract address in vault
- Ensure sufficient gas on both chains

---

## 📈 Next Steps

1. **Production:** Set up multi-sig for vault owner
2. **Monitoring:** Configure Slack/email alerts
3. **Scaling:** Add Ethereum and Optimism chains
4. **Testing:** Test with multiple users

---

**Deployment Complete!** 🎉

Your cross-chain yield optimizer is live with Vincent AI automation.
