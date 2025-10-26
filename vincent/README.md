# Vincent AI Integration for YieldPro

Automated multi-chain yield optimization using Vincent AI to monitor DeFi protocols and execute intelligent rebalancing.

## Overview

Vincent AI continuously monitors yield opportunities across multiple chains (Ethereum, Base, Arbitrum, Optimism) and automatically rebalances user funds to the highest-yielding protocols while respecting user-defined guardrails.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vincent AI                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ APY Monitor  │  │ Opportunity  │  │  Rebalance   │          │
│  │   (30min)    │─▶│   Finder     │─▶│   Engine     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  VincentAutomation.sol  │
              │   (Smart Contract)      │
              └─────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │Base Vault │   │Arb Vault  │   │ Op Vault  │
    └───────────┘   └───────────┘   └───────────┘
```

## Components

### 1. Smart Contracts

#### VincentAutomation.sol
Main automation contract that:
- Manages vault registry across chains
- Enforces user guardrails
- Executes same-chain and cross-chain rebalancing
- Tracks performance metrics
- Implements cooldown periods

**Key Functions:**
- `executeSameChainRebalance()` - Rebalance within same chain
- `executeCrossChainRebalance()` - Rebalance across chains via Nexus
- `recordAPY()` - Record on-chain APY data
- `canRebalance()` - Check if rebalancing is allowed

### 2. Backend Services

#### apy-monitor.ts
Monitors DeFi protocol APYs across all chains.

**Features:**
- Fetches APYs from Aave, Compound, Morpho
- Checks protocol health
- Calculates TVL
- Runs every 30 minutes

**Functions:**
- `monitorAllAPYs()` - Scan all protocols
- `findBestOpportunities()` - Find profitable moves
- `getUserPositions()` - Get user balances

#### rebalance-engine.ts
Executes automated rebalancing decisions.

**Features:**
- Validates user guardrails
- Estimates gas costs
- Calculates profitability
- Executes on-chain transactions
- Runs every 6 hours

**Functions:**
- `rebalanceUser()` - Rebalance single user
- `rebalanceAllUsers()` - Batch rebalance
- `validateRebalanceDecision()` - Check constraints

### 3. Vincent Abilities

Pre-configured abilities for Vincent AI:

1. **monitor-yield-apy** - Scheduled APY monitoring
2. **find-yield-opportunities** - On-demand opportunity finder
3. **execute-yield-rebalance** - Automated rebalancing execution

## Setup Instructions

### Prerequisites

1. **Node.js** v18+ and npm
2. **Foundry** for smart contract deployment
3. **Vincent AI Account** at https://heyvincent.ai
4. **RPC URLs** for all target chains
5. **Private Keys**:
   - Deployer wallet (for contracts)
   - Vincent executor wallet (for automation)

### Step 1: Environment Setup

Create `.env` file in the `vincent/` directory:

```bash
# RPC URLs
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Contract Addresses (fill after deployment)
VINCENT_AUTOMATION_ADDRESS=0x...
VITE_VAULT_ADDRESS=0x...  # Base vault
ETHEREUM_VAULT_ADDRESS=0x...
ARBITRUM_VAULT_ADDRESS=0x...
OPTIMISM_VAULT_ADDRESS=0x...

# Vincent Credentials
VINCENT_EXECUTOR_ADDRESS=0x...  # Vincent's wallet address
VINCENT_PRIVATE_KEY=0x...       # Vincent's private key

# Test Addresses
TEST_USER_ADDRESS=0x...

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ADMIN_EMAIL=admin@yieldpro.ai
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Step 2: Deploy Smart Contracts

```bash
# Navigate to contracts directory
cd contracts

# Deploy VincentAutomation on Base
forge script script/DeployVincent.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify

# Note the VincentAutomation address and update .env
```

**Important:** Before deploying, update the constants in `DeployVincent.s.sol`:
- `VINCENT_EXECUTOR` - Vincent's wallet address
- Vault addresses for each chain

### Step 3: Install Dependencies

```bash
cd vincent
npm install
```

### Step 4: Test Monitoring

```bash
# Test APY monitoring
npm run monitor

# Expected output:
# 📊 Monitoring Base (Chain ID: 8453)
#   🔍 Checking Aave V3...
#     ✅ APY: 3.45% | TVL: $1,234,567 | Health: ✓
# ...
# 🎯 Top Yield Opportunities:
# 1. Base → Arbitrum 🌉
#    From: Aave V3 (3.45%)
#    To:   Morpho Blue (5.67%)
#    Gain: 2.22% APY
#    ...
```

### Step 5: Configure Vincent AI

#### 5.1 Register with Vincent

1. Go to https://heyvincent.ai
2. Create an account
3. Navigate to "Abilities" section
4. Click "Create Custom Ability"

#### 5.2 Upload Abilities

For each ability in `abilities/`:

```bash
# Upload monitor-apy ability
vincent-cli upload-ability \
  --name "monitor-yield-apy" \
  --config abilities/monitor-apy.json \
  --handler apy-monitor.ts

# Upload find-opportunities ability
vincent-cli upload-ability \
  --name "find-yield-opportunities" \
  --config abilities/find-opportunities.json \
  --handler apy-monitor.ts

# Upload execute-rebalance ability
vincent-cli upload-ability \
  --name "execute-yield-rebalance" \
  --config abilities/execute-rebalance.json \
  --handler rebalance-engine.ts
```

#### 5.3 Configure Workflow

