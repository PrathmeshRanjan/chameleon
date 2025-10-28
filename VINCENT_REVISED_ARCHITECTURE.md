# Revised Vincent Architecture

## Problem: Vincent's Limitations

Vincent (Lit Protocol) has these abilities:

-   ✅ ERC20 Approval
-   ✅ ERC20 Transfer
-   ✅ EVM Transaction Signer
-   ✅ Call Contract

But Vincent CANNOT:

-   ❌ Listen to blockchain events
-   ❌ Make HTTP requests (for Nexus SDK)
-   ❌ Run 24/7 as a service

## Solution: Split into Two Components

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│         EVENT MONITOR SERVICE (Node.js)                      │
│         (Runs 24/7 on your server)                           │
│                                                              │
│  • Listen to CrossChainRebalanceInitiated events            │
│  • Check user guardrails                                    │
│  • Compare yields across chains                             │
│  • Make decision: should we rebalance?                      │
│  • Integrate with Nexus SDK for bridging                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ When cross-chain rebalance needed
                   │
                   v
┌─────────────────────────────────────────────────────────────┐
│            VINCENT (Lit Protocol)                            │
│            (Transaction Executor)                            │
│                                                              │
│  • Triggered by Event Monitor                               │
│  • Uses abilities to execute on-chain actions:              │
│    - Transfer USDC from vault                               │
│    - Approve Nexus to spend                                 │
│    - Call adapter.deposit() on destination                  │
└─────────────────────────────────────────────────────────────┘
```

### Component 1: Event Monitor Service

This is a **regular Node.js service** (not Lit Protocol):

```typescript
// event-monitor/src/index.ts
import { ethers } from "ethers";
import { NexusSDK } from "@avail-project/nexus-core";

class EventMonitorService {
    private sepoliaProvider: ethers.Provider;
    private vaultContract: ethers.Contract;
    private vincentLitProtocol: VincentLitClient; // Your Lit Protocol client

    async start() {
        // Listen to events
        this.vaultContract.on(
            "CrossChainRebalanceInitiated",
            async (
                user,
                fromProtocol,
                toProtocol,
                amount,
                srcChain,
                dstChain,
                event
            ) => {
                console.log("Cross-chain rebalance detected!");

                // 1. Check if we should proceed
                const shouldRebalance = await this.validateRebalance(
                    user,
                    amount
                );
                if (!shouldRebalance) return;

                // 2. Handle the bridging ourselves (not through Vincent)
                await this.handleNexusBridge({
                    amount,
                    srcChain,
                    dstChain,
                    user,
                });
            }
        );
    }

    async handleNexusBridge(params) {
        // Since Nexus requires browser, use headless browser
        // OR use direct solver API calls
        // OR use Nexus Dashboard API
    }
}
```

### Component 2: Vincent (Simplified Role)

Vincent's role becomes much simpler:

**Option A: Vincent only handles same-chain rebalancing**

Since same-chain doesn't need Nexus bridging, Vincent can do this entirely:

```typescript
// Vincent monitors and executes same-chain rebalances only
// Cross-chain is handled by Event Monitor + manual Nexus bridging
```

**Option B: Remove Vincent entirely for testnet**

For testing, you (the owner) can manually call `executeRebalance()`:

```solidity
// You deployed with your address as vincentAutomation
// So YOU can call executeRebalance() directly
```

## Recommended Implementation: 3-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Your Backend/Server (Node.js)                      │
│  • Event monitoring (ethers.js)                             │
│  • Yield comparison logic                                   │
│  • User guardrails checking                                 │
│  • Decision making                                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        v                     v
┌──────────────┐    ┌──────────────────┐
│ TIER 2a:     │    │ TIER 2b:         │
│ Nexus SDK    │    │ Vincent          │
│ (Browser)    │    │ (Lit Protocol)   │
│              │    │                  │
│ Cross-chain  │    │ Same-chain       │
│ bridging     │    │ rebalancing      │
└──────────────┘    └──────────────────┘
        │                     │
        v                     v
┌─────────────────────────────────────┐
│  TIER 3: Smart Contracts            │
│  • Vault                            │
│  • Protocol Adapters                │
└─────────────────────────────────────┘
```

## Practical Implementation Options

### Option 1: Manual Testing (Current)

For testing right now:

1. ✅ On-chain rebalance initiated (DONE)
2. 🔄 Use Nexus Dashboard manually (you do this)
3. ✅ Verify deposit completed

**No automation needed for testing!**

### Option 2: Simple Automation (Testnet)

```typescript
// simple-monitor/index.ts
import { ethers } from "ethers";

// Listen to events
vaultContract.on("CrossChainRebalanceInitiated", async (event) => {
    console.log("Rebalance detected!");
    console.log("Go to Nexus Dashboard and bridge:");
    console.log(`Amount: ${event.args.amount}`);
    console.log(`From: Chain ${event.args.srcChain}`);
    console.log(`To: Chain ${event.args.dstChain}`);

    // Send yourself a notification
    await sendEmail("Rebalance needed!", event);
});
```

Run this script 24/7 and manually complete bridges when notified.

### Option 3: Headless Browser (Production)

