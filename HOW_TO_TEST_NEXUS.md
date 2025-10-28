# Testing Avail Nexus Cross-Chain Bridging

## ✅ What We've Accomplished

The on-chain part of cross-chain rebalancing is **working perfectly**:

1. ✅ Vault contract successfully initiated cross-chain rebalance
2. ✅ Vault approved Vincent (your address) to spend 10 USDC
3. ✅ `CrossChainRebalanceInitiated` event was emitted

## 🔄 Next Step: Complete the Bridge

To finish the cross-chain rebalance, we need to bridge USDC from Sepolia to Base Sepolia using Avail Nexus.

## Understanding Nexus SDK Requirements

**Nexus SDK requires a browser environment** with an injected wallet provider (`window.ethereum`).

This means you CANNOT run it directly from Node.js CLI. Here are your options:

---

## Option 1: Use Nexus Dashboard (⭐ Recommended for Quick Test)

**Easiest and fastest way to test the complete flow!**

### Steps:

1. Go to https://nexus.availproject.org
2. Connect your wallet (use the deployer address)
3. Select Bridge & Execute:

    - **From**: Ethereum Sepolia
    - **To**: Base Sepolia
    - **Token**: USDC
    - **Amount**: 10 USDC

4. In the "Execute" section:

    - **Contract**: `0x73951d806B2f2896e639e75c413DD09bA52f61a6` (Base Sepolia Aave Adapter)
    - **Function**: `deposit`
    - **Parameters**:
        - `asset`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC on Base Sepolia)
        - `amount`: `10000000` (10 USDC with 6 decimals)

5. Confirm the transaction

6. Wait for completion (2-10 minutes)

7. Verify:
    - Check Base Sepolia explorer for the deposit transaction
    - Verify USDC was deposited to Aave

---

## Option 2: Use Your Frontend (✨ Best for Integration Testing)

Your React frontend already has Nexus SDK integrated!

### Steps:

1. Start your frontend: `npm run dev`
2. Connect wallet (deployer address)
3. Go to the Bridge section
4. Bridge 10 USDC from Sepolia to Base Sepolia
5. Monitor the transaction in the UI

**File**: `src/components/bridge.tsx` already has the Nexus SDK implementation

---

## Option 3: Create HTML Test Page

Since Nexus requires a browser, create a simple HTML page:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Nexus Bridge Test</title>
    </head>
    <body>
        <h1>Avail Nexus Bridge Test</h1>
        <div id="status">Initializing...</div>
        <button id="bridge-btn">Bridge & Execute</button>

        <script type="module">
            import { NexusSDK } from "https://esm.sh/@avail-project/nexus-core";

            const sdk = new NexusSDK({ network: "testnet", debug: true });

            // Initialize with MetaMask
            await sdk.initialize(window.ethereum);

            // Set up hooks
            sdk.setOnIntentHook(({ allow }) => allow());
            sdk.setOnAllowanceHook(({ allow }) => allow(["min"]));

            document.getElementById("bridge-btn").onclick = async () => {
                const result = await sdk.bridgeAndExecute({
                    token: "USDC",
                    amount: "10",
                    toChainId: 84532, // Base Sepolia
                    sourceChains: [11155111], // Sepolia
                    execute: {
                        contractAddress:
                            "0x73951d806B2f2896e639e75c413DD09bA52f61a6",
                        contractAbi: [
                            {
                                inputs: [
                                    { name: "asset", type: "address" },
                                    { name: "amount", type: "uint256" },
                                ],
                                name: "deposit",
                                outputs: [],
                                type: "function",
                            },
                        ],
                        functionName: "deposit",
                        buildFunctionParams: (token, amount) => ({
                            functionParams: [
                                "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC Base Sepolia
                                BigInt(10000000), // 10 USDC
                            ],
                        }),
                        tokenApproval: { token: "USDC", amount: "10" },
                    },
                    waitForReceipt: true,
                });

                console.log("Result:", result);
            };
        </script>
    </body>
</html>
```

Save as `test-nexus.html` and open in browser with MetaMask installed.

---

## Option 4: Build Vincent Automation Service

For production, Vincent needs to automate this. Here are approaches:

### Approach A: Headless Browser (Puppeteer)

```typescript
// vincent-automation/src/nexus-bridge.ts
import puppeteer from "puppeteer";

async function bridgeWithNexus(params) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Inject wallet
    await page.evaluateOnNewDocument((privateKey) => {
        // Inject ethers/viem wallet as window.ethereum
    }, process.env.PRIVATE_KEY);

    // Load Nexus SDK
    await page.addScriptTag({
        url: "https://esm.sh/@avail-project/nexus-core",
    });

    // Execute bridge
    const result = await page.evaluate(async (params) => {
        const sdk = new NexusSDK({ network: "testnet" });
        await sdk.initialize(window.ethereum);
        sdk.setOnIntentHook(({ allow }) => allow());
        sdk.setOnAllowanceHook(({ allow }) => allow(["min"]));
        return await sdk.bridgeAndExecute(params);
    }, params);

    await browser.close();
    return result;
}
```

### Approach B: Direct API Integration

Research Nexus solver API and call directly (advanced):

-   Study Nexus protocol architecture
-   Implement intent creation
-   Submit to solver network
-   Monitor execution

### Approach C: Hybrid (Recommended for Production)

1. Use Nexus Dashboard API for bridging
2. Monitor blockchain for completion
3. Fall back to manual intervention if needed

---

## Verification Steps

After bridging (regardless of method):

### 1. Check Source Chain (Sepolia)

```bash
# Check USDC balance (should be less by 10 USDC)
cast call $USDC_SEPOLIA "balanceOf(address)" $YOUR_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL
```

### 2. Check Destination Chain (Base Sepolia)

```bash
# Check if adapter received USDC
cast call $USDC_BASE_SEPOLIA "balanceOf(address)" $BASE_SEPOLIA_AAVE_ADAPTER \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check if deposited to Aave
cast call $BASE_AAVE_POOL "getReserveData(address)" $USDC_BASE_SEPOLIA \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

### 3. Check Events

```bash
# Check for ProtocolDeposit event on adapter
cast logs --address $BASE_SEPOLIA_AAVE_ADAPTER \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## Summary

### ✅ Completed:

-   Smart contracts deployed and working
-   Cross-chain rebalance initiated successfully
-   Vault approved Vincent to spend USDC
-   Events emitted correctly

### 📝 To Complete:

-   Bridge 10 USDC using one of the options above
-   Verify deposit on Base Sepolia
-   Confirm end-to-end flow works

### 🚀 For Production:

-   Implement Vincent automation service
-   Use headless browser or API approach
-   Add monitoring and alerting
-   Implement retry logic

---

## Deployed Contracts

```
Ethereum Sepolia:
  Vault: 0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a
  Aave Adapter: 0x018e2f42a6C4a0c6400b14b7A35552e6C0f41D4E

Base Sepolia:
  Vault: 0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81
  Aave Adapter: 0x73951d806B2f2896e639e75c413DD09bA52f61a6

USDC:
  Sepolia: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
  Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

---

## Next Actions

1. **Quick Test**: Use Nexus Dashboard (Option 1) - 5 minutes
2. **Integration Test**: Use your frontend (Option 2) - 10 minutes
3. **Production**: Build Vincent automation (Option 4) - Several hours

**Recommendation**: Start with Option 1 to verify the complete flow works, then build Vincent automation for production! 🚀
