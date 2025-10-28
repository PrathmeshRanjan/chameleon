// Nexus Bridge Script - Correctly implements Avail Nexus SDK
// Based on: https://docs.availproject.org/nexus/avail-nexus-sdk/nexus-core/bridge-and-execute

import {
    NexusSDK,
    NEXUS_EVENTS,
    type ProgressStep,
    parseUnits,
} from "@avail-project/nexus-core";

// Configuration
const config = {
    // Deployed contracts
    baseSepoliaAdapter: "0x73951d806B2f2896e639e75c413DD09bA52f61a6",

    // USDC address on Base Sepolia
    usdcBaseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",

    // Chain IDs
    sepoliaChainId: 11155111,
    baseSepoliaChainId: 84532,

    // Amount to bridge (10 USDC)
    amount: "10",
};

async function main() {
    console.log("========================================");
    console.log("  AVAIL NEXUS BRIDGE & EXECUTE");
    console.log("========================================\n");

    // Step 1: Check for browser environment
    if (typeof window === "undefined" || !(window as any).ethereum) {
        console.log("❌ ERROR: This script requires a browser environment\n");
        console.log("Nexus SDK needs window.ethereum (MetaMask or similar)\n");
        console.log("📝 How to test:");
        console.log("1. Use Nexus Dashboard: https://nexus.availproject.org");
        console.log("2. Run in your React frontend (already has Nexus)");
        console.log("3. Create HTML file and load this as module\n");
        console.log("For Vincent automation, implement using:");
        console.log("- Headless browser (Puppeteer)");
        console.log("- Or call Nexus API directly\n");
        return;
    }

    // Step 2: Initialize SDK
    console.log("Step 1: Initializing Nexus SDK...");
    const sdk = new NexusSDK({
        network: "testnet",
        debug: true,
    });

    // Step 3: Initialize with wallet provider
    await sdk.initialize((window as any).ethereum);
    console.log("✅ SDK initialized\n");

    // Step 4: Set up required hooks (MANDATORY)
    console.log("Step 2: Setting up hooks...");

    // Intent hook - approve/deny transaction
    sdk.setOnIntentHook(({ intent, allow, deny, refresh }) => {
        console.log("\n📋 Intent created:");
        console.log("  Routes:", intent.routes?.length || 0);
        console.log("  Estimated time:", intent.estimatedTime);

        // Auto-approve for testing (in production, show UI confirmation)
        console.log("✅ Auto-approving intent...\n");
        allow();
    });

    // Allowance hook - manage token approvals
    sdk.setOnAllowanceHook(({ allow, deny, sources }) => {
        console.log("\n🔐 Allowance required:");
        console.log("  Sources:", sources.length);

        // Approve minimum required (or 'max' for unlimited)
        console.log("✅ Approving minimum allowance...\n");
        allow(["min"]); // or ['max'] for unlimited approval
    });

    console.log("✅ Hooks configured\n");

    // Step 5: Subscribe to progress events (optional but recommended)
    console.log("Step 3: Subscribing to events...");

    sdk.nexusEvents.on(
        NEXUS_EVENTS.BRIDGE_EXECUTE_EXPECTED_STEPS,
        (steps: ProgressStep[]) => {
            console.log(
                "\n📊 Expected steps:",
                steps.map((s) => s.typeID).join(" → ")
            );
        }
    );

    sdk.nexusEvents.on(
        NEXUS_EVENTS.BRIDGE_EXECUTE_COMPLETED_STEPS,
        (step: ProgressStep) => {
            console.log(`✓ Step completed: ${step.typeID}`);
            if (step.data?.explorerURL) {
                console.log(`  Explorer: ${step.data.explorerURL}`);
            }
        }
    );

    console.log("✅ Events subscribed\n");

    // Step 6: Execute bridge and contract call
    console.log("Step 4: Executing bridge & execute...");
    console.log("─────────────────────────────────────");
    console.log("From: Ethereum Sepolia (11155111)");
    console.log("To: Base Sepolia (84532)");
    console.log("Token: USDC");
    console.log("Amount:", config.amount);
    console.log("Destination:", config.baseSepoliaAdapter);
    console.log("Action: Call adapter.deposit()");
    console.log("─────────────────────────────────────\n");

    try {
        const result = await sdk.bridgeAndExecute({
            token: "USDC",
            amount: config.amount,
            toChainId: config.baseSepoliaChainId,
            sourceChains: [config.sepoliaChainId], // Only use Sepolia as source
            execute: {
                contractAddress: config.baseSepoliaAdapter,
                contractAbi: [
                    {
                        inputs: [
                            {
                                internalType: "address",
                                name: "asset",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                        ],
                        name: "deposit",
                        outputs: [],
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                ],
                functionName: "deposit",
                buildFunctionParams: (
                    _token,
                    amount,
                    _chainId,
                    _userAddress
                ) => {
                    const decimals = 6; // USDC decimals
                    const amountWei = parseUnits(amount, decimals);
                    return {
                        functionParams: [config.usdcBaseSepolia, amountWei],
                    };
                },
                tokenApproval: {
                    token: "USDC",
                    amount: config.amount,
                },
            },
            waitForReceipt: true,
            requiredConfirmations: 2,
        });

        console.log("\n========================================");
        console.log("  RESULT");
        console.log("========================================");
        console.log("Success:", result.success ? "✅ YES" : "❌ NO");

        if (result.success) {
            console.log("\n📝 Transaction Details:");
            if (result.bridgeTransactionHash) {
                console.log("Bridge TX:", result.bridgeTransactionHash);
            }
            if (result.bridgeExplorerUrl) {
                console.log("Bridge Explorer:", result.bridgeExplorerUrl);
            }
            if (result.executeTransactionHash) {
                console.log("Execute TX:", result.executeTransactionHash);
            }
            if (result.executeExplorerUrl) {
                console.log("Execute Explorer:", result.executeExplorerUrl);
            }
            if (result.bridgeSkipped) {
                console.log(
                    "\n💡 Bridge was skipped (sufficient funds on destination)"
                );
            }

            console.log("\n✅ Cross-chain rebalance completed!");
            console.log("\n📋 Next steps:");
            console.log("1. Verify USDC deposited to Aave on Base Sepolia");
            console.log("2. Check adapter balance");
            console.log("3. Verify vault accounting");
        } else {
            console.log("\n❌ Transaction failed");
            if (result.error) {
                console.log("Error:", result.error);
            }
        }
    } catch (error) {
        console.error("\n❌ ERROR during bridging:");
        console.error(error);

        console.log("\n🔍 Possible issues:");
        console.log("• Insufficient USDC balance");
        console.log("• Vault approval not set");
        console.log("• Network connectivity");
        console.log("• Gas price too high");

        throw error;
    }

    console.log("\n========================================");
    console.log("  TEST COMPLETE");
    console.log("========================================\n");
}

// Run the script
if (typeof window !== "undefined") {
    // Browser environment - can run immediately
    main().catch(console.error);
} else {
    // Node.js environment - show instructions
    console.log("\n⚠️  This script must run in a browser environment\n");
    console.log("To test Nexus bridging:\n");
    console.log("Option 1: Use Nexus Dashboard");
    console.log("  → https://nexus.availproject.org\n");
    console.log("Option 2: Use your frontend");
    console.log("  → Your React app already has Nexus SDK integrated\n");
    console.log("Option 3: Create test HTML page");
    console.log("  → See MANUAL_TESTING_GUIDE.md\n");
}

export { main };
