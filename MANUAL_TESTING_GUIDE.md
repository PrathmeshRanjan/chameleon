# Manual Testing Instructions

Since the Nexus SDK requires browser-based wallet initialization (window.ethereum), manual testing via CLI is complex. Here are your options:

## Option 1: Use Nexus Dashboard (Recommended for Quick Test)

1. **Go to Nexus Dashboard**: https://nexus.availproject.org
2. **Connect Wallet**: Connect with your deployer address
3. **Bridge USDC**:

    - From: Ethereum Sepolia
    - To: Base Sepolia
    - Amount: 10 USDC
    - Token: USDC

4. **Check Results**:
    - Verify 10 USDC was bridged
    - Check your balance on Base Sepolia

## Option 2: Use Your Frontend (Best Integration Test)

Since your frontend already has Nexus SDK integrated:

1. Open your frontend application
2. Connect wallet (deployer address)
3. Go to Bridge section
4. Bridge 10 USDC from Sepolia to Base Sepolia
5. Monitor the transaction

## Option 3: Complete Vincent Implementation

Build the full Vincent automation service:

```bash
# Create Vincent service
mkdir vincent-automation
cd vincent-automation
npm init -y
npm install @avail-project/nexus-core ethers dotenv
```

Then implement event listening + Nexus bridging as described in `NEXUS_INTEGRATION.md`.

## What We've Verified So Far

✅ **Cross-Chain Rebalance Initiated**: The vault contract successfully:

-   Withdrew USDC from source protocol
-   Approved your address (Vincent) to spend USDC
-   Emitted `CrossChainRebalanceInitiated` event

## Next Step: Complete the Bridge

You need to:

1. Transfer 10 USDC from Sepolia vault to Nexus
2. Bridge to Base Sepolia
3. Call `adapter.deposit()` on Base Sepolia

This is what Vincent will automate!

## Quick Test with Cast

You can manually transfer the USDC and call the adapter:

```bash
# On Sepolia: Transfer USDC from vault
cast send $USDC_SEPOLIA "transferFrom(address,address,uint256)" \
  $SEPOLIA_VAULT \
  $YOUR_ADDRESS \
  10000000 \  # 10 USDC (6 decimals)
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Then use Nexus Dashboard to bridge to Base Sepolia

# On Base Sepolia: Approve adapter
cast send $USDC_BASE_SEPOLIA "approve(address,uint256)" \
  $BASE_SEPOLIA_AAVE_ADAPTER \
  10000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Deposit to Aave via adapter
cast send $BASE_SEPOLIA_AAVE_ADAPTER "deposit(address,uint256)" \
  $USDC_BASE_SEPOLIA \
  10000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Summary

The on-chain part is working! ✅

The Nexus bridging requires either:

-   Browser-based wallet (use Nexus Dashboard or your frontend)
-   Full Vincent automation service implementation

For now, I recommend using the **Nexus Dashboard** for manual testing to verify the complete flow works.
