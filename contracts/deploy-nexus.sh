#!/bin/bash

# 🚀 Deploy Avail Nexus Contract Script
# This deploys the cross-chain bridge contract

set -e

echo "=================================================="
echo "🚀 Deploying Avail Nexus Contract"
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

# Choose network - default to Base for Nexus deployment
if [ -z "$NEXUS_RPC_URL" ]; then
    echo "💡 Using Base Mainnet for Nexus deployment (recommended)"
    RPC_URL="$BASE_MAINNET_RPC_URL"
    NETWORK_NAME="Base Mainnet"
    EXPLORER_URL="https://basescan.org"
else
    RPC_URL="$NEXUS_RPC_URL"
    NETWORK_NAME="Custom Network"
    EXPLORER_URL="Check your network"
fi

if [ -z "$RPC_URL" ]; then
    echo "❌ Error: No RPC URL found. Set BASE_MAINNET_RPC_URL or NEXUS_RPC_URL in .env"
    exit 1
fi

# Get deployer address
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
echo "📍 Deployer Address: $DEPLOYER"
echo "🌐 Network: $NETWORK_NAME"

# Check balance
BALANCE=$(cast balance $DEPLOYER --rpc-url $RPC_URL)
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)
echo "💰 Balance: $BALANCE_ETH ETH"

if [ $(echo "$BALANCE_ETH < 0.01" | bc) -eq 1 ]; then
    echo "⚠️  Warning: Low balance! You need at least 0.01 ETH for Nexus deployment"
    echo "💳 Get more ETH from: https://bridge.base.org/"
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
echo "🚀 Deploying Avail Nexus to $NETWORK_NAME..."
echo ""

# Deploy with verification if API key is set
if [ -z "$BASESCAN_API_KEY" ]; then
    echo "⚠️  No BASESCAN_API_KEY found, deploying without verification"
    forge script script/DeployNexus.s.sol \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvvv
else
    echo "✅ Deploying with contract verification"
    forge script script/DeployNexus.s.sol \
        --rpc-url $RPC_URL \
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
echo "✅ Avail Nexus Deployment Complete!"
echo "=================================================="
echo ""
echo "📝 Next Steps:"
echo "1. Update your .env file with the Nexus address from output above"
echo "2. Set proper treasury address: cast send <nexus> \"setTreasury(address)\" <treasury> --rpc-url $RPC_URL"
echo "3. Add bridge operators if needed"
echo "4. Update vaults: cast send <vault> \"setNexusContract(address)\" <nexus> --rpc-url <rpc>"
echo "5. Test cross-chain functionality"
echo ""
echo "🔍 View on $EXPLORER_URL:"
echo "https://basescan.org/address/YOUR_NEXUS_ADDRESS"
echo ""
echo "📚 Nexus Contract Features:"
echo "- Cross-chain bridging with execution"
echo "- Bridge fee collection (0.05% default)"
echo "- Multi-chain support (ETH, Base, Arbitrum)"
echo "- Emergency withdrawal functions"
echo ""