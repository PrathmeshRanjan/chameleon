# Frontend Changes Summary

## TL;DR: Minimal Changes Required ✅

Your frontend architecture is **already correct** for the new design! The only change needed was adding an event listener for cross-chain rebalance initiation.

---

## What's Already Correct

### 1. Nexus SDK Integration ✅

**Location**: `src/providers/NexusProvider.tsx`, `src/hooks/useInitNexus.ts`

Your frontend correctly:

-   Uses `@avail-project/nexus-core` SDK
-   Initializes Nexus in browser for unified balance tracking
-   Uses SDK's `bridge()` and `bridgeAndExecute()` methods
-   **Does NOT** try to interact with a "Nexus smart contract"

**Why this is correct**: Avail Nexus works through a TypeScript SDK, not through on-chain contract calls. Your implementation already follows this pattern.

### 2. Vault Interaction ✅

**Location**: `src/hooks/useYieldVault.ts`

Your frontend correctly:

-   Approves USDC for the vault
-   Calls `deposit()` and `withdraw()` functions
-   Reads vault balances and shares
-   **Does NOT** try to handle bridging directly

**Why this is correct**: The vault contract handles same-chain operations. Cross-chain bridging is delegated to Vincent automation (off-chain service), not the frontend.

### 3. Vincent Automation Monitoring ✅

**Location**: `src/hooks/useVincent.ts`

Your frontend correctly:

-   Reads `vincentAutomation` address from vault
-   Allows users to set guardrails for automated rebalancing
-   Watches for `Rebalanced` events
-   Tracks rebalancing history

**Why this is correct**: Vincent is an off-chain service (not a contract), and the frontend just needs to configure it and monitor its actions.

---

## What Changed (Just Made)

### Added: CrossChainRebalanceInitiated Event Listener

**File**: `src/hooks/useVincent.ts`

**What was added**:

```typescript
// Watch for cross-chain rebalance initiated events
useWatchContractEvent({
    address: vaultAddress,
    abi: YIELD_OPTIMIZER_ABI,
    eventName: "CrossChainRebalanceInitiated",
    onLogs: (logs) => {
        const userLogs = logs.filter((log) => log.args.user === address);
        if (userLogs.length > 0) {
            console.log("Cross-chain rebalance initiated:", userLogs);
            // You could add a toast notification here
        }
    },
});
```

**Why this was added**:

-   When the vault approves Vincent for cross-chain rebalancing, it emits `CrossChainRebalanceInitiated`
-   This event fires **immediately** on the source chain
-   The actual bridging and rebalance completion happens later (could be 2-10 minutes)
-   Listening to this event allows you to show users: "Cross-chain rebalance in progress..."

**Event sequence**:

1. ⚡ **CrossChainRebalanceInitiated** - Vault approves Vincent (immediate)
2. 🔄 Vincent detects event and calls Nexus SDK (off-chain)
3. 🌉 Nexus bridges tokens cross-chain (2-10 minutes)
4. ✅ **Rebalanced** - Destination adapter deposits (completion)

---

## Architecture Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                         │
│                                                               │
│  User Actions:                                                │
│  • Deposit USDC → vault.deposit()                            │
│  • Withdraw USDC → vault.withdraw()                          │
│  • Configure Vincent → vault.updateGuardrails()              │
│                                                               │
│  Event Listening:                                             │
│  • Rebalanced → Update UI with completed rebalances          │
│  • CrossChainRebalanceInitiated → Show "pending" status      │
│  • GuardrailsUpdated → Refresh user settings                 │
│                                                               │
│  Nexus SDK Usage (separate from vault):                      │
│  • nexus.bridge() → Manual bridging                          │
│  • nexus.getUnifiedBalance() → Cross-chain balance view      │
└──────────────────────────────────────────────────────────────┘
                           ↓ ↑
                    Web3 (wagmi/viem)
                           ↓ ↑
┌──────────────────────────────────────────────────────────────┐
│                 VAULT SMART CONTRACT (On-Chain)               │
│                                                               │
│  • Accepts USDC deposits from users                          │
│  • Mints syUSDC vault shares                                 │
│  • Handles same-chain rebalancing                            │
│  • Approves Vincent for cross-chain operations               │
│  • Emits events for frontend tracking                        │
└──────────────────────────────────────────────────────────────┘
                           ↓ (approval)
┌──────────────────────────────────────────────────────────────┐
│              VINCENT AUTOMATION (Off-Chain Service)           │
│                                                               │
│  • Node.js service running 24/7                              │
│  • Listens to CrossChainRebalanceInitiated events            │
│  • Uses Nexus SDK to bridge and execute                      │
│  • Has wallet address (EOA) approved by vault                │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                  AVAIL NEXUS (Protocol)                       │
│                                                               │
│  • Intent-based cross-chain messaging                        │
│  • Solver network for bridging                               │
│  • Executes contract calls on destination                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Insights

### Why Frontend Doesn't Handle Bridging

**Old (Wrong) Architecture**:

```
User → Frontend → Nexus SDK → Bridge
```

❌ Problem: Frontend can't monitor yields 24/7 or make automated decisions

**New (Correct) Architecture**:

```
User → Frontend → Vault → Vincent (off-chain) → Nexus SDK → Bridge
```

✅ Benefit: Vincent runs 24/7, optimizes yields automatically, handles failures/retries

### Why No "Nexus Contract" in Frontend

**What you might have expected**:

