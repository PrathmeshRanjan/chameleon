# Cross-Chain Rebalancing Flow

This document explains the complete cross-chain rebalancing flow using Avail Nexus.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Action                              │
│                 Deposits USDC to Sepolia Vault                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│                    Vincent Automation                            │
│           (Monitors for rebalancing opportunities)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│              Vincent calls executeRebalance()                    │
│           on YieldOptimizerUSDC (Sepolia chain)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│                    Vault Smart Contract                          │
│                                                                   │
│  1. Withdraws USDC from source protocol (Aave)                   │
│  2. Approves Vincent to spend USDC: forceApprove()               │
│  3. Emits CrossChainRebalanceInitiated event                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│              Vincent detects event and reacts                    │
│                                                                   │
│  • Listens to CrossChainRebalanceInitiated                       │
│  • Extracts: sourceChain, destChain, amount, adapter             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│                   Nexus SDK Integration                          │
│                                                                   │
│  Vincent calls nexus.bridgeAndExecute() with:                    │
│  • token: 'USDC'                                                 │
│  • amount: from event                                            │
│  • toChainId: destinationChainId                                 │
│  • sourceChains: [sourceChainId]                                 │
│  • execute: { contract: adapter, function: deposit() }           │
│                                                                   │
│  Nexus SDK does transferFrom(vault, nexus, amount)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│                    Avail Nexus Protocol                          │
│                                                                   │
│  1. Receives USDC on source chain (Sepolia)                      │
│  2. Creates cross-chain intent                                   │
│  3. Solver network competes to fulfill intent                    │
│  4. Best solver bridges USDC to destination (Base Sepolia)       │
│  5. Executes adapter.deposit() on destination chain              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│              Destination Chain (Base Sepolia)                    │
│                                                                   │
│  AaveV3Adapter.deposit() called with USDC:                       │
│  1. Receives USDC from Nexus                                     │
│  2. Deposits into Aave V3 on Base                                │
│  3. Emits ProtocolDeposit event                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────────┐
│                     Rebalance Complete                           │
│                                                                   │
│  ✅ User funds moved from Sepolia Aave to Base Aave              │
│  ✅ All tracked in vault's unified accounting                    │
│  ✅ User balance remains the same (cross-chain abstraction)      │
└─────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Approval Instead of Transfer

**Why approve Vincent instead of transferring USDC to it?**

```solidity
// OLD approach (inefficient):
usdc.safeTransfer(vincentAutomation, params.amount);

// NEW approach (optimized):
usdc.forceApprove(vincentAutomation, params.amount);
```

**Benefits:**

-   ✅ **Gas efficiency**: One approval vs. two transfers (vault→vincent, vincent→nexus)
-   ✅ **Security**: Vincent never holds user funds, reducing custody risk
-   ✅ **Direct flow**: Nexus SDK can `transferFrom` vault directly
-   ✅ **Standard pattern**: Similar to DEX approvals (Uniswap, etc.)

### 2. Off-Chain Nexus Integration

**Why not a Solidity wrapper for Avail Nexus?**

Avail Nexus works through an intent-based architecture:

-   Users create intents (e.g., "bridge USDC and execute deposit")
-   Solver network competes to fulfill intents
-   Communication happens off-chain through Nexus SDK
-   No on-chain Nexus contract to call directly

**The SDK handles:**

-   Creating cross-chain intents
-   Finding best solver (price, speed, reliability)
-   Monitoring bridge transactions
-   Executing destination contract calls
-   Providing unified transaction receipts

### 3. Vincent Automation Service

**Why do we need Vincent?**

Smart contracts cannot:

-   Monitor yield rates across chains
-   Decide when to rebalance
-   Call external APIs (Nexus SDK)
-   Bridge assets themselves

Vincent provides:

-   24/7 monitoring of yield opportunities
-   Event listening for cross-chain rebalances
-   Nexus SDK integration for bridging
-   Transaction management and retries
-   Gas optimization and nonce management

## Technical Flow Details

### Step 1: Vault Approval

```solidity
// In YieldOptimizerUSDC._initiateCrossChainRebalance()
usdc.forceApprove(vincentAutomation, params.amount);

emit CrossChainRebalanceInitiated(
    params.user,
    params.fromProtocol,
    params.toProtocol,
    params.amount,
    params.srcChainId,
    params.dstChainId,
    params.destAdapter
);
```

### Step 2: Vincent Event Detection

```typescript
// In vincent-automation service
vaultContract.on(
    "CrossChainRebalanceInitiated",
    async (
        user,
        fromProtocol,
        toProtocol,
        amount,
        srcChainId,
        dstChainId,
        destAdapter,
        event
    ) => {
        await handleCrossChainRebalance(nexus, {
            user,
            fromProtocol,
            toProtocol,
            amount,
            srcChainId,
            dstChainId,
            destAdapter,
        });
    }
);
```

### Step 3: Nexus Bridge and Execute

```typescript
// In vincent-automation/rebalance-handler.ts
const result = await nexus.bridgeAndExecute({
    token: "USDC",
    amount: params.amount.toString(),
    toChainId: params.dstChainId,
    sourceChains: [params.srcChainId],
    execute: {
        contractAddress: params.destAdapter,
        functionName: "deposit",
        // ... ABI and params
    },
});
```

### Step 4: Nexus SDK Internal Operations

