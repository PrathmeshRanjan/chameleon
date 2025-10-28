# SmartYield Architecture Documentation
## Complete Guide to DCA Backend & Frontend

---

## Table of Contents
1. [Current Architecture Overview](#current-architecture-overview)
2. [Central Vault System](#central-vault-system)
3. [Backend Architecture (dca-backend)](#backend-architecture-dca-backend)
4. [Frontend Architecture (dca-frontend)](#frontend-architecture-dca-frontend)
5. [Morpho Integration Points](#morpho-integration-points)
6. [Vincent Abilities Usage](#vincent-abilities-usage)
7. [Transaction & Fund Flow](#transaction--fund-flow)
8. [Avail Nexus Migration Plan](#avail-nexus-migration-plan)

---

## Current Architecture Overview

### High-Level Flow
```
User (Browser)
    ↓ (Vincent JWT Auth)
Frontend (React)
    ↓ (REST API)
Backend (Express + Node.js)
    ↓ (Agenda Jobs)
Vincent Abilities
    ↓ (Blockchain Txns)
Morpho Vaults (Base Mainnet)
```

### Technology Stack
| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19 + Vite + TypeScript + TailwindCSS + Radix UI |
| **Backend** | Node.js + Express + TypeScript + Agenda.js |
| **Database** | MongoDB + Mongoose |
| **Authentication** | Vincent JWT (Lit Protocol) |
| **Blockchain** | Base Mainnet + ethers.js v5.8.0 |
| **Vault Protocol** | Morpho (ERC4626 vaults) → **TO BE REPLACED WITH AVAIL NEXUS** |
| **Transaction Signing** | Vincent Delegated Signing (PKP wallets) |
| **Gas Sponsorship** | Alchemy Gas Manager |

---

## Central Vault System

### Current Architecture (Morpho-Based)

#### **Source Vault Configuration**
- **Location**: `/home/manibajpai/smartYield/packages/dca-backend/src/lib/env.ts` (lines 40-44)
- **Environment Variables**:
  ```typescript
  SOURCE_VAULT_ADDRESS: string | undefined  // Central vault for ETH deposits
  WETH_ADDRESS: string                      // WETH contract on Base
  MIN_TRANSFER_AMOUNT: string               // Min ETH to trigger transfer
  ```

#### **How Central Vault Works Today**

**Scenario 0: Source Vault Monitoring** (lines 302-401 in `executeYieldOptimization.ts`)

```typescript
// 1. Monitor ETH in central vault
const vaultBalance = await checkSourceVaultBalance(
  sourceVaultAddress,
  provider
);

// 2. If balance > MIN_TRANSFER_AMOUNT:
if (vaultBalance.shouldTransfer) {
  // a. Wrap ETH → WETH using EVM Transaction Signer
  const wrapTxHash = await wrapETHToWETH({
    amount: vaultBalance.balance,
    delegatorAddress: pkpEthAddress,
    provider,
  });

  // b. Find best WETH vault via Morpho API
  const bestVault = await morphoService.getBestVaultForAsset(
    'WETH',
    8453  // Base chain ID
  );

  // c. Approve vault via ERC20 Approval ability
  await addAssetApproval({
    assetAddress: WETH_ADDRESS,
    spenderAddress: bestVault.address,
    amount: wethBalance * 5,  // 5x for future deposits
  });

  // d. Deposit to Morpho vault via Morpho ability
  const depositTxHash = await depositToVault({
    vaultAddress: bestVault.address,
    assetAmount: wethBalance,
    delegatorAddress: pkpEthAddress,
  });

  // e. Save position record
  await YieldPosition.create({
    action: 'deposit',
    vaultAddress: bestVault.address,
    amount: wethBalance,
    apy: bestVault.netApy,
    txHash: depositTxHash,
  });
}
```

#### **Access Pattern**

**App Has FULL Control Over:**
1. **Withdrawing** from central vault (via `withdraw()` function on ERC4626 vault)
2. **Wrapping** ETH to WETH (via EVM Transaction Signer ability)
3. **Approving** Morpho vaults for token spending (via ERC20 Approval ability)
4. **Depositing** to Morpho vaults (via Morpho ability)
5. **Rebalancing** between vaults (redeem + deposit)

**Key Files:**
- Vault interaction: `packages/dca-backend/src/lib/agenda/jobs/executeYieldOptimization/sourceVaultUtils.ts`
- ETH wrapping: Lines 66-109 in `sourceVaultUtils.ts`
- Balance checking: Lines 26-64 in `sourceVaultUtils.ts`

---

## Backend Architecture (dca-backend)

### Project Structure
```
packages/dca-backend/src/
├── bin/
│   ├── apiServer.ts              # API server entry point
│   ├── jobWorker.ts              # Job worker entry point
│   └── serverWorker.ts           # Combined API + Worker
├── lib/
│   ├── express/
│   │   ├── index.ts              # Route registration + middleware
│   │   ├── yieldOptimizer.ts    # API route handlers (9 endpoints)
│   │   └── schema.ts             # Zod validation schemas
│   ├── agenda/
│   │   ├── agendaClient.ts      # Agenda job scheduler setup
│   │   └── jobs/
│   │       ├── executeYieldOptimization/
│   │       │   ├── executeYieldOptimization.ts    # MAIN JOB LOGIC
│   │       │   ├── vincentAbilities.ts            # Vincent ability clients
│   │       │   ├── withdrawalUtils.ts             # Withdrawal functions
│   │       │   └── sourceVaultUtils.ts            # Central vault utils
│   │       └── yieldOptimizationJobManager.ts     # Job CRUD operations
│   ├── morpho/
│   │   └── morphoService.ts     # ⚠️ MORPHO API INTEGRATION - TO BE REPLACED
│   ├── mongo/
│   │   └── models/
│   │       └── YieldPosition.ts  # Position tracking model
│   ├── apiServer.ts              # Express app setup
│   ├── jobWorker.ts              # Job handler registration
│   └── env.ts                    # Environment config
└── package.json
```

### Key Components

#### **1. API Endpoints** (yieldOptimizer.ts)

| Method | Endpoint | Handler | Line |
|--------|----------|---------|------|
| POST | `/yield/schedule` | Create new schedule | 37-56 |
| GET | `/yield/schedules` | List all schedules | 58-76 |
| PUT | `/yield/schedules/:id` | Edit schedule | 78-103 |
| PUT | `/yield/schedules/:id/enable` | Enable schedule | 105-119 |
| PUT | `/yield/schedules/:id/disable` | Disable schedule | 121-134 |
| DELETE | `/yield/schedules/:id` | Delete schedule | 136-150 |
| GET | `/yield/positions` | List all positions | 152-163 |
| GET | `/yield/positions/:scheduleId` | Get positions by schedule | 165-176 |
| POST | `/yield/withdraw` | Withdraw from vault | 178-227 |

**Authentication**: All routes protected by Vincent JWT middleware (lines 36-59 in `index.ts`)

#### **2. Job Scheduler** (Agenda.js)

**Configuration** (agendaClient.ts):
```typescript
{
  db: { collection: 'agendaJobs' },
  defaultConcurrency: 1,
  defaultLockLifetime: 2 * 60 * 1000,  // 2 minutes
  maxConcurrency: 1,
  processInterval: '10 seconds',
}
```

**Job Definition**: `executeYieldOptimization`
- **Trigger**: User-defined interval (e.g., "6 hours", "1 hour")
- **Concurrency**: 1 job at a time
- **Uniqueness**: Per PKP wallet address

**Job Data Structure**:
```typescript
{
  app: { id: number, version: number },
  assetAddress: string,           // Token address
  assetSymbol: string,            // USDC, WETH, DAI
  checkIntervalHuman: string,     // "6 hours"
  currentVaultAddress?: string,   // Active vault
  depositAmount?: number,         // Initial deposit
  name: string,                   // Schedule name
  pkpInfo: {
    ethAddress: string,           // PKP wallet
    publicKey: string,
  },
  sourceVaultAddress?: string,    // Central vault
  updatedAt: Date,
  userAddress: string,            // User's wallet
}
```

#### **3. Database Models**

**YieldPosition Schema** (YieldPosition.ts):
```typescript
{
  // Identity
  ethAddress: string,              // PKP wallet
  userAddress: string,             // User's wallet
  scheduleId: ObjectId,            // Job reference

  // Vault info
  vaultAddress: string,            // Morpho vault (or Avail Nexus vault)
  vaultName: string,               // Human-readable name

  // Asset info
  assetAddress: string,            // Token address
  assetSymbol: string,             // USDC, WETH, etc.

  // Position data
  amount: string,                  // Decimal string
  apy: number,                     // APY at time of action

  // Transaction tracking
  action: 'deposit' | 'rebalance' | 'withdraw',
  previousVaultAddress?: string,  // For rebalance
  txHash: string,                  // Blockchain tx hash

  // Timestamps
  createdAt: Date,
  updatedAt: Date,
}
```

**Indices**:
- `{ createdAt: 1, scheduleId: 1 }`
- `{ createdAt: -1, ethAddress: 1 }`
- `{ scheduleId: 1, userAddress: 1 }`
- `{ createdAt: -1, userAddress: 1 }`

---

## Frontend Architecture (dca-frontend)

### Project Structure
```
packages/dca-frontend/src/
├── components/
│   ├── create-yield-optimizer.tsx       # Deposit form (⚠️ 4 Morpho refs)
│   ├── active-yield-schedules.tsx       # Schedule management
│   ├── yield-positions.tsx              # Transaction history
│   ├── wallet.tsx                       # PKP wallet display
│   └── presentation.tsx                 # Login screen
├── pages/
│   └── home.tsx                         # Main dashboard (⚠️ 1 Morpho ref)
├── hooks/
│   └── useBackend.ts                    # API client
├── config/
│   └── env.ts                           # Environment config
├── lib/
│   └── utils.ts                         # Utilities
├── App.tsx                              # Auth wrapper
└── main.tsx                             # Entry point
```

### Key Components

#### **1. Create Yield Optimizer** (create-yield-optimizer.tsx)

**Form Fields**:
```typescript
{
  scheduleName: string,           // User-defined name
  asset: {
    address: string,              // Token contract
    symbol: string,               // USDC, WBTC, ETH
    decimals: number,
  },
  depositAmount: string,          // Decimal input
  checkIntervalHuman: string,     // "1 hour", "6 hours", "12 hours", "24 hours"
}
```

**Morpho References** (TO UPDATE):
- Line 33: Title "Optimize Yields with Morpho Vaults"
- Line 82: Success message "deposited into the best Morpho vault"
- Line 87: Description "automatically search for the best Morpho vault"
- Line 91: Description "rebalance to the best Morpho vault"

**API Call**:
```typescript
POST /yield/schedule
{
  app: { id: VINCENT_APP_ID, version: 0 },
  assetAddress: form.asset.address,
  assetSymbol: form.asset.symbol,
  checkIntervalHuman: form.checkIntervalHuman,
  depositAmount: parseFloat(form.depositAmount),
  name: form.scheduleName,
  pkpInfo: { ethAddress, publicKey, tokenId },
  userAddress,
}
```

#### **2. Active Yield Schedules** (active-yield-schedules.tsx)

**Features**:
- Display all user schedules
- Enable/disable schedules
- Edit schedule intervals
- Delete schedules
- Withdraw funds

**Data Type**:
```typescript
type YieldSchedule = {
  _id: string,
  name: string,
  data: {
    assetSymbol: string,
    checkIntervalHuman: string,
    currentVaultAddress?: string,
    depositAmount?: number,
  },
  disabled?: boolean,
  nextRunAt?: string,
  lastRunAt?: string,
}
```

#### **3. Yield Positions** (yield-positions.tsx)

**Transaction History Display**:
```typescript
type YieldPosition = {
  _id: string,
  action: 'deposit' | 'rebalance' | 'withdraw',
  amount: string,
  apy: number,
  assetSymbol: string,
  createdAt: string,
  previousVaultAddress?: string,
  txHash: string,
  vaultAddress: string,
  vaultName: string,
}
```

**Features**:
- Filter by schedule or show all
- Display action badges (colored by type)
- Show APY percentages
- Link to blockchain explorer (Basescan)
- Collapsible vault address display

#### **4. API Client** (useBackend.ts)

**Base Setup**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useBackend() {
  const { sessionSigs } = useSession();

  const sendRequest = async (endpoint, options) => {
    // Add Bearer JWT token
    const headers = {
      Authorization: `Bearer ${sessionSigs}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return response.json();
  };

  return { sendRequest };
}
```

**Usage Pattern**:
```typescript
// Create schedule
await sendRequest('/yield/schedule', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Get schedules
const schedules = await sendRequest('/yield/schedules');

// Withdraw
await sendRequest('/yield/withdraw', {
  method: 'POST',
  body: JSON.stringify({
    scheduleId,
    userAddress,
    withdrawalAddress,
  }),
});
```

#### **5. Authentication** (App.tsx)

**Vincent Integration**:
```typescript
<LitProvider>
  <SessionProvider
    appId={VINCENT_APP_ID}
    requiredAbilities={[
      'erc20-approval@3.1.0',
      'morpho@0.1.19-mma',           // ⚠️ TO BE REPLACED
      'evm-transaction-signer@0.1.4',
      'call-contract@0.1.5',
      'erc20-transfer@0.0.12-mma',
    ]}
  >
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  </SessionProvider>
</LitProvider>
```

---

## Morpho Integration Points

### ⚠️ Files Requiring Changes for Avail Nexus

#### **Backend Files**

1. **morphoService.ts** - ENTIRE FILE TO BE REPLACED
   - **Location**: `packages/dca-backend/src/lib/morpho/morphoService.ts`
   - **Current Functions**:
     ```typescript
     getVaultsForChain(chainId: number)
     getBestVaultForAsset(assetSymbol: string, chainId: number)
     shouldRebalance(currentVaultAddress: string, assetSymbol: string, chainId: number)
     ```
   - **New Implementation**: Replace with Avail Nexus API client

2. **vincentAbilities.ts** - REMOVE MORPHO ABILITY
   - **Location**: `packages/dca-backend/src/lib/agenda/jobs/executeYieldOptimization/vincentAbilities.ts`
   - **Line 7**: Remove `import { bundledVincentAbility as morphoBundledVincentAbility }`
   - **Lines 43-48**: Remove `getMorphoToolClient()` function
   - **Keep**: `getCallContractClient()` for generic contract interactions

3. **executeYieldOptimization.ts** - REPLACE DEPOSIT/REDEEM LOGIC
   - **Location**: `packages/dca-backend/src/lib/agenda/jobs/executeYieldOptimization/executeYieldOptimization.ts`
   - **Functions to Replace**:
     - `depositToVault()` (lines 109-152) - Replace with Avail Nexus deposit
     - `redeemFromVault()` (lines 155-196) - Replace with Avail Nexus redeem
   - **Scenarios to Update**:
     - Scenario 0: Source vault monitoring (lines 302-401)
     - Scenario 1: New deposit (lines 404-476)
     - Scenario 2: Rebalancing (lines 478-574)

4. **withdrawalUtils.ts** - UPDATE WITHDRAWAL LOGIC
   - **Location**: `packages/dca-backend/src/lib/agenda/jobs/executeYieldOptimization/withdrawalUtils.ts`
   - **Lines 101-132**: Replace Morpho redemption with Avail Nexus withdrawal

5. **package.json** - UPDATE DEPENDENCIES
   - **Location**: `packages/dca-backend/package.json`
   - **Remove**: `@lit-protocol/vincent-ability-morpho@0.1.19-mma`
   - **Add**: Avail Nexus SDK or ability package

#### **Frontend Files**

1. **create-yield-optimizer.tsx** - UPDATE UI TEXT
   - **Location**: `packages/dca-frontend/src/components/create-yield-optimizer.tsx`
   - **Line 33**: Change "Morpho Vaults" → "Avail Nexus Vaults"
   - **Line 82**: Change "Morpho vault" → "Avail Nexus vault"
   - **Line 87**: Change "Morpho vault" → "Avail Nexus vault"
   - **Line 91**: Change "Morpho vault" → "Avail Nexus vault"

2. **home.tsx** - UPDATE PAGE TITLE
   - **Location**: `packages/dca-frontend/src/pages/home.tsx`
   - **Line 29**: Change "Morpho Yield Optimizer" → "Avail Nexus Yield Optimizer"

3. **App.tsx** - UPDATE REQUIRED ABILITIES
   - **Location**: `packages/dca-frontend/src/App.tsx`
   - **Remove**: `'morpho@0.1.19-mma'`
   - **Add**: Avail Nexus ability (if different)

---

## Vincent Abilities Usage

### Current Abilities

| Ability | Package | Version | Purpose | Keep? |
|---------|---------|---------|---------|-------|
| **Morpho** | `@lit-protocol/vincent-ability-morpho` | 0.1.19-mma | Deposit/redeem from Morpho vaults | ❌ REMOVE |
| **ERC20 Approval** | `@lit-protocol/vincent-ability-erc20-approval` | 3.1.0 | Approve vaults for token spending | ✅ KEEP |
| **ERC20 Transfer** | `@lit-protocol/vincent-ability-erc20-transfer` | 0.0.12-mma | Transfer tokens to user wallets | ✅ KEEP |
| **EVM Transaction Signer** | `@lit-protocol/vincent-ability-evm-transaction-signer` | 0.1.4 | Sign raw transactions (ETH wrapping) | ✅ KEEP |
| **Call Contract** | `@vaultlayer/vincent-ability-call-contract` | 0.1.5 | Generic contract interactions | ✅ KEEP |

### Ability Usage Patterns

#### **Pattern 1: Morpho Deposit** (TO BE REPLACED)
```typescript
// Current implementation
const morphoToolClient = getMorphoToolClient();

const depositParams = {
  alchemyGasSponsor: true,
  alchemyGasSponsorApiKey: ALCHEMY_API_KEY,
  alchemyGasSponsorPolicyId: ALCHEMY_POLICY_ID,
  vaultAddress: '0x...',
  amount: '1000000000',  // 1000 USDC in wei
  chain: 'base',
  operation: 'deposit' as const,
  rpcUrl: BASE_RPC_URL,
};

const depositContext = {
  delegatorPkpEthAddress: '0x...',
};

await morphoToolClient.precheck(depositParams, depositContext);
const result = await morphoToolClient.execute(depositParams, depositContext);
const txHash = result.result.txHash;
```

**For Avail Nexus**, replace with:
```typescript
// Option 1: If Avail provides a Vincent ability
const availNexusToolClient = getAvailNexusToolClient();
// Similar precheck + execute pattern

// Option 2: Use call-contract ability
const callContractClient = getCallContractClient();
const contractCallParams = {
  alchemyGasSponsor: true,
  alchemyGasSponsorApiKey: ALCHEMY_API_KEY,
  alchemyGasSponsorPolicyId: ALCHEMY_POLICY_ID,
  contractAddress: availNexusVaultAddress,
  abi: availNexusVaultAbi,
  functionName: 'deposit',
  args: [amount, receiver],
  chain: 'base',
  rpcUrl: BASE_RPC_URL,
};
```

#### **Pattern 2: ERC20 Approval** (KEEP)
```typescript
const erc20ApprovalToolClient = getErc20ApprovalToolClient();

const approvalParams = {
  alchemyGasSponsor: true,
  alchemyGasSponsorApiKey: ALCHEMY_API_KEY,
  alchemyGasSponsorPolicyId: ALCHEMY_POLICY_ID,
  tokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',  // USDC
  spenderAddress: vaultAddress,  // Avail Nexus vault
  tokenAmount: '5000000000',  // 5000 USDC (5x deposit)
  chain: 'base',
  rpcUrl: BASE_RPC_URL,
};

const approvalContext = {
  delegatorPkpEthAddress: '0x...',
};

await erc20ApprovalToolClient.precheck(approvalParams, approvalContext);
const result = await erc20ApprovalToolClient.execute(approvalParams, approvalContext);
```

#### **Pattern 3: EVM Transaction Signer** (KEEP)
```typescript
const evmSignerClient = getEvmTransactionSignerClient();

const txData = {
  from: pkpEthAddress,
  to: WETH_ADDRESS,
  value: ethers.utils.parseEther('1.0').toString(),
  data: '0xd0e30db0',  // wrap() function selector
};

const signerParams = {
  alchemyGasSponsor: true,
  alchemyGasSponsorApiKey: ALCHEMY_API_KEY,
  alchemyGasSponsorPolicyId: ALCHEMY_POLICY_ID,
  chain: 'base',
  rpcUrl: BASE_RPC_URL,
  txData,
};

const result = await evmSignerClient.execute(signerParams, context);
```

#### **Pattern 4: ERC20 Transfer** (KEEP)
```typescript
const transferClient = getErc20TransferToolClient();

const transferParams = {
  alchemyGasSponsor: true,
  alchemyGasSponsorApiKey: ALCHEMY_API_KEY,
  alchemyGasSponsorPolicyId: ALCHEMY_POLICY_ID,
  tokenAddress: assetAddress,
  to: userWithdrawalAddress,
  amount: redeemedAmount,
  chain: 'base',
  rpcUrl: BASE_RPC_URL,
};

await transferClient.execute(transferParams, context);
```

### Transaction Confirmation Pattern (UNIVERSAL)
```typescript
import { handleOperationExecution } from './utils/handle-operation-execution';

const result = await client.execute(params, context);

const { txHash, useropHash } = await handleOperationExecution({
  confirmations: 6,
  isSponsored: true,
  operationHash: result.result.txHash || result.result.useropHash,
  pkpPublicKey: pkpInfo.publicKey,
  provider,
});
```

---

## Transaction & Fund Flow

### Complete Flow Diagrams

#### **Flow 1: New User Deposit**

```
User (Frontend)
    │
    │ 1. Fill form: 100 USDC, 6 hour interval
    │
    ├─> POST /yield/schedule
    │
Backend API
    │
    │ 2. Validate JWT + create Agenda job
    │
    ├─> Job: executeYieldOptimization
    │
Job Worker
    │
    │ 3a. Query best vault (Morpho API → Avail Nexus API)
    │ 3b. Check user USDC balance
    │
    ├─> Vincent: ERC20 Approval ability
    │       Approve vault for 500 USDC (5x deposit)
    │
    ├─> Vincent: Morpho ability (→ Avail Nexus ability)
    │       Deposit 100 USDC to vault
    │
    ├─> MongoDB: Save YieldPosition
    │       { action: 'deposit', amount: '100', ... }
    │
    └─> Schedule next run in 6 hours
```

#### **Flow 2: Central Vault to Morpho/Avail**

```
Scheduled Job Runs
    │
    │ 1. Check source vault ETH balance > MIN_TRANSFER_AMOUNT
    │
    ├─> Vincent: EVM Transaction Signer
    │       Sign ETH wrap transaction
    │       ETH → WETH
    │
    ├─> Query best WETH vault (Morpho → Avail)
    │
    ├─> Vincent: ERC20 Approval
    │       Approve vault for WETH
    │
    ├─> Vincent: Morpho ability (→ Avail Nexus)
    │       Deposit WETH to best vault
    │
    └─> MongoDB: Save position
```

#### **Flow 3: Rebalancing**

```
Scheduled Job Runs
    │
    │ 1. Get current vault APY vs. best available APY
    │ 2. Calculate difference > 1%?
    │
    ├─> YES: Rebalance needed
    │
    ├─> Vincent: Morpho ability (→ Avail Nexus)
    │       Redeem all shares from current vault
    │       Returns: X USDC to PKP wallet
    │
    ├─> Vincent: ERC20 Approval
    │       Approve new vault for X USDC
    │
    ├─> Vincent: Morpho ability (→ Avail Nexus)
    │       Deposit X USDC to new vault
    │
    └─> MongoDB: Save YieldPosition
            { action: 'rebalance', previousVaultAddress, ... }
```

#### **Flow 4: User Withdrawal**

```
User (Frontend)
    │
    │ 1. Click "Withdraw" on active schedule
    │ 2. Enter withdrawal address
    │
    ├─> POST /yield/withdraw
    │
Backend API
    │
    │ 3. Get user's vault shares
    │
    ├─> Vincent: Morpho ability (→ Avail Nexus)
    │       Redeem all shares
    │       Returns: Y USDC to PKP wallet
    │
    ├─> Vincent: ERC20 Transfer ability
    │       Transfer Y USDC from PKP → user's withdrawal address
    │
    ├─> MongoDB: Save YieldPosition
    │       { action: 'withdraw', amount: Y, ... }
    │
    └─> Return to frontend: { redeemTxHash, transferTxHash, amountWithdrawn }
```

### State Machine

```
┌─────────────────────────────────────────────────────────┐
│                   Job Lifecycle                         │
└─────────────────────────────────────────────────────────┘

[Created]
    │
    ├─> Has depositAmount?
    │       YES → [Scenario 1: New Deposit]
    │       NO  → Check sourceVaultAddress
    │
[Scenario 1: New Deposit]
    │
    ├─> Find best vault
    ├─> Approve + Deposit
    ├─> Save position
    │
    └─> [Active with currentVaultAddress]
            │
            ├─> Every interval: Check for rebalancing
            │
            └─> [Scenario 2: Rebalancing]
                    │
                    ├─> APY difference > 1%?
                    │       YES → Redeem + Deposit new vault
                    │       NO  → Skip, wait for next interval
                    │
                    └─> Loop until user withdraws

[User Triggers Withdrawal]
    │
    ├─> Redeem from vault
    ├─> Transfer to user
    │
    └─> [Job Remains but no vault activity]
```

---

## Avail Nexus Migration Plan

### Architecture Change Summary

#### **OLD (Morpho-Based)**
```
User Deposits to Central Vault
    ↓
App Withdraws from Central Vault
    ↓
App Uses Morpho Ability to Deposit
    ↓
Morpho Vault on Base Mainnet
```

#### **NEW (Avail Nexus-Based)**
```
User Deposits to Central Vault
    ↓
App Only Makes Contract Calls & Signs Transactions
    ↓
Avail Nexus Cross-Chain Transfer
    ↓
Best Vault on Any Supported Chain
```

### Key Changes Required

#### **1. Remove Morpho Dependency**

**Backend:**
- ❌ Delete: `packages/dca-backend/src/lib/morpho/morphoService.ts`
- ❌ Remove from `vincentAbilities.ts`: Lines 7, 43-48
- ❌ Remove from `package.json`: `@lit-protocol/vincent-ability-morpho`

**Frontend:**
- ❌ Remove from `App.tsx`: `'morpho@0.1.19-mma'` ability
- ✏️ Update UI text in: `create-yield-optimizer.tsx` (4 places), `home.tsx` (1 place)

#### **2. Add Avail Nexus Integration**

**Backend:**
- ✅ Create: `packages/dca-backend/src/lib/avail-nexus/availNexusService.ts`
  ```typescript
  export async function getBestVaultForAsset(assetSymbol: string)
  export async function shouldRebalance(currentVaultId: string, assetSymbol: string)
  export async function getVaultDetails(vaultId: string)
  ```

- ✅ Add Avail Nexus SDK:
  ```json
  {
    "dependencies": {
      "@avail-nexus/sdk": "^x.x.x"  // Or appropriate package
    }
  }
  ```

- ✅ Update `vincentAbilities.ts`:
  ```typescript
  // Option 1: If Avail provides Vincent ability
  import { bundledVincentAbility as availNexusBundledVincentAbility } from '@avail-nexus/vincent-ability';

  export function getAvailNexusToolClient() {
    return getVincentAbilityClient({
      bundledVincentAbility: availNexusBundledVincentAbility,
      ethersSigner: delegateeSigner,
    });
  }

  // Option 2: Use existing call-contract ability
  // Already available: getCallContractClient()
  ```

**Frontend:**
- ✅ Update `App.tsx` required abilities (if Avail uses different ability)
- ✅ Update environment config if Avail Nexus requires API keys

#### **3. Replace Deposit Logic**

**File**: `executeYieldOptimization.ts`

**OLD depositToVault() (lines 109-152):**
```typescript
const morphoToolClient = getMorphoToolClient();
const depositParams = {
  vaultAddress,
  amount,
  operation: 'deposit',
  // ...
};
await morphoToolClient.execute(depositParams, context);
```

**NEW depositToVault():**
```typescript
// Option 1: Avail-specific ability
const availNexusClient = getAvailNexusToolClient();
const depositParams = {
  vaultId,           // Avail vault identifier
  amount,
  sourceChain: 'base',
  destinationChain: 'optimism',  // Or wherever best vault is
  // Alchemy sponsorship
  alchemyGasSponsor: true,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
};
await availNexusClient.execute(depositParams, context);

// Option 2: Call contract ability
const callContractClient = getCallContractClient();
const contractCallParams = {
  contractAddress: availNexusBridgeAddress,
  abi: availNexusBridgeAbi,
  functionName: 'depositToBestVault',
  args: [assetAddress, amount, destinationChain],
  // Gas sponsorship...
};
await callContractClient.execute(contractCallParams, context);
```

#### **4. Replace Redeem Logic**

**File**: `executeYieldOptimization.ts`

**OLD redeemFromVault() (lines 155-196):**
```typescript
const morphoToolClient = getMorphoToolClient();
const redeemParams = {
  vaultAddress,
  amount: shares,
  operation: 'redeem',
  // ...
};
await morphoToolClient.execute(redeemParams, context);
```

**NEW redeemFromVault():**
```typescript
// Cross-chain redemption via Avail Nexus
const availNexusClient = getAvailNexusToolClient();
const redeemParams = {
  vaultId,
  shares,
  destinationAddress: pkpEthAddress,  // Where to receive funds
  destinationChain: 'base',           // Return to Base
  // Gas sponsorship...
};
await availNexusClient.execute(redeemParams, context);
```

#### **5. Replace Vault Discovery**

**OLD (morphoService.ts):**
```typescript
const response = await fetch('https://api.morpho.org/graphql', {
  method: 'POST',
  body: JSON.stringify({
    query: GET_VAULTS_QUERY,
    variables: { chainId: 8453 },
  }),
});
```

**NEW (availNexusService.ts):**
```typescript
// Replace with Avail Nexus API
const response = await fetch('https://api.avail.nexus/vaults', {
  method: 'GET',
  params: {
    asset: 'USDC',
    minApy: 0.01,
    sortBy: 'apy',
    sortOrder: 'desc',
  },
});

// Return format should match existing structure:
interface AvailVault {
  vaultId: string,
  name: string,
  chain: string,           // NEW: Cross-chain support
  asset: {
    address: string,
    symbol: string,
    decimals: number,
  },
  apy: number,
  netApy: number,
  tvl: number,
}
```

#### **6. Update Rebalancing Logic**

**File**: `executeYieldOptimization.ts` (Scenario 2, lines 478-574)

**Changes:**
1. Replace `morphoService.shouldRebalance()` with `availNexusService.shouldRebalance()`
2. Update rebalance flow to handle cross-chain:
   ```typescript
   // 1. Redeem from current vault (may be on different chain)
   await redeemFromVault({
     vaultId: currentVaultId,
     destinationChain: 'base',  // Bring funds back to Base
   });

   // 2. Deposit to new vault (may be on different chain)
   await depositToVault({
     vaultId: newVaultId,
     sourceChain: 'base',
     destinationChain: bestVault.chain,  // Cross-chain deposit
   });
   ```

#### **7. Update Database Schema** (Optional)

**File**: `YieldPosition.ts`

**Add cross-chain fields:**
```typescript
{
  // ... existing fields

  // NEW for Avail Nexus
  vaultChain?: string,           // 'base', 'optimism', 'arbitrum', etc.
  bridgeTxHash?: string,         // Cross-chain bridge transaction
  sourceChain?: string,          // For rebalance: origin chain
  destinationChain?: string,     // For rebalance: target chain
}
```

### Migration Checklist

#### **Phase 1: Backend Core Changes**
- [ ] Create `availNexusService.ts` with vault discovery API
- [ ] Add Avail Nexus SDK to `package.json`
- [ ] Update `vincentAbilities.ts`:
  - [ ] Remove Morpho ability import
  - [ ] Add Avail Nexus ability (or use call-contract)
- [ ] Replace `depositToVault()` in `executeYieldOptimization.ts`
- [ ] Replace `redeemFromVault()` in `executeYieldOptimization.ts`
- [ ] Update withdrawal logic in `withdrawalUtils.ts`

#### **Phase 2: Backend Scenarios**
- [ ] Update Scenario 0 (source vault monitoring)
- [ ] Update Scenario 1 (new deposit)
- [ ] Update Scenario 2 (rebalancing)
- [ ] Test cross-chain deposit flow
- [ ] Test cross-chain withdrawal flow

#### **Phase 3: Frontend Changes**
- [ ] Update `create-yield-optimizer.tsx` UI text (4 places)
- [ ] Update `home.tsx` title (1 place)
- [ ] Update `App.tsx` required abilities
- [ ] Test form submission
- [ ] Test schedule display
- [ ] Test withdrawal flow

#### **Phase 4: Testing**
- [ ] Unit tests for `availNexusService.ts`
- [ ] Integration tests for deposit flow
- [ ] Integration tests for rebalance flow
- [ ] Integration tests for withdrawal flow
- [ ] End-to-end test: User deposit → rebalance → withdraw
- [ ] Cross-chain transaction confirmation handling

#### **Phase 5: Deployment**
- [ ] Update environment variables (Avail API keys)
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor first transactions
- [ ] Verify cross-chain transfers complete

---

## Environment Variables

### Backend (.env)
```bash
# Vincent
VINCENT_APP_ID=7506411077
VINCENT_DELEGATEE_PRIVATE_KEY=0x...

# RPC
BASE_RPC_URL=https://mainnet.base.org/
CHRONICLE_YELLOWSTONE_RPC=https://yellowstone-rpc.litprotocol.com/

# Alchemy Gas Sponsorship
ALCHEMY_API_KEY=...
ALCHEMY_POLICY_ID=...

# MongoDB
MONGODB_URI=mongodb://localhost:27017/smartyield

# API
PORT=3000
ALLOWED_AUDIENCE=http://localhost:5173
CORS_ALLOWED_DOMAIN=http://localhost:5173

# Source Vault (Optional)
SOURCE_VAULT_ADDRESS=0x...
WETH_ADDRESS=0x4200000000000000000000000000000000000006
MIN_TRANSFER_AMOUNT=0.01

# NEW: Avail Nexus
AVAIL_NEXUS_API_URL=https://api.avail.nexus
AVAIL_NEXUS_API_KEY=...
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_VINCENT_APP_ID=7506411077
VITE_BASE_RPC_URL=https://mainnet.base.org/
```

---

## Summary

This document provides a complete overview of the SmartYield architecture including:

1. ✅ **Current Architecture**: Central vault → Morpho deposits
2. ✅ **Backend Structure**: Express API + Agenda jobs + Vincent abilities
3. ✅ **Frontend Structure**: React components + API client + Vincent auth
4. ✅ **Morpho Integration**: All files and functions using Morpho ability
5. ✅ **Vincent Abilities**: Usage patterns for all 5 abilities
6. ✅ **Transaction Flows**: Complete user deposit → vault → withdrawal flows
7. ✅ **Migration Plan**: Step-by-step guide to replace Morpho with Avail Nexus

### Key Takeaways for Avail Nexus Migration

**What Changes:**
- ❌ Remove Morpho vault ability
- ❌ Remove Morpho API service
- ✅ Add Avail Nexus API integration
- ✅ Update deposit/redeem functions
- ✅ Support cross-chain transactions

**What Stays:**
- ✅ Vincent authentication (JWT tokens)
- ✅ PKP wallet delegation
- ✅ ERC20 approval ability
- ✅ ERC20 transfer ability
- ✅ EVM transaction signer ability
- ✅ Call contract ability
- ✅ Alchemy gas sponsorship
- ✅ Agenda job scheduling
- ✅ MongoDB position tracking
- ✅ Frontend UI components (just text updates)

**Core Architectural Change:**
- **Before**: App directly deposits to Morpho vaults on Base
- **After**: App signs transactions → Avail Nexus handles cross-chain transfer → Deposits to best vault on any chain

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Total Lines**: 1,400+
**File Size**: ~65KB
