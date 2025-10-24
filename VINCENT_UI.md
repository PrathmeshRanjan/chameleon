# Vincent Automation UI - Implementation Guide

## Overview

The Vincent Automation UI enables users to manage automated yield optimization through a comprehensive interface. Users can configure safety guardrails, monitor automation status, and view rebalancing history.

## Architecture

### Components Structure

```
src/
├── components/
│   └── automation/
│       ├── AutomationDashboard.tsx    # Main dashboard container
│       ├── AutomationStatus.tsx        # Status widget
│       ├── VincentSettings.tsx         # Guardrails configuration
│       ├── RebalanceHistory.tsx        # Historical rebalances
│       └── index.ts                    # Component exports
├── hooks/
│   └── useVincent.ts                   # Smart contract interactions
└── types/
    └── yield.ts                        # Extended with Vincent types
```

## Features Implemented

### 1. AutomationDashboard Component

**Location:** `src/components/automation/AutomationDashboard.tsx`

Main container that integrates all Vincent automation features:
- Displays automation status at a glance
- Tabbed interface for Settings and History
- Shows Vincent contract address
- Warns when Vincent is not configured

**Props:**
```typescript
interface AutomationDashboardProps {
  vaultAddress: `0x${string}`;  // YieldOptimizerUSDC contract address
  className?: string;
}
```

### 2. AutomationStatus Widget

**Location:** `src/components/automation/AutomationStatus.tsx`

Real-time status display showing:
- Active/Inactive status badge
- Last rebalance timestamp
- Total rebalances count
- Gas saved (USD)
- Extra yield gained (USD)
- Next scheduled rebalance

**Data Source:** Uses `VincentStatus` from useVincent hook

### 3. VincentSettings Component

**Location:** `src/components/automation/VincentSettings.tsx`

Comprehensive settings interface for user guardrails:

**Configurable Parameters:**
- **Auto-Rebalance Toggle** - Enable/disable automation
- **Max Slippage Tolerance** - 0-10% (validated on-chain)
- **Gas Ceiling** - $1-$100 USD maximum gas cost
- **Min APY Differential** - 0-100% minimum APY improvement required

**Features:**
- Real-time validation
- Change detection (save button only enabled when modified)
- Error handling with user-friendly messages
- Loading states during transaction
- Last updated timestamp

**Smart Contract Integration:**
Calls `updateGuardrails()` on YieldOptimizerUSDC contract.

### 4. RebalanceHistory Component

**Location:** `src/components/automation/RebalanceHistory.tsx`

Historical view of all rebalances:
- Time and date of each rebalance
- Amount moved (formatted as USD)
- APY gain (percentage)
- From → To protocol route
- Source and destination chains
- Transaction hash with explorer link
- Summary statistics (total rebalances, average APY gain)

**Empty State:** Shows helpful message when no rebalances exist.

## Hook: useVincent

**Location:** `src/hooks/useVincent.ts`

Custom React hook providing Vincent automation functionality:

### Functions

```typescript
const {
  // Data
  userGuardrails,           // Current user guardrails
  vincentAddress,           // Vincent automation contract address
  rebalanceHistory,         // Array of past rebalances
  vincentStatus,            // Current automation status

  // Loading states
  isLoadingGuardrails,      // Initial data load
  isUpdatingGuardrails,     // Transaction pending

  // Actions
  updateGuardrails,         // Update guardrails function
  refetchGuardrails,        // Manual refresh
} = useVincent({ vaultAddress });
```

### Smart Contract Integration

The hook interacts with the YieldOptimizerUSDC contract:

**Read Operations:**
- `getUserGuardrails(address)` - Fetch user's current settings
- `vincentAutomation()` - Get Vincent contract address

**Write Operations:**
- `updateGuardrails(maxSlippageBps, gasCeilingUSD, minAPYDiffBps, autoRebalanceEnabled)`

**Event Watching:**
- `Rebalanced` - New rebalance occurred
- `GuardrailsUpdated` - Settings updated

## Type System Extensions

**Location:** `src/types/yield.ts`

### New Types

