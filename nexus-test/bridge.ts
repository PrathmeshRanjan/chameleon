// Nexus Bridge Test Script
// This script uses Avail Nexus SDK to bridge USDC from Sepolia to Base Sepolia
// and execute the deposit on the destination adapter

import {
    NexusSDK,
    NEXUS_EVENTS,
    type ProgressStep,
} from "@avail-project/nexus-core";
import { parseUnits } from "viem";
import * as dotenv from "dotenv";

dotenv.config({ path: "../contracts/.env" });

// Configuration
const config = {
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    sepoliaRPC:
        process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY",
    baseSepoliaRPC:
        process.env.BASE_SEPOLIA_RPC_URL ||
        "https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",

    // Deployed contracts
    sepoliaVault: "0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a",
    baseSepoliaAdapter: "0x73951d806B2f2896e639e75c413DD09bA52f61a6",

    // USDC addresses
    usdcSepolia: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
    usdcBaseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",

    // Amount to bridge (10 USDC)
    amount: "10",
};

async function main() {
    console.log("========================================");
    console.log("  AVAIL NEXUS BRIDGE TEST");
    console.log("========================================\n");

    // Check for window.ethereum (browser environment required)
    if (typeof window === "undefined" || !window.ethereum) {
        console.log(
            "❌ ERROR: Nexus SDK requires a browser environment with injected wallet provider"
        );
        console.log("");
        console.log(
            "This script must be run in a browser environment (not Node.js CLI)."
        );
        console.log("");
        console.log("Options to test Nexus bridging:");
        console.log(
            "1. Use the Nexus Dashboard: https://nexus.availproject.org"
        );
        console.log(
            "2. Use your frontend application (Nexus SDK already integrated)"
        );
        console.log("3. Create a simple HTML page that loads this script");
        console.log("");
        console.log("For automated Vincent service, you'll need to:");
        console.log("- Use a headless browser (Puppeteer/Playwright)");
        console.log("- Or implement direct API calls to Nexus solvers");
        console.log("- Or use the Nexus Dashboard programmatically");
        process.exit(1);
    }

    // Initialize Nexus SDK (requires browser environment)
    console.log("Initializing Nexus SDK...");
    const sdk = new NexusSDK({
        network: "testnet",
        debug: true,
    });

    // Initialize with window.ethereum
    await sdk.initialize(window.ethereum);
    console.log("✅ Nexus SDK initialized\n");

    // Prepare bridge parameters
    console.log("Bridge Parameters:");
    console.log("  From: Ethereum Sepolia");
    console.log("  To: Base Sepolia");
    console.log("  Token: USDC");
    console.log("  Amount:", config.amount, "USDC");
    console.log("  Destination adapter:", config.baseSepoliaAdapter);
    console.log("");

    // Execute bridge with contract call
    console.log("Executing bridge and deposit...");
    console.log("This will:");
    console.log("1. Transfer USDC from vault to Nexus");
    console.log("2. Bridge USDC to Base Sepolia");
    console.log("3. Call adapter.deposit() on destination");
    console.log("");

    try {
        const result = await nexus.bridgeAndExecute({
            token: "USDC",
            amount: config.amount,
            toChainId: baseSepolia.id,
            sourceChains: [sepolia.id],
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
                buildFunctionParams: (_token, amount) => {
                    const usdcAddress = config.usdcBaseSepolia;
                    const amountWei = parseUnits(amount, 6);
                    return {
                        functionParams: [usdcAddress, amountWei],
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
        console.log("  BRIDGE RESULT");
        console.log("========================================");
        console.log("Success:", result.success);
        console.log("Bridge TX Hash:", result.bridgeTransactionHash);
        console.log("Execute TX Hash:", result.executeTransactionHash);
        console.log("Bridge Skipped:", result.bridgeSkipped);

        if (result.success) {
            console.log("\n✅ Cross-chain rebalance completed successfully!");
            console.log("\nNext Steps:");
            console.log("1. Verify USDC was deposited to Base Sepolia Aave");
            console.log("2. Check adapter balance on Base Sepolia");
            console.log("3. Verify vault accounting is correct");
        } else {
            console.log("\n❌ Bridge failed");
        }
    } catch (error) {
        console.error("\n❌ Error during bridging:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("\n========================================");
        console.log("  TEST COMPLETE");
        console.log("========================================\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
