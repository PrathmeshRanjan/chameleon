#!/bin/bash

# 🚀 Demo Script: Cross-Chain Yield Optimization Flow
# Shows the complete flow: Deposit → Bridge → Yield Generation

set -e

echo "=================================================="
echo "🎯 CROSS-CHAIN YIELD OPTIMIZATION DEMO"
echo "=================================================="
echo ""

# Load environment
source .env

echo "📋 Demo Setup:"
echo "🏦 Base Vault: $BASE_VAULT_ADDRESS"
echo "🔄 Aave Adapter: $BASE_AAVE_ADAPTER"
echo "🌉 Nexus Bridge: $NEXUS_ADDRESS"
echo ""

echo "💰 Step 1: Check Vault Status"
echo "------------------------------"
VAULT_ASSETS=$(cast call $BASE_VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL)
echo "Current vault assets: $VAULT_ASSETS USDC"

VAULT_SHARES=$(cast call $BASE_VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL)
echo "Current vault shares: $VAULT_SHARES"

echo ""
echo "🔍 Step 2: Check Aave V3 Integration"
echo "------------------------------------"
AAVE_ADAPTER=$(cast call $BASE_VAULT_ADDRESS "protocolAdapters(uint8)(address,string,uint8,bool,uint64)" 0 --rpc-url $BASE_MAINNET_RPC_URL)
echo "Protocol 0 (Aave V3): $AAVE_ADAPTER"

echo ""
echo "🌉 Step 3: Check Nexus Integration"
echo "----------------------------------"
NEXUS_ADDR=$(cast call $BASE_VAULT_ADDRESS "nexusContract()(address)" --rpc-url $BASE_MAINNET_RPC_URL)
echo "Nexus contract: $NEXUS_ADDR"

echo ""
echo "✅ Demo Infrastructure Ready!"
echo "=============================="
echo ""
echo "🎬 For Live Demo (when you have USDC):"
echo "1. Deposit USDC to vault: vault.deposit(amount, user)"
echo "2. Check vault received funds: vault.totalAssets()"
echo "3. Trigger rebalancing: vault.rebalance()"
echo "4. Verify Aave deposit: Check Aave V3 pool for vault's position"
echo ""
echo "🔄 Cross-chain flow (when Arbitrum vault is deployed):"
echo "1. Arbitrum: deposit() → Nexus.bridgeAndExecute()"
echo "2. Base: Nexus receives → vault.depositViaBridge()"
echo "3. Base: vault.rebalance() → Aave V3 deposit"
echo ""
echo "View contracts on BaseScan:"
echo "🏦 Vault: https://basescan.org/address/$BASE_VAULT_ADDRESS"
echo "🔄 Adapter: https://basescan.org/address/$BASE_AAVE_ADAPTER"
echo "🌉 Nexus: https://basescan.org/address/$NEXUS_ADDRESS"