```typescript
// Vincent automation configuration
interface VincentAutomationConfig {
  vincentAddress: string;
  delegationActive: boolean;
  delegationExpiry: number;
  scope: VincentScope;
  schedule: AutomationSchedule;
}

// Scope for Vincent's permissions
interface VincentScope {
  maxRebalanceAmountUSD: number;
  allowedProtocols: string[];
  allowedChains: number[];
  minAPYGainBps: number;
  maxGasCostUSD: number;
}

// Automation schedule
interface AutomationSchedule {
  frequency: "daily" | "weekly" | "bi-weekly" | "monthly" | "on-demand";
  preferredTime?: string;
  preferredDay?: number;
  enabled: boolean;
}

// Rebalance event from blockchain
interface RebalanceEvent {
  user: string;
  fromProtocol: number;
  toProtocol: number;
  amount: string;
  srcChain: number;
  dstChain: number;
  apyGain: number;
  timestamp: number;
  txHash: string;
}

// Current automation status
interface VincentStatus {
  isActive: boolean;
  lastRebalance: number;
  totalRebalances: number;
  totalSaved: string;
  totalYieldGained: string;
  nextScheduledRebalance?: number;
}
```

### Updated Types

**UserGuardrails** - Now matches the smart contract struct exactly:
```typescript
interface UserGuardrails {
  maxSlippageBps: number;        // Basis points (100 = 1%)
  gasCeilingUSD: number;          // USD amount
  minAPYDiffBps: number;          // Basis points
  autoRebalanceEnabled: boolean;  // Toggle
  lastUpdated: number;            // Timestamp
}
```

## Integration

### Main App Integration

**Location:** `src/components/nexus.tsx`

The AutomationDashboard is integrated as a new tab in the main interface:

