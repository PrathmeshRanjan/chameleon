import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: "../contracts/.env" });

// Contract addresses
const SEPOLIA_VAULT = "0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a";
const BASE_SEPOLIA_VAULT = "0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81";

// Vault ABI - only events we care about
const VAULT_ABI = [
    "event CrossChainRebalanceInitiated(address indexed user, uint8 fromProtocol, uint8 toProtocol, uint256 amount, uint256 srcChain, uint256 dstChain, address vincentAutomation)",
    "event Rebalanced(address indexed user, uint8 fromProtocol, uint8 toProtocol, uint256 amount, uint256 srcChain, uint256 dstChain, uint256 apyGain)",
];

class EventMonitor {
    private sepoliaProvider: ethers.JsonRpcProvider;
    private baseSepoliaProvider: ethers.JsonRpcProvider;
    private sepoliaVault: ethers.Contract;
    private baseSepoliaVault: ethers.Contract;

    constructor() {
        // Initialize providers
        this.sepoliaProvider = new ethers.JsonRpcProvider(
            process.env.SEPOLIA_RPC_URL
        );
        this.baseSepoliaProvider = new ethers.JsonRpcProvider(
            process.env.BASE_SEPOLIA_RPC_URL
        );

        // Initialize contracts
        this.sepoliaVault = new ethers.Contract(
            SEPOLIA_VAULT,
            VAULT_ABI,
            this.sepoliaProvider
        );
        this.baseSepoliaVault = new ethers.Contract(
            BASE_SEPOLIA_VAULT,
            VAULT_ABI,
            this.baseSepoliaProvider
        );
    }

    async start() {
        console.log("");
        console.log("========================================");
        console.log("  CHAMELEON EVENT MONITOR");
        console.log("========================================");
        console.log("");
        console.log("Monitoring contracts:");
        console.log("  Sepolia Vault:", SEPOLIA_VAULT);
        console.log("  Base Sepolia Vault:", BASE_SEPOLIA_VAULT);
        console.log("");
        console.log("🎧 Listening for events...");
        console.log("");

        // Listen to Sepolia vault events
        this.sepoliaVault.on(
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
                await this.handleCrossChainRebalance({
                    chain: "Sepolia",
                    user,
                    fromProtocol,
                    toProtocol,
                    amount,
                    srcChain,
                    dstChain,
                    txHash: event.log.transactionHash,
                    blockNumber: event.log.blockNumber,
                });
            }
        );

        // Listen to Base Sepolia vault events
        this.baseSepoliaVault.on(
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
                await this.handleCrossChainRebalance({
                    chain: "Base Sepolia",
                    user,
                    fromProtocol,
                    toProtocol,
                    amount,
                    srcChain,
                    dstChain,
                    txHash: event.log.transactionHash,
                    blockNumber: event.log.blockNumber,
                });
            }
        );

        // Listen to completed rebalances
        this.sepoliaVault.on(
            "Rebalanced",
            async (
                user,
                fromProtocol,
                toProtocol,
                amount,
                srcChain,
                dstChain,
                apyGain,
                event
            ) => {
                this.handleRebalanceCompleted({
                    chain: "Sepolia",
                    user,
                    fromProtocol,
                    toProtocol,
                    amount,
                    srcChain,
                    dstChain,
                    apyGain,
                    txHash: event.log.transactionHash,
                });
            }
        );

        this.baseSepoliaVault.on(
            "Rebalanced",
            async (
                user,
                fromProtocol,
                toProtocol,
                amount,
                srcChain,
                dstChain,
                apyGain,
                event
            ) => {
                this.handleRebalanceCompleted({
                    chain: "Base Sepolia",
                    user,
                    fromProtocol,
                    toProtocol,
                    amount,
                    srcChain,
                    dstChain,
                    apyGain,
                    txHash: event.log.transactionHash,
                });
            }
        );

        // Keep the process running
        process.on("SIGINT", () => {
            console.log("\n\n👋 Shutting down event monitor...");
            process.exit(0);
        });
    }

    private async handleCrossChainRebalance(params: {
        chain: string;
        user: string;
        fromProtocol: number;
        toProtocol: number;
        amount: bigint;
        srcChain: bigint;
        dstChain: bigint;
        txHash: string;
        blockNumber: number;
    }) {
        const timestamp = new Date().toISOString();

        console.log("🔔 CROSS-CHAIN REBALANCE DETECTED");
        console.log("════════════════════════════════════════════════════");
        console.log("Time:", timestamp);
        console.log("Chain:", params.chain);
        console.log("Block:", params.blockNumber);
        console.log("TX Hash:", params.txHash);
        console.log("");
        console.log("Details:");
        console.log("  User:", params.user);
        console.log("  Amount:", ethers.formatUnits(params.amount, 6), "USDC");
        console.log("  From Protocol:", params.fromProtocol);
        console.log("  To Protocol:", params.toProtocol);
        console.log("  Source Chain:", params.srcChain.toString());
        console.log("  Dest Chain:", params.dstChain.toString());
        console.log("");
        console.log("📋 ACTION REQUIRED:");
        console.log("════════════════════════════════════════════════════");
        console.log("1. Go to: https://nexus.availproject.org");
        console.log("2. Connect wallet:", params.user);
        console.log("3. Bridge:");
        console.log(
            "   - Amount:",
            ethers.formatUnits(params.amount, 6),
            "USDC"
        );
        console.log("   - From: Chain", params.srcChain.toString());
        console.log("   - To: Chain", params.dstChain.toString());
        console.log("");
        console.log("4. Execute on destination:");
        if (params.dstChain === 84532n) {
            console.log(
                "   - Contract: 0x73951d806B2f2896e639e75c413DD09bA52f61a6"
            );
            console.log("   - Function: deposit(address,uint256)");
            console.log(
                "   - Params: 0x036CbD53842c5426634e7929541eC2318f3dCF7e,",
                params.amount.toString()
            );
        } else if (params.dstChain === 11155111n) {
            console.log(
                "   - Contract: 0x018e2f42a6C4a0c6400b14b7A35552e6C0f41D4E"
            );
            console.log("   - Function: deposit(address,uint256)");
            console.log(
                "   - Params: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8,",
                params.amount.toString()
            );
        }
        console.log("════════════════════════════════════════════════════");
        console.log("");

        // TODO: In production, implement automated bridging here
        // For now, this notification is sufficient for testing
    }

    private handleRebalanceCompleted(params: {
        chain: string;
        user: string;
        fromProtocol: number;
        toProtocol: number;
        amount: bigint;
        srcChain: bigint;
        dstChain: bigint;
        apyGain: bigint;
        txHash: string;
    }) {
        const timestamp = new Date().toISOString();

        console.log("✅ REBALANCE COMPLETED");
        console.log("────────────────────────────────────────────────────");
        console.log("Time:", timestamp);
        console.log("Chain:", params.chain);
        console.log("TX Hash:", params.txHash);
        console.log("");
        console.log("Details:");
        console.log("  User:", params.user);
        console.log("  Amount:", ethers.formatUnits(params.amount, 6), "USDC");
        console.log("  From Protocol:", params.fromProtocol);
        console.log("  To Protocol:", params.toProtocol);
        console.log("  APY Gain:", Number(params.apyGain) / 100, "%");
        console.log(
            "  Chains:",
            params.srcChain.toString(),
            "→",
            params.dstChain.toString()
        );
        console.log("────────────────────────────────────────────────────");
        console.log("");
    }
}

// Start the monitor
async function main() {
    const monitor = new EventMonitor();
    await monitor.start();
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
