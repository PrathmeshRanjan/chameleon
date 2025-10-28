# Avail Nexus Integration Guide

## Overview

This guide shows how to properly integrate Avail Nexus for cross-chain rebalancing in the Chameleon Protocol.

## Architecture

### Correct Flow:

```
1. User deposits USDC → Vault (Sepolia)
2. Vincent monitors for rebalance opportunities
3. Vincent calls vault.executeRebalance() for cross-chain
4. Vault withdraws from protocol and approves Vincent to spend
5. Vincent uses Nexus SDK to transferFrom vault and bridge
6. Nexus bridges to destination and executes deposit
7. Destination adapter receives and deposits USDC
```

### Key Points:

-   ✅ **No Solidity wrapper for Nexus** - Use the SDK directly
-   ✅ **Vault approves Vincent** - Vincent can spend on behalf of vault
-   ✅ **Intent-based execution** - Solvers compete for best rates
-   ✅ **Unified balance** - Track user funds across chains seamlessly
-   ✅ **Single transaction per chain** - More efficient gas usage

## Installation

### Frontend Integration

```bash
cd /path/to/your/frontend
npm install @avail-project/nexus-sdk @avail-project/nexus-core
```

### Backend/Automation Integration

```bash
cd /path/to/vincent-automation
npm install @avail-project/nexus-core
npm install @avail-project/nexus-sdk
npm install viem ethers
```

## Vincent Automation Implementation

### Setup

```typescript
// vincent-automation/src/nexus-bridge.ts
import { NexusClient } from "@avail-project/nexus-core";
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, baseSepolia } from "viem/chains";

// Initialize wallet
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
});

// Initialize Nexus
const nexus = new NexusClient({
    config: {
        appId: process.env.NEXUS_APP_ID || "chameleon-protocol",
        origin: "chameleon-vincent-automation",
    },
    signer: walletClient,
});

console.log("Nexus initialized:", nexus);
```

### Cross-Chain Rebalance Handler

```typescript
// vincent-automation/src/rebalance-handler.ts
import { NexusClient } from "@avail-project/nexus-core";
import { parseUnits } from "viem";

interface RebalanceParams {
    user: string;
    fromProtocol: number;
    toProtocol: number;
    amount: bigint;
    srcChainId: number;
    dstChainId: number;
    destAdapter: string;
}

export async function handleCrossChainRebalance(
    nexus: NexusClient,
    params: RebalanceParams
) {
    console.log("Starting cross-chain rebalance via Nexus...");
    console.log("From chain:", params.srcChainId);
    console.log("To chain:", params.dstChainId);
    console.log("Amount:", params.amount.toString());
    console.log("Destination adapter:", params.destAdapter);

    try {
        // NOTE: The vault contract has already approved Vincent (this service)
        // to spend the USDC. Nexus SDK will handle the transferFrom internally
        // when it needs to pull funds from the vault.

        // Use Nexus SDK to bridge and execute
        const result = await nexus.bridgeAndExecute({
            token: "USDC",
            amount: params.amount.toString(),
            toChainId: params.dstChainId,
            sourceChains: [params.srcChainId],
            execute: {
                contractAddress: params.destAdapter,
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
                buildFunctionParams: (token, amount, chainId, userAddress) => {
                    const usdcAddress = getUSDCAddress(chainId);
                    const amountWei = parseUnits(amount, 6);
                    return {
                        functionParams: [usdcAddress, amountWei],
                    };
                },
                tokenApproval: {
                    token: "USDC",
                    amount: params.amount.toString(),
                },
            },
            waitForReceipt: true,
            requiredConfirmations: 2,
        });

        console.log("Nexus bridge result:", {
            success: result.success,
            bridgeHash: result.bridgeTransactionHash,
            executeHash: result.executeTransactionHash,
            bridgeSkipped: result.bridgeSkipped,
        });

        return result;
    } catch (error) {
        console.error("Nexus bridging failed:", error);
        throw error;
    }
}

function getUSDCAddress(chainId: number): string {
    const addresses: Record<number, string> = {
        11155111: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // Sepolia
        84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
        1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Mainnet
        8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
    };
    return addresses[chainId];
}
```

### Event Listener

```typescript
// vincent-automation/src/event-listener.ts
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
});

// Listen for CrossChainRebalanceInitiated events
export async function listenForRebalanceEvents(
    vaultAddress: string,
    onEvent: (event: any) => Promise<void>
) {
    console.log("Listening for rebalance events on vault:", vaultAddress);

    const unwatch = publicClient.watchEvent({
        address: vaultAddress as `0x${string}`,
        event: parseAbiItem(
            "event CrossChainRebalanceInitiated(address indexed user, uint8 fromProtocol, uint8 toProtocol, uint256 amount, uint256 srcChain, uint256 dstChain, address vincentAutomation)"
        ),
        onLogs: async (logs) => {
            for (const log of logs) {
                console.log(
                    "CrossChainRebalanceInitiated event detected:",
                    log
                );
                await onEvent(log);
            }
        },
    });

    return unwatch;
}
```

### Main Vincent Service

