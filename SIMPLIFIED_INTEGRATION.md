# Chameleon Integration - Simplified Approach

## Quick Start Integration

Given the complexity of full Vincent backend integration, here's a **simplified approach** that demonstrates Chameleon + Avail Nexus integration for the demo:

## Architecture (Simplified)

```
┌─────────────────────┐
│   User (Browser)    │
│  - Connects Wallet  │
│  - Deposits USDC    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────────────┐
│         Chameleon Frontend                  │
│  1. User deposits to Sepolia vault          │
│  2. executeRebalance() called on-chain      │
│  3. Event: CrossChainRebalanceInitiated     │
└──────────┬──────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────┐
│      Event Monitor (Already Running!)       │
│  - Detects CrossChainRebalanceInitiated     │
│  - Logs bridge parameters                   │
│  - Shows manual steps (for demo)            │
└──────────┬──────────────────────────────────┘
           │
           ↓ (Manual for demo)
┌─────────────────────────────────────────────┐
│         Avail Nexus Dashboard               │
│  - User/Demo completes bridge               │
│  - USDC: Sepolia → Base Sepolia             │
│  - Execute: adapter.deposit()               │
└──────────┬──────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────┐
│      Base Sepolia Aave Adapter              │
│  - USDC deposited to Aave                   │
│  - Position tracked on dashboard            │
└─────────────────────────────────────────────┘
```

## What's Already Working ✅

1. **Smart Contracts** - Deployed and tested
2. **Event Monitor** - Running and listening
3. **Frontend UI** - Deposit, dashboard, automation tabs
4. **Nexus SDK** - Integrated in frontend

## What We Need to Add

### Option A: Frontend-Only Integration (Quickest for Demo)

Add a **single integrated component** that:

1. Allows user to deposit USDC on Sepolia
2. Shows the deposit transaction
3. Automatically opens Nexus bridge with pre-filled parameters
4. Tracks bridge completion
5. Shows final position on dashboard

**Advantages:**

-   No backend changes needed
-   Works with existing infrastructure
-   Fast to implement (1-2 hours)
-   Perfect for demo

**Files to modify:**

-   `src/components/deposit/DepositCard.tsx` - Add cross-chain flow
-   `src/hooks/useCrossChainDeposit.ts` - New hook for flow orchestration
-   `src/components/automation/CrossChainFlow.tsx` - Visual flow component

### Option B: Vincent Backend Integration (Full Production)

Integrate with Vincent's dca-backend:

1. Add Chameleon-specific jobs to Agenda
2. Monitor events from backend
3. Automate Nexus bridge (headless browser or API)
4. Execute final deposit via Vincent abilities

**Advantages:**

-   Fully automated
-   Production-ready
-   Leverages Vincent's PKP delegation
-   Gasless UX with Alchemy sponsorship

**Time needed:**

-   2-3 days for full integration
-   Testing and refinement

## Recommended Demo Flow (Option A)

### Step 1: Enhanced Deposit Component

```tsx
// src/components/deposit/CrossChainDepositCard.tsx

export function CrossChainDepositCard() {
    const [step, setStep] = useState<
        "deposit" | "bridge" | "stake" | "complete"
    >("deposit");
    const [depositTx, setDepositTx] = useState<string>("");
    const [bridgeTx, setDepositTx] = useState<string>("");

    // Step 1: Deposit on Sepolia
    const handleDeposit = async () => {
        // Call vault.deposit() on Sepolia
        // Emit CrossChainRebalanceInitiated
        setStep("bridge");
    };

    // Step 2: Bridge via Nexus
    const handleBridge = async () => {
        // Use Nexus SDK to bridge USDC
        // From Sepolia to Base Sepolia
        setStep("stake");
    };

    // Step 3: Stake on Base Sepolia
    const handleStake = async () => {
        // Call adapter.deposit() on Base Sepolia
        setStep("complete");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cross-Chain Yield Deposit</CardTitle>
                <CardDescription>
                    Deposit USDC on Sepolia → Bridge to Base Sepolia → Stake in
                    Aave
                </CardDescription>
            </CardHeader>

            <CardContent>
                <ProgressSteps current={step} />

                {step === "deposit" && (
                    <DepositForm onDeposit={handleDeposit} />
                )}
                {step === "bridge" && (
                    <BridgeInterface
                        onBridge={handleBridge}
                        depositTx={depositTx}
                    />
                )}
                {step === "stake" && (
                    <StakeInterface onStake={handleStake} bridgeTx={bridgeTx} />
                )}
                {step === "complete" && <CompletionSummary />}
            </CardContent>
        </Card>
    );
}
```

### Step 2: Nexus Integration Hook

