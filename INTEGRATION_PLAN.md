# Chameleon + Vincent + Avail Nexus Integration Plan

## Overview

This document outlines the integration of Chameleon's yield optimizer with Vincent automation and Avail Nexus for seamless cross-chain deposits.

## Flow Architecture

```
User (Browser)
    ↓ Deposit 100 USDC on Sepolia
Sepolia Vault (YieldOptimizerUSDC.sol)
    ↓ Approves Vincent + Emits CrossChainRebalanceInitiated
Vincent Backend (Modified from dca-backend)
    ↓ Listens to event + Gets USDC approval
Avail Nexus SDK (Browser-based automation)
    ↓ Bridge 100 USDC from Sepolia → Base Sepolia
Base Sepolia (USDC arrives)
    ↓ Vincent executes deposit
Base Sepolia Aave Adapter
    ↓ Deposits to Aave
User sees position on Dashboard ✅
```

## Components to Integrate

### 1. **Frontend (Existing Chameleon UI)**

-   Location: `/Users/prathmeshranjan/Desktop/Chameleon/src`
-   Already has: Nexus SDK integration, Deposit UI, Dashboard
-   **Action**: Add Vincent authentication & cross-chain deposit flow

### 2. **Backend (Vincent dca-backend)**

-   Location: `/Users/prathmeshranjan/Desktop/Chameleon/Chameleon-Yield/packages/dca-backend`
-   Already has: Vincent abilities, Agenda jobs, MongoDB
-   **Action**: Create new job for Chameleon cross-chain deposits

### 3. **Smart Contracts (Deployed)**

-   Sepolia Vault: `0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a`
-   Base Sepolia Vault: `0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81`
-   Base Sepolia Aave Adapter: `0x73951d806B2f2896e639e75c413DD09bA52f61a6`

### 4. **Avail Nexus SDK**

-   Already integrated in frontend
-   Needs automation layer for backend triggering

## Implementation Steps

### Phase 1: Backend Integration (Vincent)

#### 1.1 Create Chameleon Job Handler

-   File: `packages/dca-backend/src/lib/agenda/jobs/executeChameleonDeposit/`
-   Purpose: Listen to CrossChainRebalanceInitiated events
-   Actions:
    -   Monitor Sepolia vault for events
    -   Trigger Avail Nexus bridge
    -   Execute deposit on Base Sepolia

#### 1.2 Vincent Abilities Needed

-   ✅ `erc20-approval` - Already available
-   ✅ `call-contract` - Already available
-   ✅ `evm-transaction-signer` - Already available
-   🆕 Nexus bridge integration (via headless browser or API)

#### 1.3 Environment Variables

```env
# Add to dca-backend/.env
SEPOLIA_RPC_URL=...
BASE_SEPOLIA_RPC_URL=...
SEPOLIA_VAULT_ADDRESS=0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a
BASE_SEPOLIA_VAULT_ADDRESS=0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81
BASE_SEPOLIA_AAVE_ADAPTER=0x73951d806B2f2896e639e75c413DD09bA52f61a6
USDC_SEPOLIA_ADDRESS=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
USDC_BASE_SEPOLIA_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Phase 2: Frontend Integration

#### 2.1 Add Vincent Authentication

-   Use existing Vincent session from dca-frontend
-   Share session between Chameleon UI and Vincent backend

#### 2.2 Cross-Chain Deposit Component

-   Enhance existing DepositCard
-   Add chain selector (Sepolia → Base Sepolia)
-   Show deposit → bridge → stake flow

#### 2.3 Transaction Monitoring

-   Show multi-step progress
-   Track: Deposit → Bridge → Stake
-   Use event monitor for status updates

### Phase 3: Avail Nexus Automation

#### 3.1 Headless Browser Approach

-   Use Puppeteer in backend
-   Inject wallet provider
-   Initialize NexusSDK
-   Execute bridgeAndExecute()

#### 3.2 Simplified Manual Trigger (For Demo)

-   User deposits USDC on Sepolia
-   Backend detects event
-   Backend sends notification with bridge parameters
-   User completes bridge via Nexus Dashboard
-   Backend detects completion and executes stake

## Hardcoded Demo Flow

For the demo, we'll hardcode:

1. **Source Chain**: Ethereum Sepolia (Chain ID: 11155111)
2. **Destination Chain**: Base Sepolia (Chain ID: 84532)
3. **Token**: USDC
4. **Flow**: Deposit → Bridge → Aave Stake
5. **Protocols**: From Aave Sepolia (ID: 0) → To Aave Base Sepolia (ID: 1)

## API Endpoints

### New Endpoints for Chameleon

```typescript
// POST /chameleon/deposit
// Initiate cross-chain deposit
interface DepositRequest {
    amount: string; // USDC amount
    fromChain: number; // 11155111 (Sepolia)
    toChain: number; // 84532 (Base Sepolia)
    userAddress: string; // User's wallet
}