```typescript
// vincent-automation/src/index.ts
import { NexusClient } from "@avail-project/nexus-core";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { handleCrossChainRebalance } from "./rebalance-handler";
import { listenForRebalanceEvents } from "./event-listener";

async function main() {
    // Setup wallet and Nexus
    const account = privateKeyToAccount(
        process.env.PRIVATE_KEY as `0x${string}`
    );
    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(process.env.SEPOLIA_RPC_URL),
    });

    const nexus = new NexusClient({
        config: {
            appId: process.env.NEXUS_APP_ID || "chameleon-protocol",
            origin: "vincent-automation",
        },
        signer: walletClient,
    });

    console.log("Vincent Automation started");
    console.log("Wallet address:", account.address);

    // Listen for rebalance events
    const vaultAddress = process.env.SEPOLIA_VAULT_ADDRESS!;

    await listenForRebalanceEvents(vaultAddress, async (event) => {
        const { user, fromProtocol, toProtocol, amount, srcChain, dstChain } =
            event.args;

        console.log("Processing rebalance request:", {
            user,
            fromProtocol,
            toProtocol,
            amount: amount.toString(),
            srcChain: srcChain.toString(),
            dstChain: dstChain.toString(),
        });

        // Get destination adapter from environment or config
        const destAdapter = getDestinationAdapter(dstChain, toProtocol);

        // Execute cross-chain rebalance via Nexus
        await handleCrossChainRebalance(nexus, {
            user,
            fromProtocol: Number(fromProtocol),
            toProtocol: Number(toProtocol),
            amount,
            srcChainId: Number(srcChain),
            dstChainId: Number(dstChain),
            destAdapter,
        });

        console.log("Rebalance completed successfully");
    });

    console.log("Event listener active. Waiting for rebalance requests...");
}

function getDestinationAdapter(chainId: bigint, protocolId: bigint): string {
    // Map chain and protocol to adapter address
    // This should come from your config/database
    const adapters: Record<string, string> = {
        "84532_0": process.env.BASE_SEPOLIA_AAVE_ADAPTER!,
        // Add more mappings as needed
    };

    const key = `${chainId}_${protocolId}`;
    return adapters[key] || "";
}

main().catch(console.error);
```

## Frontend Integration (Optional)

For direct user-initiated cross-chain operations:

```typescript
// src/hooks/useNexusBridge.ts
import { useMemo } from "react";
import { NexusClient } from "@avail-project/nexus-core";
import { useWalletClient } from "wagmi";

export function useNexusBridge() {
    const { data: walletClient } = useWalletClient();

    const nexus = useMemo(() => {
        if (!walletClient) return null;

        return new NexusClient({
            config: {
                appId: "chameleon-protocol",
                origin: window.location.origin,
            },
            signer: walletClient,
        });
    }, [walletClient]);

    const bridgeUSDC = async (
        amount: string,
        toChainId: number,
        destContract: string
    ) => {
        if (!nexus) throw new Error("Nexus not initialized");

        const result = await nexus.bridgeAndExecute({
            token: "USDC",
            amount,
            toChainId,
            execute: {
                contractAddress: destContract,
                contractAbi: aaveAdapterAbi,
                functionName: "deposit",
                buildFunctionParams: (token, amt) => ({
                    functionParams: [token, amt],
                }),
                tokenApproval: {
                    token: "USDC",
                    amount,
                },
            },
        });

        return result;
    };

    return { nexus, bridgeUSDC };
}
```

## Environment Variables

```bash
# .env for Vincent Automation
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXUS_APP_ID=chameleon-protocol
SEPOLIA_VAULT_ADDRESS=0x...
BASE_SEPOLIA_VAULT_ADDRESS=0x...
SEPOLIA_AAVE_ADAPTER=0x...
BASE_SEPOLIA_AAVE_ADAPTER=0x...
```

## Testing

### 1. Deploy Contracts

```bash
cd contracts
./deploy-sepolia.sh
./deploy-base-sepolia.sh
```

### 2. Start Vincent Automation

```bash
cd vincent-automation
npm install
npm run start
```

### 3. Trigger Rebalance

```bash
# From another terminal, trigger a rebalance
cast send $SEPOLIA_VAULT_ADDRESS \
  "executeRebalance((address,uint8,uint8,uint256,uint256,uint256,uint256,uint256))" \
  "($USER_ADDRESS,0,1,100000000,11155111,84532,200,10)" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 4. Monitor Logs

Watch Vincent automation logs for:

-   Event detection
-   Nexus bridge initiation
-   Transaction confirmations
-   Completion status

## Production Checklist

-   [ ] Set up proper key management (AWS KMS, HashiCorp Vault)
-   [ ] Implement error handling and retries
-   [ ] Add monitoring and alerting
-   [ ] Set up proper logging (DataDog, CloudWatch)
-   [ ] Implement rate limiting
-   [ ] Add transaction tracking database
-   [ ] Set up health checks
-   [ ] Configure proper gas management
-   [ ] Add slippage protection
-   [ ] Implement timeout handling

## Resources

-   [Nexus SDK Docs](https://docs.availproject.org/nexus/avail-nexus-sdk)
-   [Bridge & Execute](https://docs.availproject.org/nexus/avail-nexus-sdk/nexus-core/bridge-and-execute)
-   [Nexus Demo](https://nexus-demo.availproject.org/)