1. Calls `usdc.transferFrom(vault, nexusAddress, amount)` - pulls from vault
2. Creates intent: "Bridge X USDC from Sepolia to Base and call deposit()"
3. Submits to Avail DA for cross-chain coordination
4. Solvers compete to fulfill intent
5. Winner bridges USDC to destination
6. Winner calls `adapter.deposit(usdc, amount)` on destination

### Step 5: Destination Execution

```solidity
// On Base Sepolia - AaveV3Adapter.deposit()
function deposit(address asset, uint256 amount) external onlyVault {
    // Transfer from sender (Nexus) to this adapter
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

    // Approve Aave pool
    IERC20(asset).forceApprove(address(pool), amount);

    // Deposit to Aave
    pool.supply(asset, amount, address(this), 0);

    emit ProtocolDeposit(asset, amount);
}
```

## Security Considerations

### Approval Security

-   Vault uses `forceApprove()` which resets to 0 first (prevents front-running)
-   Only approves exact amount needed for current rebalance
-   Vincent address is immutable and set in constructor
-   Each cross-chain rebalance requires new approval

### Access Control

```solidity
// Only Vincent can trigger rebalances
modifier onlyVincent() {
    require(msg.sender == vincentAutomation, "Only Vincent");
    _;
}

function executeRebalance(...) external onlyVincent {
    // ...
}
```

### Fund Safety

-   Funds never leave vault's control until Nexus transferFrom
-   Vincent never custodies user funds
-   Nexus handles bridge security through solver collateral
-   Destination adapter only accepts from vault

## Gas Optimization

### Approval vs Transfer Savings

```
OLD Flow:
1. vault.transfer(vincent, 1000 USDC)     ~51k gas
2. vincent.transfer(nexus, 1000 USDC)     ~51k gas
Total: ~102k gas

NEW Flow:
1. vault.approve(vincent, 1000 USDC)      ~46k gas
2. nexus.transferFrom(vault, 1000 USDC)   ~51k gas
Total: ~97k gas

Savings: ~5k gas + reduced complexity
```

### Additional Optimizations

-   Batch approvals for multiple rebalances
-   Pre-approved amounts for frequent rebalancers
-   Nexus handles bridge gas on destination
-   Intent-based execution optimizes solver competition

## Testing Strategy

### Same-Chain Testing (First)

1. Deploy vault and Aave adapter on Sepolia
2. Test `executeRebalance` with same chain (srcChain == dstChain)
3. Verify: withdraw → approve → deposit flow
4. Check: events emitted correctly

### Cross-Chain Testing (After same-chain works)

1. Deploy adapters on both Sepolia and Base Sepolia
2. Fund Vincent wallet with gas on both chains
3. Implement Vincent service with Nexus SDK
4. Test: Sepolia Aave → Base Aave rebalance
5. Monitor: Nexus intent fulfillment and execution
6. Verify: User balance consistent across chains

### Integration Testing

1. Multiple sequential rebalances
2. Large amounts (test solver capacity)
3. Failure scenarios (insufficient gas, slippage)
4. Vincent downtime recovery
5. Nexus solver failures (retry logic)

## Deployment Checklist

-   [ ] Deploy YieldOptimizerUSDC on Sepolia
-   [ ] Deploy YieldOptimizerUSDC on Base Sepolia
-   [ ] Deploy AaveV3Adapter on Sepolia
-   [ ] Deploy AaveV3Adapter on Base Sepolia
-   [ ] Set up Vincent automation service
-   [ ] Install Nexus SDK in Vincent
-   [ ] Configure Vincent with private key and RPCs
-   [ ] Fund Vincent with gas tokens (ETH on both chains)
-   [ ] Register Vincent address in vault constructor
-   [ ] Test same-chain rebalancing first
-   [ ] Test cross-chain rebalancing
-   [ ] Monitor Nexus Dashboard for intents
-   [ ] Set up alerting for failed rebalances

## Monitoring and Maintenance

### Vincent Service Health

-   Uptime monitoring (24/7 operation required)
-   Gas balance alerts (< 0.1 ETH warning)
-   Event processing queue length
-   Failed transaction retries

### Nexus Integration

-   Intent success rate
-   Average bridge time
-   Solver diversity (multiple solvers used)
-   Slippage and fees tracking

### Vault Operations

-   Total value locked (TVL) across chains
-   Rebalance frequency and amounts
-   User deposit/withdrawal patterns
-   Protocol yield comparison

## Next Steps

1. **Deploy Contracts**: Run `./deploy-sepolia.sh` and `./deploy-base-sepolia.sh`
2. **Implement Vincent**: Follow `NEXUS_INTEGRATION.md` for complete setup
3. **Test Same-Chain**: Verify local rebalancing works
4. **Add Nexus SDK**: Install `@avail-project/nexus-core` in Vincent
5. **Test Cross-Chain**: Execute Sepolia → Base rebalance
6. **Monitor Results**: Check Nexus Dashboard and on-chain events
7. **Optimize**: Tune gas limits, retry logic, and monitoring

## Resources

-   [Avail Nexus Documentation](https://docs.availproject.org/docs/build-with-avail/Nexus/overview)
-   [Nexus SDK GitHub](https://github.com/availproject/nexus-sdk)
-   [Aave V3 Documentation](https://docs.aave.com/developers/getting-started/readme)
-   Deployment Guide: `DEPLOYMENT_GUIDE.md`
-   Integration Guide: `NEXUS_INTEGRATION.md`
-   Architecture Summary: `CLEAN_ARCHITECTURE.md`