```typescript
// ❌ WRONG - This doesn't exist
const nexusContract = useContract({
  address: NEXUS_ADDRESS,
  abi: NEXUS_ABI,
});
await nexusContract.bridge(...);
```

**What we actually do**:

```typescript
// ✅ CORRECT - Use SDK directly
import { NexusSDK } from '@avail-project/nexus-core';
const nexus = new NexusSDK({ network: 'mainnet' });
await nexus.bridge(...);
```

**Why**: Avail Nexus uses an intent-based architecture:

-   No single "Nexus contract" to call
-   Solver network competes to fulfill intents
-   Communication happens off-chain through SDK
-   SDK abstracts away the complexity

### Vincent as EOA, Not Contract

**What Vincent is**:

-   An **Externally Owned Account** (EOA) - regular wallet address
-   Controlled by a private key in an off-chain Node.js service
-   Gets approved by vault to spend USDC (like Uniswap approval)

**What Vincent is NOT**:

-   ❌ Not a smart contract
-   ❌ Not deployed on-chain
-   ❌ Not something frontend needs to instantiate

**How it works**:

1. Vault deploys with Vincent's wallet address: `0xVincentAddress`
2. Vault approves Vincent: `usdc.approve(vincentAddress, amount)`
3. Vincent service (Node.js) uses its private key to call Nexus SDK
4. Nexus SDK does: `usdc.transferFrom(vault, nexus, amount)`

---

## Testing the Frontend

### 1. Same-Chain Operations (No Changes Needed)

✅ Test deposit to vault
✅ Test withdrawal from vault
✅ Test viewing vault balance
✅ Test Nexus bridge (separate feature)
✅ Test Nexus unified balance view

### 2. Vincent Configuration (No Changes Needed)

✅ Set guardrails (max slippage, gas ceiling, min APY diff)
✅ Enable/disable auto-rebalancing
✅ View Vincent automation status

### 3. Cross-Chain Event Monitoring (New)

✅ Watch for `CrossChainRebalanceInitiated` event
✅ Show "Cross-chain rebalance pending..." in UI
✅ Watch for `Rebalanced` event
✅ Update UI with completed rebalance

---

## Optional UI Enhancements

Now that you're listening to `CrossChainRebalanceInitiated`, you could add:

### 1. Toast Notifications

```typescript
// In useVincent.ts
import { toast } from "sonner"; // or your toast library

useWatchContractEvent({
    eventName: "CrossChainRebalanceInitiated",
    onLogs: (logs) => {
        const userLogs = logs.filter((log) => log.args.user === address);
        if (userLogs.length > 0) {
            toast.info("Cross-chain rebalance initiated by Vincent", {
                description:
                    "Your funds are being optimized. This may take a few minutes.",
            });
        }
    },
});
```

### 2. Pending State in UI

```typescript
const [pendingRebalances, setPendingRebalances] = useState<string[]>([]);

// On CrossChainRebalanceInitiated
setPendingRebalances((prev) => [...prev, txHash]);

// On Rebalanced
setPendingRebalances((prev) => prev.filter((hash) => hash !== txHash));
```

### 3. Progress Indicator

```tsx
{
    pendingRebalances.length > 0 && (
        <div className="flex items-center gap-2">
            <Loader className="animate-spin" />
            <span>Cross-chain rebalance in progress...</span>
        </div>
    );
}
```

---

## Environment Variables

Make sure your frontend `.env` has:

```bash
# Vault addresses (update after deployment)
VITE_SEPOLIA_VAULT_ADDRESS=0x...
VITE_BASE_SEPOLIA_VAULT_ADDRESS=0x...

# USDC addresses (already in code, but good to have)
VITE_SEPOLIA_USDC=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
VITE_BASE_SEPOLIA_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Nexus SDK (already configured in NexusProvider)
# No env vars needed - SDK handles this
```

---

## Summary Checklist

-   [x] ✅ Frontend already uses Nexus SDK correctly
-   [x] ✅ Frontend already interacts with vault correctly
-   [x] ✅ Frontend already monitors Vincent correctly
-   [x] ✅ Added `CrossChainRebalanceInitiated` event listener
-   [ ] 📝 Optional: Add toast notifications for cross-chain events
-   [ ] 📝 Optional: Add UI for pending cross-chain rebalances
-   [ ] 📝 Update vault addresses in `.env` after deployment

---

## Next Steps

1. **Deploy Contracts**: Run deployment scripts for Sepolia and Base Sepolia
2. **Update Frontend Config**: Add deployed vault addresses to `.env`
3. **Implement Vincent Service**: Follow `NEXUS_INTEGRATION.md`
4. **Test End-to-End**:
    - Deploy contracts
    - Start Vincent service
    - Use frontend to deposit
    - Trigger rebalance (via Vincent or manual call)
    - Watch events in frontend UI
5. **Monitor**: Use browser console to see event logs

---

## Questions?

-   **Q: Do I need to change how deposit/withdraw works?**  
    A: No, those functions remain the same

-   **Q: Does the frontend need to integrate with Vincent?**  
    A: No, Vincent is a separate service. Frontend just configures it via guardrails

-   **Q: Should users be able to trigger cross-chain rebalancing manually?**  
    A: That's up to your UX design. The vault has `executeRebalance()` which Vincent calls, but you could add a "Manual Rebalance" button that calls it too (requires being approved as Vincent or owner)

-   **Q: What if Vincent goes down?**  
    A: Cross-chain rebalancing stops, but users can still deposit/withdraw normally. You could add a backup Vincent address or allow owner to trigger rebalances manually.
