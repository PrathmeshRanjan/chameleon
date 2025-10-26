#!/bin/bash

# 🚀 Deploy Base Aave V3 Adapter Script
# Run this AFTER deploying the vault with deploy-base-vault.sh

set -e

echo "=================================================="
echo "🚀 Deploying Base Aave V3 Adapter to Base Mainnet"
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

if [ -z "$BASE_MAINNET_RPC_URL" ]; then
    echo "❌ Error: BASE_MAINNET_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$BASE_VAULT_ADDRESS" ]; then
    echo "❌ Error: BASE_VAULT_ADDRESS not set in .env"
    echo "💡 Run deploy-base-vault.sh first"
    exit 1
fi

# Get deployer address
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
echo "📍 Deployer Address: $DEPLOYER"
echo "🏦 Vault Address: $BASE_VAULT_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER --rpc-url $BASE_MAINNET_RPC_URL)
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)
echo "💰 Balance: $BALANCE_ETH ETH"

if [ $(echo "$BALANCE_ETH < 0.01" | bc) -eq 1 ]; then
    echo "⚠️  Warning: Low balance! You need at least 0.01 ETH for adapter deployment"
    echo "💳 Get more Base ETH from: https://bridge.base.org/"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "🚀 Deploying Aave V3 adapter to Base Mainnet..."
echo ""

# Deploy with verification if API key is set
if [ -z "$BASESCAN_API_KEY" ]; then
    echo "⚠️  No BASESCAN_API_KEY found, deploying without verification"
    forge script script/DeployBaseAaveAdapter.s.sol \
        --rpc-url $BASE_MAINNET_RPC_URL \
        --broadcast \
        -vvvv
else
    echo "✅ Deploying with contract verification"
    forge script script/DeployBaseAaveAdapter.s.sol \
        --rpc-url $BASE_MAINNET_RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $BASESCAN_API_KEY \
        -vvvv
fi

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Base Aave V3 Adapter Deployment Complete!"
echo "=================================================="
echo ""
echo "📝 Next Steps:"
echo "1. Update your .env file with adapter address from output above"
echo "2. Test deposit/withdrawal with Aave V3 adapter"
echo "3. Set Vincent automation address"
echo "4. Start frontend: npm run dev"
echo ""
echo "🔍 View on BaseScan:"
echo "https://basescan.org/address/YOUR_ADAPTER_ADDRESS"
echo ""