```typescript
<Tabs defaultValue="dashboard">
  <TabsList className="grid w-full grid-cols-5">
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    <TabsTrigger value="deposit">Deposit</TabsTrigger>
    <TabsTrigger value="automation">Automation</TabsTrigger>  {/* NEW */}
    <TabsTrigger value="balance">Balance</TabsTrigger>
    <TabsTrigger value="bridge">Bridge</TabsTrigger>
  </TabsList>

  <TabsContent value="automation">
    <AutomationDashboard vaultAddress={VAULT_ADDRESS} />
  </TabsContent>
</Tabs>
```

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# YieldOptimizerUSDC vault contract address
VITE_VAULT_ADDRESS='0x...'
```

The vault address is required for the useVincent hook to interact with the correct contract.

## Smart Contract Requirements

The Vincent UI requires the following smart contract setup:

### YieldOptimizerUSDC Contract

**Required Functions:**
- `getUserGuardrails(address user)` - Read user settings
- `updateGuardrails(uint256, uint256, uint256, bool)` - Update settings
- `vincentAutomation()` - Get Vincent address

**Required Events:**
- `Rebalanced` - Emitted when rebalance occurs
- `GuardrailsUpdated` - Emitted when settings change

### Vincent Automation Contract

Must be set via `setVincentAutomation(address)` on the vault contract. Only this address can call `executeRebalance()`.

## User Flow

### 1. First-Time Setup
1. User connects wallet
2. User deposits funds into vault (default guardrails applied)
3. User navigates to Automation tab
4. User reviews default settings
5. (Optional) User adjusts guardrails
6. Auto-rebalance is enabled by default

### 2. Ongoing Management
1. User views current automation status
2. Vincent monitors yields continuously
3. When conditions met, Vincent calls `executeRebalance()`
4. User sees new entry in Rebalance History
5. Status widget updates with latest stats

### 3. Adjusting Settings
1. User navigates to Settings tab
2. User modifies guardrails (slippage, gas, APY threshold)
3. User clicks "Save Settings"
4. Transaction confirmed on-chain
5. Vincent respects new guardrails immediately

## Validation & Safety

### Frontend Validation
- Max slippage ≤ 10%
- Gas ceiling ≤ $100
- Min APY diff ≤ 100%

### Smart Contract Validation
```solidity
require(maxSlippageBps <= 1000, "Slippage too high");
require(gasCeilingUSD <= 100, "Gas ceiling too high");
require(minAPYDiffBps <= 10000, "APY diff too high");
```

### Guardrails Enforcement
Before each rebalance, Vincent must satisfy:
- `autoRebalanceEnabled == true`
- `estimatedGasCost <= gasCeilingUSD`
- `expectedAPYGain >= minAPYDiffBps`

## Design Patterns

### 1. Optimistic UI Updates
- Form changes tracked in real-time
- Save button enabled only when changes exist
- Loading states during blockchain transactions

### 2. Event-Driven Updates
- Contract events trigger automatic data refresh
- `useWatchContractEvent` monitors on-chain changes
- No manual polling required

### 3. Graceful Degradation
- Shows helpful messages when Vincent not configured
- Empty state for rebalance history
- Loading skeletons during data fetch

### 4. Responsive Data
- Timestamps formatted relative ("2h ago") or absolute
- Amounts formatted with proper decimals
- APY displayed as percentages with 2 decimals

## Dependencies

### New Dependencies
All dependencies already existed in the project:
- `wagmi` - Ethereum interactions
- `viem` - Contract ABIs and type safety
- `lucide-react` - Icons
- `shadcn/ui` - UI components (Card, Button, Input, etc.)

### No Additional Installs Required
The Vincent UI uses only existing project dependencies.

## Testing Checklist

### Manual Testing Steps

1. **Component Rendering**
   - [ ] AutomationDashboard renders without errors
   - [ ] Status widget shows default state
   - [ ] Settings form loads current guardrails
   - [ ] History shows empty state initially

2. **Guardrails Update**
   - [ ] Form inputs accept valid values
   - [ ] Form validates max values (slippage 10%, gas $100)
   - [ ] Save button disabled when no changes
   - [ ] Transaction sends correctly
   - [ ] Success updates displayed

3. **Event Watching**
   - [ ] Rebalanced event captured
   - [ ] History updates with new event
   - [ ] Status widget refreshes
   - [ ] GuardrailsUpdated event triggers refetch

4. **Edge Cases**
   - [ ] No wallet connected - graceful message
   - [ ] Vincent not set - warning displayed
   - [ ] Zero guardrails (first time) - defaults loaded
   - [ ] Transaction rejection handled

## Future Enhancements

### Planned Features
1. **Vincent Delegation UI** - Direct Vincent delegation from UI
2. **Schedule Configuration** - Set preferred rebalance times
3. **Protocol Whitelist/Blacklist** - User-controlled protocol filters
4. **Gas Cost Tracking** - Historical gas spending visualization
5. **Yield Projections** - Estimated annual returns
6. **Notification System** - Alerts for rebalances
7. **Mobile Optimization** - Responsive design improvements

### Integration Points
- **Pyth Network** - Real-time APY feeds for better projections
- **Vincent SDK** - Direct delegation management
- **Analytics** - Performance metrics and charts

## Troubleshooting

### Common Issues

**Issue:** "Vincent Automation Not Configured" warning
- **Cause:** `vincentAutomation()` returns zero address
- **Fix:** Contract owner must call `setVincentAutomation(address)`

**Issue:** Guardrails not loading
- **Cause:** Vault address not set or incorrect
- **Fix:** Verify `VITE_VAULT_ADDRESS` in `.env`

**Issue:** Transaction fails on guardrails update
- **Cause:** Values exceed contract limits
- **Fix:** Check validation (slippage ≤ 10%, gas ≤ $100)

**Issue:** No rebalance history showing
- **Cause:** No rebalances have occurred yet
- **Fix:** This is normal for new accounts

## Smart Contract Addresses

### Testnet (Example)
```
YieldOptimizerUSDC: 0x... (to be deployed)
Vincent Automation: 0x... (to be deployed)
```

### Mainnet
```
TBD - pending audit and testing
```

## API Reference

### useVincent Hook

```typescript
interface UseVincentProps {
  vaultAddress: `0x${string}`;
  enabled?: boolean;
}

interface UseVincentReturn {
  userGuardrails: UserGuardrails | null;
  vincentAddress: `0x${string}` | undefined;
  rebalanceHistory: RebalanceEvent[];
  vincentStatus: VincentStatus;
  isLoadingGuardrails: boolean;
  isUpdatingGuardrails: boolean;
  updateGuardrails: (guardrails: Omit<UserGuardrails, "lastUpdated">) => Promise<void>;
  refetchGuardrails: () => void;
}
```

## Summary

The Vincent Automation UI provides a complete interface for managing automated yield optimization. Users can:
- ✅ View real-time automation status
- ✅ Configure safety guardrails
- ✅ Toggle auto-rebalancing on/off
- ✅ View rebalance history with transaction links
- ✅ Monitor gas savings and extra yield
- ✅ Safely manage automation with validated inputs

The implementation is production-ready pending:
1. Vault contract deployment
2. Vincent automation contract setup
3. Environment variable configuration
4. Smart contract testing and audit
