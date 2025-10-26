#!/bin/bash

# 🚀 Deploy Arbitrum Adapters Script
# Run this AFTER deploying the vault with deploy-arbitrum-vault.sh

set -e

echo "=================================================="
echo "🚀 Deploying Arbitrum Adapters to Arbitrum Mainnet"
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

if [ -z "$ARBITRUM_RPC_URL" ]; then
    echo "❌ Error: ARBITRUM_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$ARBITRUM_VAULT_ADDRESS" ]; then
    echo "❌ Error: ARBITRUM_VAULT_ADDRESS not set in .env"
    echo "💡 Run deploy-arbitrum-vault.sh first"
    exit 1
fi

# Get deployer address
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
echo "📍 Deployer Address: $DEPLOYER"
echo "🏦 Vault Address: $ARBITRUM_VAULT_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER --rpc-url $ARBITRUM_RPC_URL)
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)
echo "💰 Balance: $BALANCE_ETH ETH"

if [ $(echo "$BALANCE_ETH < 0.1" | bc) -eq 1 ]; then
    echo "⚠️  Warning: Low balance! You need at least 0.1 ETH for adapter deployment"
    echo "💳 Get more Arbitrum ETH from: https://bridge.arbitrum.io/"
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
echo "🚀 Deploying adapters to Arbitrum Mainnet..."
echo ""

# Deploy with verification if API key is set
if [ -z "$ARBISCAN_API_KEY" ]; then
    echo "⚠️  No ARBISCAN_API_KEY found, deploying without verification"
    forge script script/DeployArbitrumAdapters.s.sol \
        --rpc-url $ARBITRUM_RPC_URL \
        --broadcast \
        -vvvv
else
    echo "✅ Deploying with contract verification"
    forge script script/DeployArbitrumAdapters.s.sol \
        --rpc-url $ARBITRUM_RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $ARBISCAN_API_KEY \
        -vvvv
fi

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Arbitrum Adapters Deployment Complete!"
echo "=================================================="
echo ""
echo "📝 Next Steps:"
echo "1. Update your .env file with adapter addresses from output above"
echo "2. Test deposit/withdrawal with each adapter"
echo "3. Set Vincent automation address"
echo "4. Start frontend: npm run dev"
echo ""
echo "🔍 View on Arbiscan:"
echo "https://arbiscan.io/address/YOUR_ADAPTER_ADDRESSES"
echo ""