// GET /chameleon/positions/:userAddress
// Get user's positions across chains
interface Position {
    chainId: number;
    vaultAddress: string;
    balance: string;
    apy: number;
}

// GET /chameleon/bridge-status/:txHash
// Check bridge status
interface BridgeStatus {
    status: "pending" | "bridging" | "completed" | "failed";
    sourceTxHash: string;
    destinationTxHash?: string;
    estimatedTime?: number;
}
```

## Database Schema

### New Collection: ChameleonPositions

```typescript
{
  userAddress: string,           // User's wallet
  pkpEthAddress: string,         // PKP wallet (Vincent controlled)

  // Deposit info
  sourceChain: number,           // 11155111
  destinationChain: number,      // 84532
  amount: string,                // USDC amount

  // Transaction tracking
  depositTxHash: string,         // Sepolia deposit tx
  bridgeTxHash?: string,         // Avail Nexus bridge tx
  stakeTxHash?: string,          // Base Sepolia stake tx

  // Status
  status: 'deposited' | 'bridging' | 'staked' | 'failed',

  // Protocol info
  sourceProtocol: number,        // 0 (Aave Sepolia)
  destinationProtocol: number,   // 1 (Aave Base Sepolia)

  // APY tracking
  expectedAPY: number,
  currentAPY?: number,

  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  completedAt?: Date,
}
```

## Vincent Integration Points

### 1. PKP Wallet Management

-   Use Vincent's PKP delegation
-   PKP wallet will hold USDC temporarily during bridge
-   PKP executes final deposit to Aave

### 2. Transaction Signing

-   All transactions signed by Vincent's delegated PKP
-   Use Alchemy gas sponsorship for gasless UX

### 3. Event Monitoring

-   Backend monitors CrossChainRebalanceInitiated
-   Triggers automated bridge flow
-   Monitors bridge completion
-   Executes final stake

## Security Considerations

1. **Approval Management**

    - Vault approves Vincent (not unlimited)
    - Specific amount for each operation

2. **PKP Permissions**

    - PKP can only execute specific functions
    - Time-bound permissions
    - Rate limiting

3. **Bridge Safety**
    - Slippage protection
    - Gas ceiling checks
    - User-defined guardrails

## Testing Strategy

### Unit Tests

-   Vincent ability clients
-   Nexus bridge functions
-   Contract interactions

### Integration Tests

-   Full deposit → bridge → stake flow
-   Event monitoring
-   Error handling

### Demo Script

```bash
# 1. User deposits 10 USDC on Sepolia
curl -X POST http://localhost:3000/chameleon/deposit \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "amount": "10",
    "fromChain": 11155111,
    "toChain": 84532,
    "userAddress": "0x..."
  }'

# 2. Check bridge status
curl http://localhost:3000/chameleon/bridge-status/0x...

# 3. View positions
curl http://localhost:3000/chameleon/positions/0x...
```

## Timeline

-   **Day 1**: Backend integration (Vincent jobs)
-   **Day 2**: Frontend integration (UI updates)
-   **Day 3**: Avail Nexus automation
-   **Day 4**: Testing & refinement
-   **Day 5**: Demo preparation

## Success Criteria

✅ User can deposit USDC on Sepolia via UI
✅ Backend detects deposit and initiates bridge
✅ Avail Nexus successfully bridges to Base Sepolia
✅ Vincent executes deposit to Aave on Base Sepolia
✅ User sees position on dashboard
✅ Real-time status updates throughout flow

## Next Steps

1. Set up Vincent backend environment
2. Create Chameleon job handlers
3. Integrate Nexus SDK automation
4. Update frontend with Vincent auth
5. End-to-end testing
6. Demo preparation