In Vincent dashboard:
1. Go to "Workflows"
2. Click "Create Workflow"
3. Upload `vincent-config.json`
4. Enable the "automated-yield-optimization" workflow

### Step 6: Test Rebalancing

```bash
# Dry run - check what would be rebalanced
npm run find-opportunities

# Execute rebalancing for test user
TEST_USER_ADDRESS=0x... npm run rebalance
```

## Usage

### For Users

Users interact with the vault contracts and set their guardrails:

```solidity
// Enable auto-rebalancing with constraints
vault.updateGuardrails(
  100,        // maxSlippageBps: 1%
  5000000,    // gasCeilingUSD: $5
  50,         // minAPYDiffBps: 0.5%
  true        // autoRebalanceEnabled
);
```

Vincent will automatically:
1. Monitor APYs every 30 minutes
2. Find opportunities exceeding user's minimum APY difference
3. Execute rebalancing every 6 hours if profitable
4. Respect gas ceiling and cooldown periods

### For Developers

#### Monitor APYs Programmatically

```typescript
import { monitorAllAPYs, findBestOpportunities } from './apy-monitor';

const apyData = await monitorAllAPYs();
const opportunities = findBestOpportunities(apyData, 50); // Min 0.5% gain

console.log(`Found ${opportunities.length} opportunities`);
```

#### Execute Manual Rebalance

```typescript
import { rebalanceUser } from './rebalance-engine';

const vaults = {
  8453: '0x...', // Base
  42161: '0x...', // Arbitrum
};

const results = await rebalanceUser('0xUSER_ADDRESS', vaults);
```

#### Check User Positions

```typescript
import { getUserPositions } from './apy-monitor';

const positions = await getUserPositions('0xUSER_ADDRESS');
positions.forEach(pos => {
  console.log(`Chain ${pos.chainId}, Protocol ${pos.protocolId}: ${pos.balance}`);
});
```

## Monitoring & Alerts

### Metrics Tracked

1. **Total Rebalances** - Count of executed rebalances
2. **Total Yield Gained** - Cumulative APY improvement (bps)
3. **Total Gas Used** - Cumulative gas costs (USD)
4. **Protocol Health** - Real-time health status
5. **User Satisfaction** - Rebalances meeting guardrails

### Alert Types

| Alert | Severity | Trigger |
|-------|----------|---------|
| Protocol Unhealthy | Warning | `isHealthy == false` |
| Rebalance Failed | Error | Transaction reverted |
| High Gas Cost | Warning | Gas > $10 |
| No Opportunities | Info | 24h with no profitable moves |

### Notification Channels

- **Slack** - Real-time alerts to #yield-alerts
- **Email** - Daily summaries and error reports
- **Telegram** - Critical alerts only

## Security

### Multi-Sig Support

For production, enable multi-sig in `vincent-config.json`:

```json
{
  "security": {
    "multi_sig": {
      "enabled": true,
      "threshold": "2/3",
      "signers": ["0x...", "0x...", "0x..."]
    }
  }
}
```

### Rate Limiting

Built-in protection:
- Max 10 rebalances/hour
- Max 50 rebalances/day
- Max $100 gas/day

### Emergency Pause

If issues detected, pause the system:

```bash
# Pause VincentAutomation
cast send $VINCENT_AUTOMATION_ADDRESS "pause()" \
  --rpc-url $BASE_RPC_URL \
  --private-key $ADMIN_PRIVATE_KEY
```

## Troubleshooting

### Common Issues

#### "VaultNotRegistered" Error

**Cause:** Vault not registered in VincentAutomation
**Solution:**
```bash
cast send $VINCENT_AUTOMATION_ADDRESS \
  "registerVault(uint256,address)" 8453 $VAULT_ADDRESS \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
```

#### "UserGuardrailsViolated" Error

**Cause:** User has auto-rebalance disabled or APY gain below minimum
**Solution:** User needs to update guardrails via vault contract

#### "RebalanceCooldownActive" Error

**Cause:** Cooldown period hasn't elapsed
**Solution:** Wait for cooldown to expire (check `canRebalance()`)

#### "GasCostTooHigh" Error

**Cause:** Estimated gas exceeds user's ceiling
**Solution:** Wait for lower gas prices or user increases ceiling

### Debug Mode

Enable detailed logging:

```bash
# Verbose output
DEBUG=* npm run monitor

# Monitor specific chain
CHAIN_FILTER=8453 npm run monitor
```

## Performance Optimization

### Gas Optimization

1. **Batch Operations** - Process multiple users per transaction
2. **Off-Peak Rebalancing** - Schedule during low-gas periods
3. **Threshold Tuning** - Increase minimum APY gain to reduce frequency

### API Rate Limiting

Use multiple RPC providers for redundancy:

```typescript
const providers = [
  'https://base.llamarpc.com',
  'https://mainnet.base.org',
  'https://base.publicnode.com'
];
```

## Roadmap

- [ ] Support for additional chains (Polygon, zkSync)
- [ ] Integration with more protocols (Spark, Yearn)
- [ ] ML-based APY prediction
- [ ] Gas price forecasting
- [ ] User dashboard with historical performance
- [ ] Governance token for automation fees

## Support

- **Documentation:** https://docs.yieldpro.ai/vincent
- **Discord:** https://discord.gg/yieldpro
- **Issues:** https://github.com/yourusername/YieldPro/issues
- **Email:** support@yieldpro.ai

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

---

**Built with ❤️ by the YieldPro Team**
