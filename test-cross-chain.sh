#!/bin/bash

# Test Cross-Chain Rebalancing via Avail Nexus
# This script will:
# 1. Trigger cross-chain rebalance on Sepolia vault (on-chain)
# 2. Use Nexus SDK to bridge USDC from Sepolia to Base Sepolia (off-chain)

echo "========================================"
echo "  AVAIL NEXUS CROSS-CHAIN TEST"
echo "========================================"
echo ""

# Load environment variables
source contracts/.env

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Error: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

echo "Step 1: Initiating cross-chain rebalance on Sepolia..."
echo "----------------------------------------"
cd contracts

# Run the forge script to initiate cross-chain rebalance
forge script script/TestCrossChainRebalance.s.sol:TestCrossChainRebalance \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv

FORGE_EXIT_CODE=$?

if [ $FORGE_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Failed to initiate cross-chain rebalance on-chain"
    echo "Check the error messages above"
    exit 1
fi

echo ""
echo "✅ Cross-chain rebalance initiated on Sepolia!"
echo ""
echo "========================================"
echo "  NEXT: Manual Nexus Bridging"
echo "========================================"
echo ""
echo "The vault has approved your address to spend USDC."
echo "Now you need to use Nexus SDK to bridge the funds."
echo ""
echo "Option 1: Use Nexus SDK in Node.js/TypeScript"
echo "----------------------------------------"
echo "See NEXUS_INTEGRATION.md for complete code examples"
echo ""
echo "Option 2: Use Nexus Dashboard (Manual)"
echo "----------------------------------------"
echo "1. Go to: https://nexus.availproject.org"
echo "2. Connect your wallet (deployer address)"
echo "3. Bridge 10 USDC from Sepolia to Base Sepolia"
echo "4. Set destination: $BASE_SEPOLIA_AAVE_ADAPTER"
echo "5. Execute the bridge transaction"
echo ""
echo "Option 3: Continue with automated script (TODO)"
echo "----------------------------------------"
echo "Run: npm run bridge-nexus (implementation needed)"
echo ""
echo "Deployed Contract Addresses:"
echo "  Sepolia Vault: $SEPOLIA_VAULT_ADDRESS"
echo "  Base Sepolia Vault: $BASE_SEPOLIA_VAULT_ADDRESS"
echo "  Base Sepolia Adapter: $BASE_SEPOLIA_AAVE_ADAPTER"
echo ""
echo "========================================"
