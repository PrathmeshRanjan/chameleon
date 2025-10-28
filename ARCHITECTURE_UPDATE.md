# Chameleon Protocol - Architecture Update

## Changes Made

### ✅ Removed

-   ❌ `src/AvailNexus.sol` - Incorrect Solidity wrapper
-   ❌ `script/DeployNexus.s.sol` - No longer needed
-   ❌ `deploy-nexus.sh` - No longer needed
-   ❌ Outdated test files and documentation

### ✅ Updated

#### Smart Contracts

-   **YieldOptimizerUSDC.sol**
    -   Removed `nexusContract` state variable
    -   Removed `setNexusContract()` function
    -   Updated constructor to use `vincentAutomation` address
    -   Changed `_rebalanceCrossChain()` to `_initiateCrossChainRebalance()`
    -   Added `CrossChainRebalanceInitiated` event
    -   Cross-chain rebalancing now transfers to Vincent for off-chain Nexus handling

#### Deployment Scripts

-   **DeploySepolia.s.sol** - Updated constructor parameters
-   **DeployBaseSepolia.s.sol** - Updated constructor parameters
-   Removed Nexus-related deployment steps

#### Configuration

-   **.env** - Removed `NEXUS_ADDRESS` (not needed)

### ✅ Added

#### Documentation

-   **NEXUS_INTEGRATION.md** - Complete guide for proper Nexus integration

    -   Vincent automation setup
    -   Event listeners
    -   Nexus SDK usage
    -   Production checklist

-   **DEPLOYMENT_GUIDE.md** - Simplified deployment guide
    -   Quick start commands
    -   Testing instructions
    -   Verification steps

## New Architecture

### Same-Chain Rebalancing

```
User → Vault.executeRebalance()
     → Withdraw from Protocol A
     → Deposit to Protocol B
     → Emit Rebalanced event
```

**Status:** ✅ Works entirely on-chain

### Cross-Chain Rebalancing

```
User → Vault.executeRebalance()
     → Withdraw from Protocol A
     → Transfer USDC to Vincent
     → Emit CrossChainRebalanceInitiated event

Vincent (Off-chain):
     → Detects event
     → Calls nexus.bridgeAndExecute()
     → Nexus bridges to destination chain
     → Destination adapter receives and deposits
```

**Status:** ✅ Requires Vincent automation with Nexus SDK

## How to Use

### 1. Deploy Contracts

```bash
cd contracts
./deploy-sepolia.sh     # Deploy on Ethereum Sepolia
./deploy-base-sepolia.sh # Deploy on Base Sepolia
```

### 2. Set Up Vincent Automation

```bash
# See NEXUS_INTEGRATION.md for complete code

# Install dependencies
npm install @avail-project/nexus-core viem

# Implement event listener
# Implement Nexus bridge handler
# Deploy Vincent service
```

### 3. Test

```bash
# Same-chain rebalance (works now)
cast send $VAULT "executeRebalance(...)" \
  --src-chain 11155111 \
  --dst-chain 11155111  # Same chain

# Cross-chain rebalance (requires Vincent)
cast send $VAULT "executeRebalance(...)" \
  --src-chain 11155111 \  # Sepolia
  --dst-chain 84532       # Base Sepolia
# Vincent detects event and handles bridging
```

## Key Benefits

1. ✅ **Correct Architecture** - Uses Nexus SDK as intended
2. ✅ **More Flexible** - Vincent can implement complex logic
3. ✅ **Intent-Based** - Leverages Nexus solvers
4. ✅ **Better UX** - Unified balance across chains
5. ✅ **Production-Ready** - Uses battle-tested Nexus infrastructure

## Next Steps

1. **Deploy contracts** on testnets ✅ (Ready)
2. **Implement Vincent** - See `NEXUS_INTEGRATION.md`
3. **Test same-chain** rebalancing first
4. **Add Nexus integration** for cross-chain
5. **Monitor and optimize** performance

## Documentation

-   `NEXUS_INTEGRATION.md` - Complete integration guide
-   `DEPLOYMENT_GUIDE.md` - Deployment instructions
-   `contracts/src/` - Updated Solidity contracts
-   `contracts/script/` - Updated deployment scripts

## Questions?

-   Nexus SDK: https://docs.availproject.org/nexus/avail-nexus-sdk
-   Bridge & Execute: https://docs.availproject.org/nexus/avail-nexus-sdk/nexus-core/bridge-and-execute
-   Demo: https://nexus-demo.availproject.org/
