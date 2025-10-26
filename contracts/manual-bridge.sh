#!/bin/bash

# 🚀 Manual Cross-Chain Bridge Script
# Bridge USDC from Base to Arbitrum vault via Nexus

set -e

echo "=================================================="
echo "🌉 Manual Cross-Chain Bridge: Base → Arbitrum"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Run: cp .env.example .env and fill in your values"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$BASE_RPC_URL" ]; then
    echo "❌ Error: BASE_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$ARBITRUM_RPC_URL" ]; then
    echo "❌ Error: ARBITRUM_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$ARBITRUM_VAULT_ADDRESS" ]; then
    echo "❌ Error: ARBITRUM_VAULT_ADDRESS not set in .env"
    exit 1
fi

if [ -z "$NEXUS_ADDRESS" ]; then
    echo "❌ Error: NEXUS_ADDRESS not set in .env"
    exit 1
fi

# Configuration
SOURCE_CHAIN=8453          # Base
DEST_CHAIN=42161           # Arbitrum
USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USER_ADDRESS=$(cast wallet address $PRIVATE_KEY)

echo "📋 Bridge Configuration:"
echo "  From Chain: Base ($SOURCE_CHAIN)"
echo "  To Chain: Arbitrum ($DEST_CHAIN)"
echo "  Token: USDC ($USDC_ADDRESS)"
echo "  User: $USER_ADDRESS"
echo "  Nexus: $NEXUS_ADDRESS"
echo ""

# Get amount from user
if [ -z "$1" ]; then
    echo "💰 Enter amount to bridge (in USDC, e.g., 1 for 1 USDC):"
    read -r AMOUNT_USDC
else
    AMOUNT_USDC=$1
fi

# Convert to wei (USDC has 6 decimals)
AMOUNT=$(echo "$AMOUNT_USDC * 1000000" | bc | cut -d'.' -f1)

echo "  Amount: $AMOUNT_USDC USDC ($AMOUNT wei)"
echo ""

# Check user's USDC balance on Base
echo "💰 Checking USDC balance on Base..."
USDC_BALANCE=$(cast call $USDC_ADDRESS "balanceOf(address)(uint256)" $USER_ADDRESS --rpc-url $BASE_RPC_URL)

echo "  USDC Balance: $(echo "scale=6; $USDC_BALANCE / 1000000" | bc) USDC"
echo ""

if [ "$USDC_BALANCE" -lt "$AMOUNT" ]; then
    echo "❌ Error: Insufficient USDC balance!"
    echo "  Required: $AMOUNT_USDC USDC"
    echo "  Available: $(echo "scale=6; $USDC_BALANCE / 1000000" | bc) USDC"
    echo ""
    echo "💡 Get USDC on Base from:"
    echo "   - Coinbase: https://www.coinbase.com/"
    echo "   - Uniswap: https://app.uniswap.org/"
    echo "   - Bridge from Ethereum: https://bridge.base.org/"
    exit 1
fi

# Check if Nexus is approved to spend USDC
echo "🔍 Checking USDC approval for Nexus..."
ALLOWANCE=$(cast call $USDC_ADDRESS "allowance(address,address)(uint256)" $USER_ADDRESS $NEXUS_ADDRESS --rpc-url $BASE_RPC_URL)

if [ "$ALLOWANCE" -lt "$AMOUNT" ]; then
    echo "⚠️  Insufficient allowance. Approving Nexus to spend USDC..."
    APPROVE_TX=$(cast send $USDC_ADDRESS "approve(address,uint256)" $NEXUS_ADDRESS $AMOUNT \
        --rpc-url $BASE_RPC_URL \
        --private-key $PRIVATE_KEY)
    echo "  Approval TX: $APPROVE_TX"
    sleep 5
fi

# Build the execute data for the destination vault
# This will call deposit() on the Arbitrum vault
DEPOSIT_DATA=$(cast calldata "deposit(uint256,address)" $AMOUNT $USER_ADDRESS)

echo "🔨 Building bridge transaction..."
echo "  Execute Data: $DEPOSIT_DATA"
echo ""

# Build the bridgeAndExecute call
BRIDGE_CALL=$(cast calldata "bridgeAndExecute(uint256,uint256,address,uint256,address,bytes)" \
    $SOURCE_CHAIN \
    $DEST_CHAIN \
    $USDC_ADDRESS \
    $AMOUNT \
    $ARBITRUM_VAULT_ADDRESS \
    $DEPOSIT_DATA)

echo "🚀 Executing bridge transaction on Base..."
echo ""

# Execute the bridge transaction
TX_HASH=$(cast send $NEXUS_ADDRESS $BRIDGE_CALL \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY \
    --gas-limit 500000)

echo "✅ Bridge transaction sent!"
echo "  Transaction Hash: $TX_HASH"
echo ""

# Wait for confirmation
echo "⏳ Waiting for confirmation..."
sleep 15

# Check if bridge was successful
echo "🔍 Checking bridge status..."

# For simulation mode, the bridge should execute immediately
# Check the destination vault balance
NEW_VAULT_BALANCE=$(cast call $ARBITRUM_VAULT_ADDRESS "balanceOf(address)(uint256)" $USER_ADDRESS --rpc-url $ARBITRUM_RPC_URL)
NEW_VAULT_SHARES=$(cast call $ARBITRUM_VAULT_ADDRESS "convertToAssets(uint256)(uint256)" $NEW_VAULT_BALANCE --rpc-url $ARBITRUM_RPC_URL)

echo ""
echo "=================================================="
echo "🎉 Bridge Complete!"
echo "=================================================="
echo "Arbitrum Vault Balance: $(echo "scale=6; $NEW_VAULT_SHARES / 1000000" | bc) USDC"
echo "Transaction: https://basescan.org/tx/$TX_HASH"
echo "Arbiscan: https://arbiscan.io/address/$ARBITRUM_VAULT_ADDRESS"
echo "=================================================="