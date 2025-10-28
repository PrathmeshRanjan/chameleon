#!/bin/bash

# Deploy YieldOptimizerUSDC Vault and Adapters on Base Sepolia
# Usage: ./deploy-base-sepolia.sh

set -e

echo "=========================================="
echo "  Base Sepolia Deployment Script"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with required variables."
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: BASE_SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

echo "📋 Configuration:"
echo "  RPC URL: $BASE_SEPOLIA_RPC_URL"
echo "  Basescan API: ${BASESCAN_API_KEY:0:8}..."
echo ""

# Deploy contracts
echo "🚀 Deploying contracts to Base Sepolia..."
echo ""

forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --broadcast \
    --verify \
    --etherscan-api-key "$BASESCAN_API_KEY" \
    -vvvv

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update .env with deployed contract addresses"
echo "2. Deploy Nexus contract if not already deployed"
echo "3. Update vault with Nexus address"
echo ""
