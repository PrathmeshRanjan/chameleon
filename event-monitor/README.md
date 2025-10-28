# Chameleon Event Monitor

Real-time blockchain event monitoring service for Chameleon's yield optimization platform.

## Purpose

This service listens to smart contract events from both Ethereum Sepolia and Base Sepolia networks and provides actionable notifications when cross-chain rebalancing is initiated.

## Features

-   🎧 **Real-time Event Listening**: Monitors `CrossChainRebalanceInitiated` and `Rebalanced` events
-   🔔 **Actionable Notifications**: Provides step-by-step instructions for manual bridging via Nexus Dashboard
-   ⛓️ **Multi-chain Support**: Simultaneously monitors Sepolia and Base Sepolia
-   📊 **Detailed Logging**: Comprehensive event details including amounts, protocols, chains, and transaction hashes
-   🔄 **Persistent Monitoring**: Runs 24/7 with automatic reconnection on network issues

## Setup

### Prerequisites

-   Node.js 18+
-   Access to RPC endpoints for Sepolia and Base Sepolia

### Installation

```bash
cd event-monitor
npm install
```

### Configuration

The service reads configuration from `../contracts/.env`. Ensure the following variables are set:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Running

**Development mode (with hot reload):**

```bash
npm run watch
```

**Development mode (single run):**

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

## Monitored Contracts

**Sepolia:**

-   Vault: `0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a`

**Base Sepolia:**

-   Vault: `0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81`

## Events

### CrossChainRebalanceInitiated

Emitted when a user initiates a cross-chain rebalance operation.

**Response:** The monitor displays detailed instructions for completing the bridge via Nexus Dashboard, including:

-   Exact bridging parameters (amount, chains)
-   Destination contract address and function to call
-   Step-by-step manual intervention instructions

### Rebalanced

Emitted when a rebalance operation completes successfully.

**Response:** The monitor logs completion details including APY gains and final state.

## Architecture

This service is part of a 3-tier architecture:

1. **Event Monitor** (this service) - Listens to blockchain events
2. **Vincent Automation** (Lit Protocol) - Executes same-chain rebalancing transactions
3. **Nexus SDK** (Browser/Headless) - Handles cross-chain bridging

The Event Monitor acts as the "brain" that observes blockchain state and provides instructions. In the current implementation, it outputs manual instructions for cross-chain operations via Nexus Dashboard.

## Future Enhancements

-   [ ] Automated Nexus bridging via headless browser (Puppeteer/Playwright)
-   [ ] Integration with Vincent automation for same-chain rebalancing
-   [ ] Guardrails checking (maxSlippage, gasCeiling, minAPYDiff)
-   [ ] Yield comparison and decision logic
-   [ ] Discord/Telegram notifications
-   [ ] Dashboard UI for monitoring
-   [ ] Retry logic and error handling
-   [ ] Multi-user tracking and queuing

## Output Example

```
========================================
  CHAMELEON EVENT MONITOR
========================================

Monitoring contracts:
  Sepolia Vault: 0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a
  Base Sepolia Vault: 0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81

🎧 Listening for events...

🔔 CROSS-CHAIN REBALANCE DETECTED
════════════════════════════════════════════════════
Time: 2024-01-15T10:30:45.123Z
Chain: Sepolia
Block: 5234567
TX Hash: 0xabc...def

Details:
  User: 0x123...789
  Amount: 10.0 USDC
  From Protocol: 0
  To Protocol: 1
  Source Chain: 11155111
  Dest Chain: 84532

📋 ACTION REQUIRED:
════════════════════════════════════════════════════
1. Go to: https://nexus.availproject.org
2. Connect wallet: 0x123...789
3. Bridge:
   - Amount: 10.0 USDC
   - From: Chain 11155111
   - To: Chain 84532

4. Execute on destination:
   - Contract: 0x73951d806B2f2896e639e75c413DD09bA52f61a6
   - Function: deposit(address,uint256)
   - Params: 0x036CbD53842c5426634e7929541eC2318f3dCF7e, 10000000
════════════════════════════════════════════════════
```

## Technical Details

-   **Language:** TypeScript
-   **Blockchain Library:** ethers.js v6
-   **Event Listening:** WebSocket-based persistent connections
-   **Error Handling:** Automatic reconnection on provider errors
-   **Logging:** Structured console output with timestamps

## Troubleshooting

**Events not appearing:**

-   Verify RPC URLs are correct and have WebSocket support
-   Check that contract addresses match deployed contracts
-   Ensure network connection is stable

**TypeScript errors:**

-   Run `npm install` to ensure all dependencies are installed
-   Check Node.js version is 18+

**Process stops unexpectedly:**

-   Use a process manager like `pm2` for production deployments
-   Check RPC rate limits

## Contributing

This service is designed to be extended. Key areas for contribution:

-   Automated bridging integration
-   Additional event types
-   Guardrails and safety checks
-   Notification channels (Discord, Telegram, email)

## License

MIT
