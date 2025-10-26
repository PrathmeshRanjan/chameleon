#!/bin/bash

# 🧪 Test Deposit Script
# Run this when you have USDC to test the yield optimization flow

set -e

echo "🧪 TESTING YIELD OPTIMIZATION FLOW"
echo "=================================="

# Load environment
source .env

# Configuration
DEPOSIT_AMOUNT=1000000  # 1 USDC (6 decimals)
USER_ADDRESS=$DEPLOYER  # Using deployer as test user

echo "Configuration:"
echo "- Deposit Amount: $DEPOSIT_AMOUNT (1 USDC)"
echo "- User: $USER_ADDRESS"
echo "- Vault: $BASE_VAULT_ADDRESS"
echo ""

# Check initial state
echo "📊 Initial State:"
INITIAL_ASSETS=$(cast call $BASE_VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL)
INITIAL_SHARES=$(cast call $BASE_VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL)
echo "- Vault Assets: $INITIAL_ASSETS USDC"
echo "- Vault Shares: $INITIAL_SHARES"
echo ""

# Check USDC balance
echo "💰 USDC Balance Check:"
USDC_BALANCE=$(cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 "balanceOf(address)(uint256)" $USER_ADDRESS --rpc-url $BASE_MAINNET_RPC_URL)
echo "- Your USDC: $USDC_BALANCE"
echo ""

if [ "$USDC_BALANCE" -lt "$DEPOSIT_AMOUNT" ]; then
    echo "❌ Insufficient USDC balance!"
    echo "💡 Get USDC from: https://app.uniswap.org/swap"
    exit 1
fi

echo "✅ Ready to deposit!"
echo ""

# Ask for confirmation
read -p "🚀 Execute deposit and rebalancing? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "🔄 Step 1: Approving USDC..."
APPROVE_TX=$(cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 "approve(address,uint256)" $BASE_VAULT_ADDRESS $DEPOSIT_AMOUNT --rpc-url $BASE_MAINNET_RPC_URL --private-key $PRIVATE_KEY)
echo "✅ Approval TX: $APPROVE_TX"

echo ""
echo "💰 Step 2: Depositing to Vault..."
DEPOSIT_TX=$(cast send $BASE_VAULT_ADDRESS "deposit(uint256,address)" $DEPOSIT_AMOUNT $USER_ADDRESS --rpc-url $BASE_MAINNET_RPC_URL --private-key $PRIVATE_KEY)
echo "✅ Deposit TX: $DEPOSIT_TX"

echo ""
echo "📊 Step 3: Checking Post-Deposit State..."
POST_ASSETS=$(cast call $BASE_VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL)
POST_SHARES=$(cast call $BASE_VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL)
echo "- Vault Assets: $POST_ASSETS USDC"
echo "- Vault Shares: $POST_SHARES"

echo ""
echo "🔄 Step 4: Triggering Rebalancing..."
REBALANCE_TX=$(cast send $BASE_VAULT_ADDRESS "rebalance()" --rpc-url $BASE_MAINNET_RPC_URL --private-key $PRIVATE_KEY)
echo "✅ Rebalance TX: $REBALANCE_TX"

echo ""
echo "🎯 DEMO COMPLETE!"
echo "================="
echo ""
echo "📈 Results:"
echo "- Deposited: 1 USDC"
echo "- Received: $((POST_SHARES - INITIAL_SHARES)) vault shares"
echo "- Funds deployed to: Aave V3 on Base"
echo ""
echo "🔍 Verify on BaseScan:"
echo "- Vault: https://basescan.org/address/$BASE_VAULT_ADDRESS"
echo "- Aave Pool: https://basescan.org/address/0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"