```tsx
// src/hooks/useCrossChainDeposit.ts

export function useCrossChainDeposit() {
    const { nexusSDK } = useNexus();
    const { address } = useAccount();

    const depositAndBridge = async (amount: string) => {
        // 1. Deposit to Sepolia vault
        const vaultContract = new Contract(SEPOLIA_VAULT, ABI, signer);
        const depositTx = await vaultContract.deposit(
            parseUnits(amount, 6),
            address
        );
        await depositTx.wait();

        // 2. Approve USDC for Nexus bridge
        const usdcContract = new Contract(USDC_SEPOLIA, ERC20_ABI, signer);
        const approveTx = await usdcContract.approve(
            NEXUS_BRIDGE_ADDRESS,
            parseUnits(amount, 6)
        );
        await approveTx.wait();

        // 3. Bridge via Nexus
        const bridgeTx = await nexusSDK.bridgeAndExecute({
            sourceChain: 11155111,
            destinationChain: 84532,
            token: USDC_SEPOLIA,
            amount: parseUnits(amount, 6),
            destinationContract: BASE_SEPOLIA_AAVE_ADAPTER,
            destinationFunction: "deposit",
            destinationArgs: [USDC_BASE_SEPOLIA, parseUnits(amount, 6)],
        });

        return {
            depositTx: depositTx.hash,
            bridgeTx: bridgeTx.hash,
        };
    };

    return { depositAndBridge };
}
```

### Step 3: Visual Flow Component

```tsx
// src/components/automation/CrossChainFlow.tsx

export function CrossChainFlow({ currentStep }: { currentStep: string }) {
    return (
        <div className="flex items-center justify-between w-full">
            <FlowStep
                icon={<Wallet />}
                title="Deposit"
                subtitle="Sepolia Vault"
                status={getStatus("deposit", currentStep)}
            />

            <FlowArrow animated={currentStep === "bridge"} />

            <FlowStep
                icon={<Bridge />}
                title="Bridge"
                subtitle="Avail Nexus"
                status={getStatus("bridge", currentStep)}
            />

            <FlowArrow animated={currentStep === "stake"} />

            <FlowStep
                icon={<Vault />}
                title="Stake"
                subtitle="Base Aave"
                status={getStatus("stake", currentStep)}
            />
        </div>
    );
}
```

## Implementation Checklist

### Immediate (For Demo) - 2-3 hours

-   [ ] Create `CrossChainDepositCard` component
-   [ ] Add `useCrossChainDeposit` hook
-   [ ] Create `CrossChainFlow` visual component
-   [ ] Update main `Nexus` component to use new deposit card
-   [ ] Add transaction status tracking
-   [ ] Test end-to-end flow on testnets

### Short-term (Production) - 2-3 days

-   [ ] Integrate Vincent backend
-   [ ] Add Chameleon job handlers to Agenda
-   [ ] Implement automated Nexus bridging
-   [ ] Add position tracking in MongoDB
-   [ ] Create API endpoints for position queries
-   [ ] Add comprehensive error handling
-   [ ] Deploy to production

## Quick Demo Script

```bash
# Terminal 1: Event Monitor (Already running!)
cd event-monitor
npm run dev

# Terminal 2: Frontend
cd /Users/prathmeshranjan/Desktop/Chameleon
npm run dev

# Demo Steps:
1. Open http://localhost:5173
2. Connect wallet (with Sepolia testnet selected)
3. Click "Deposit" tab
4. Enter amount: 10 USDC
5. Click "Deposit & Bridge"
6. Approve transactions:
   - Deposit to Sepolia vault ✅
   - Approve USDC for Nexus ✅
   - Bridge via Nexus ✅
   - Execute stake on Base Sepolia ✅
7. See position on Dashboard tab
8. Event monitor shows all events in terminal
```

## Vincent Integration (When Ready)

When you want full automation with Vincent:

1. **Copy Vincent Backend Code**

    ```bash
    cp -r Chameleon-Yield/packages/dca-backend/src/lib/chameleon ./vincent-chameleon
    ```

2. **Install Dependencies**

    ```bash
    cd Chameleon-Yield/packages/dca-backend
    pnpm install
    ```

3. **Configure Environment**

    ```bash
    # Add to .env
    SEPOLIA_RPC_URL=...
    BASE_SEPOLIA_RPC_URL=...
    VINCENT_APP_ID=7506411077
    ```

4. **Start Vincent Worker**

    ```bash
    pnpm dev
    ```

5. **Connect Frontend to Backend**

    ```tsx
    // In frontend
    const API_BASE_URL = "http://localhost:3000";

    // Use Vincent session
    const { sessionSigs } = useSession();
    ```

## Summary

For the **demo**, I recommend Option A (Frontend-only) because:

1. ✅ Fast to implement (2-3 hours)
2. ✅ No complex backend setup
3. ✅ Demonstrates all key features:
    - Cross-chain deposits
    - Avail Nexus integration
    - Real-time event monitoring
    - Dashboard visualization
4. ✅ User still experiences full flow

For **production**, implement Option B (Vincent backend) to get:

-   Fully automated flow
-   PKP delegation
-   Gasless transactions
-   Backend monitoring
-   Advanced error handling

## Next Steps

**Choose your path:**

**Path A (Demo in 2-3 hours):**

```bash
# I'll create the frontend components now
# You can test immediately
```

**Path B (Production in 2-3 days):**

```bash
# I'll set up Vincent backend integration
# Full automation with PKP delegation
```

Which path do you want to take? 🚀
