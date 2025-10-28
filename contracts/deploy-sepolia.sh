#!/bin/bash

# Deploy YieldOptimizerUSDC Vault and Adapters on Ethereum Sepolia
# Usage: ./deploy-sepolia.sh

set -e

echo "=========================================="
echo "  Ethereum Sepolia Deployment Script"
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

if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

echo "📋 Configuration:"
echo "  RPC URL: $SEPOLIA_RPC_URL"
echo "  Etherscan API: ${ETHERSCAN_API_KEY:0:8}..."
echo ""

# Deploy contracts
echo "🚀 Deploying contracts to Ethereum Sepolia..."
echo ""

forge script script/DeploySepolia.s.sol:DeploySepolia \
    --rpc-url "$SEPOLIA_RPC_URL" \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    -vvvv

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update .env with deployed contract addresses"
echo "2. Deploy Nexus contract: ./deploy-nexus.sh"
echo "3. Update vault with Nexus address"
echo ""