```typescript
// production-monitor/nexus-automation.ts
import puppeteer from "puppeteer";

async function handleCrossChainRebalance(params) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Inject your wallet
    await page.evaluateOnNewDocument((pk) => {
        window.ethereum = createWalletProvider(pk);
    }, process.env.PRIVATE_KEY);

    // Use Nexus SDK
    const result = await page.evaluate(async (params) => {
        const { NexusSDK } = await import("@avail-project/nexus-core");
        const sdk = new NexusSDK({ network: "testnet" });
        await sdk.initialize(window.ethereum);

        // Set up hooks
        sdk.setOnIntentHook(({ allow }) => allow());
        sdk.setOnAllowanceHook(({ allow }) => allow(["min"]));

        // Execute bridge
        return await sdk.bridgeAndExecute(params);
    }, params);

    await browser.close();
    return result;
}
```

### Option 4: Nexus Solver API (Advanced)

Research and call Nexus solver API directly (no browser needed):

```typescript
// Direct integration with Nexus protocol
// Bypass SDK, call solver network API
// Most complex but most reliable for production
```

## What to Do RIGHT NOW

### For Testing (Next 30 minutes):

1. ✅ On-chain part is working
2. 🔄 **Use Nexus Dashboard manually**:
    - Go to https://nexus.availproject.org
    - Bridge 10 USDC from Sepolia to Base Sepolia
    - Execute adapter.deposit()
3. ✅ Verify complete flow works

### For Production (Next phase):

1. **Build Event Monitor Service** (Node.js):

    ```bash
    mkdir event-monitor
    cd event-monitor
    npm init -y
    npm install ethers dotenv
    ```

2. **Implement event listening**:

    - Listen to `CrossChainRebalanceInitiated`
    - Check guardrails
    - Decide whether to proceed

3. **Handle Nexus bridging**:

    - **Simple**: Send notification → manual bridge
    - **Advanced**: Headless browser automation
    - **Production**: Direct solver API integration

4. **Vincent handles same-chain only**:
    - Much simpler
    - No Nexus SDK needed
    - Just contract calls

## Updated Flow Diagram

```
User deposits → Vault
      │
      │ Yield opportunity detected
      │
      v
┌─────────────────────┐
│ Event Monitor       │
│ (Node.js Service)   │
└─────────────────────┘
      │
      ├─ Same chain? ──→ Vincent (Lit Protocol) → Execute on-chain
      │
      └─ Cross chain? ──→ Nexus SDK (Headless Browser)
                          │
                          └─→ Bridge + Execute
```

## Recommended Path Forward

### Phase 1: Manual Testing (NOW)

-   Use Nexus Dashboard to complete current test
-   Verify end-to-end flow works
-   **Time**: 30 minutes

### Phase 2: Simple Automation (This Week)

-   Build event monitor service
-   Send email notifications for cross-chain rebalances
-   Manually bridge using Nexus Dashboard when notified
-   **Time**: 2-4 hours

### Phase 3: Full Automation (Production)

-   Implement headless browser for Nexus
-   Add retry logic and monitoring
-   Deploy as production service
-   **Time**: 1-2 days

## Code Example: Event Monitor

```typescript
// event-monitor/src/index.ts
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const SEPOLIA_VAULT = "0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a";
const VAULT_ABI = [
    "event CrossChainRebalanceInitiated(address indexed user, uint8 fromProtocol, uint8 toProtocol, uint256 amount, uint256 srcChain, uint256 dstChain, address vincentAutomation)",
];

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const vault = new ethers.Contract(SEPOLIA_VAULT, VAULT_ABI, provider);

    console.log("🎧 Listening for cross-chain rebalance events...\n");

    vault.on(
        "CrossChainRebalanceInitiated",
        async (
            user,
            fromProtocol,
            toProtocol,
            amount,
            srcChain,
            dstChain,
            vincentAddr,
            event
        ) => {
            console.log("🔔 Cross-Chain Rebalance Detected!");
            console.log("─────────────────────────────────");
            console.log("User:", user);
            console.log("Amount:", ethers.formatUnits(amount, 6), "USDC");
            console.log("From Chain:", srcChain.toString());
            console.log("To Chain:", dstChain.toString());
            console.log("TX Hash:", event.log.transactionHash);
            console.log("─────────────────────────────────\n");

            // TODO: Implement Nexus bridging here
            console.log("👉 Action required: Bridge via Nexus Dashboard");
            console.log("   URL: https://nexus.availproject.org");
        }
    );
}

main().catch(console.error);
```

Save this as `event-monitor/src/index.ts` and run:

```bash
npm install ethers dotenv
ts-node src/index.ts
```

This gives you a working event monitor that you can enhance later with full Nexus automation!

## Summary

**Vincent's limitations aren't a blocker** - they just mean we need a separate event monitoring service!

**For now**: Test manually with Nexus Dashboard
**For production**: Build event monitor + headless browser automation

The architecture becomes:

-   **Event Monitor** (Node.js) = Ears + Brain
-   **Vincent** (Lit Protocol) = Hands (execution only)
-   **Nexus SDK** (Browser) = Cross-chain bridge

This is actually a **better architecture** - separation of concerns! 🎯
