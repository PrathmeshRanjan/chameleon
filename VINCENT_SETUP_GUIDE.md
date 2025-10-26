# Vincent Integration Setup Guide

Complete step-by-step guide to integrate Vincent AI for automated yield optimization.

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] Foundry installed (`curl -L https://foundry.paradigm.xyz | bash`)
- [ ] Git repository set up
- [ ] RPC URLs for: Ethereum, Base, Arbitrum, Optimism
- [ ] Deployer wallet with funds on all chains
- [ ] Vincent executor wallet created (separate from deployer)
- [ ] Vincent AI account at https://heyvincent.ai

## Phase 1: Smart Contract Deployment

### 1.1 Deploy Vaults on Each Chain

Already completed on Base! Now deploy on other chains:

#### Ethereum Deployment

```bash
cd YieldStar/contracts

# Update Deploy.s.sol with Ethereum addresses
# - USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
# - Aave: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
# - Compound: 0xc3d688B66703497DAA19211EEdff47f25384cdc3

forge script script/Deploy.s.sol \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Save vault address
echo "ETHEREUM_VAULT_ADDRESS=<address>" >> ../.env
```

#### Arbitrum Deployment

```bash
# Update Deploy.s.sol with Arbitrum addresses
# - USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
# - Aave: 0x794a61358D6845594F94dc1DB02A252b5b4814aD
# - Morpho: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb

forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY

# Save vault address
echo "ARBITRUM_VAULT_ADDRESS=<address>" >> ../.env
```

#### Optimism Deployment

```bash
# Update Deploy.s.sol with Optimism addresses
# - USDC: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
# - Aave: 0x794a61358D6845594F94dc1DB02A252b5b4814aD

forge script script/Deploy.s.sol \
  --rpc-url $OPTIMISM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $OPTIMISTIC_ETHERSCAN_API_KEY

# Save vault address
echo "OPTIMISM_VAULT_ADDRESS=<address>" >> ../.env
```

### 1.2 Deploy VincentAutomation

Update `contracts/script/DeployVincent.s.sol` with:
1. Vincent executor address (your Vincent AI wallet)
2. All vault addresses from Phase 1.1

```bash
# Deploy on Base (primary chain for Vincent)
forge script script/DeployVincent.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify

# Save VincentAutomation address
echo "VINCENT_AUTOMATION_ADDRESS=<address>" >> ../.env
```

### 1.3 Verify Deployment

```bash
# Check VincentAutomation is deployed
cast call $VINCENT_AUTOMATION_ADDRESS "vincentExecutor()" --rpc-url $BASE_RPC_URL

# Check vaults are registered
cast call $VINCENT_AUTOMATION_ADDRESS "getSupportedChains()" --rpc-url $BASE_RPC_URL

# Expected: [1, 8453, 42161, 10] (or subset based on deployments)
```

## Phase 2: Backend Setup

### 2.1 Install Vincent Services

```bash
cd vincent

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify compilation
npm run typecheck
```

### 2.2 Configure Environment

Create `vincent/.env`:

```bash
# Copy template
cp .env.example .env

# Fill in all values from Phase 1
# See vincent/README.md for full list
```

### 2.3 Test Monitoring

```bash
# Test APY monitoring (read-only)
npm run monitor

# Expected output:
# - APY data from all protocols
# - List of yield opportunities
# - No errors

# Test opportunity finder
npm run find-opportunities

# Expected: Sorted list of profitable moves
```

## Phase 3: Vincent AI Integration

### 3.1 Create Vincent Account

1. Go to https://heyvincent.ai
2. Sign up with email
3. Complete onboarding
4. Navigate to Dashboard

### 3.2 Configure Wallet

1. In Vincent Dashboard → Settings → Wallets
2. Click "Add Wallet"
3. Import your Vincent executor wallet (private key)
4. Verify address matches `VINCENT_EXECUTOR_ADDRESS` in .env
5. Fund wallet with:
   - Base: 0.1 ETH
   - Ethereum: 0.5 ETH
   - Arbitrum: 0.1 ETH
   - Optimism: 0.1 ETH

### 3.3 Upload Code to Vincent

#### Option A: GitHub Integration (Recommended)

1. Push code to GitHub:
```bash
git add vincent/
git commit -m "Add Vincent automation"
git push origin main
```

2. In Vincent Dashboard:
   - Settings → Integrations → GitHub
   - Connect repository
   - Set path: `vincent/`
   - Grant read access

#### Option B: Manual Upload

1. In Vincent Dashboard → Abilities → Upload
2. Upload each file:
   - `apy-monitor.ts`
   - `rebalance-engine.ts`
   - `abilities/monitor-apy.json`
   - `abilities/find-opportunities.json`
   - `abilities/execute-rebalance.json`

### 3.4 Register Abilities

In Vincent Dashboard:

#### Ability 1: Monitor APY

```
Name: monitor-yield-apy
Type: Scheduled
Schedule: */30 * * * * (every 30 minutes)
Handler: apy-monitor.ts
Function: monitorAllAPYs
Enabled: ✓
```

#### Ability 2: Find Opportunities

```
Name: find-yield-opportunities
Type: On-Demand
Handler: apy-monitor.ts
Function: findBestOpportunities
Enabled: ✓
```

#### Ability 3: Execute Rebalance

```
Name: execute-yield-rebalance
Type: Scheduled
Schedule: 0 */6 * * * (every 6 hours)
Handler: rebalance-engine.ts
Function: rebalanceAllUsers
Enabled: ✓
Requires Approval: ✓ (initially, disable later)
```

### 3.5 Create Workflow

1. Dashboard → Workflows → Create New
2. Name: "Automated Yield Optimization"
3. Upload `vincent-config.json`
4. Review configuration:
   - Supported chains: ✓
   - Abilities linked: ✓
   - Monitoring enabled: ✓
5. Set parameters:
   - Active users list: `["0x...", "0x..."]`
   - Vault addresses: From .env
6. Enable workflow
7. Set to "Auto" mode (after testing)

## Phase 4: Testing

### 4.1 Test User Setup

Create a test user wallet:

```bash
# Generate test wallet
cast wallet new

# Fund with USDC on Base
# Transfer 100 USDC to test wallet

# Deposit into vault
cast send $VITE_VAULT_ADDRESS "deposit(uint256,address)" \
  100000000 $TEST_USER_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY

# Set guardrails (enable auto-rebalance)
cast send $VITE_VAULT_ADDRESS \
  "updateGuardrails(uint256,uint256,uint256,bool)" \
  100 5000000 50 true \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY
```

### 4.2 Manual Rebalance Test

```bash
cd vincent

# Test rebalancing for test user
TEST_USER_ADDRESS=0x... npm run rebalance

# Expected:
# ✅ APY monitoring successful
# ✅ Opportunities found
# ✅ Validation passed
# ✅ Transaction submitted
# ✅ Transaction confirmed

# Verify in block explorer
```

### 4.3 Vincent Dashboard Test

In Vincent Dashboard:

1. Go to Abilities → monitor-yield-apy
2. Click "Run Now"
3. Check logs for successful execution
4. Go to Abilities → execute-yield-rebalance
5. Click "Run Now" (with approval)
6. Approve transaction
7. Monitor execution logs

### 4.4 End-to-End Test

Wait for scheduled execution (or trigger manually):

1. Monitor APY runs (every 30 min)
2. Data stored in Vincent state
3. Rebalance check runs (every 6 hours)
4. If profitable opportunity found:
   - Vincent validates guardrails
   - Estimates gas cost
   - Executes rebalancing
   - Sends success notification
5. Verify:
   - User balance moved to new protocol
   - Transaction in block explorer
   - Event emitted from VincentAutomation
   - Notification received (Slack/Email)

## Phase 5: Production Launch

### 5.1 Security Review

- [ ] Multi-sig enabled for VincentAutomation owner
- [ ] Rate limits configured
- [ ] Gas limits set appropriately
- [ ] Emergency pause tested
- [ ] Vincent executor wallet secured (hardware wallet or MPC)
- [ ] .env files not committed to git
- [ ] API keys rotated
- [ ] Smart contracts verified on Etherscan

### 5.2 Monitoring Setup

Configure alerts in `vincent-config.json`:

```json
{
  "notifications": {
    "slack": {
      "webhook_url": "YOUR_SLACK_WEBHOOK",
      "channels": {
        "alerts": "#yield-alerts",
        "info": "#yield-info"
      }
    },
    "email": {
      "recipients": {
        "errors": ["admin@yieldpro.ai"]
      }
    }
  }
}
```

Test notifications:

```bash
# Trigger test alert
vincent-cli test-alert --type error --message "Test alert"
```

### 5.3 User Onboarding

#### Update Frontend

In your frontend app, add Vincent status:

```tsx
// src/components/VincentStatus.tsx
import { useVincent } from '@/hooks/useVincent';

export function VincentStatus() {
  const { status, lastRebalance, totalRebalances } = useVincent();

  return (
    <div>
      <h3>Vincent Automation Status</h3>
      <p>Status: {status ? 'Active' : 'Inactive'}</p>
      <p>Last Rebalance: {lastRebalance}</p>
      <p>Total Rebalances: {totalRebalances}</p>
    </div>
  );
}
```

#### User Documentation

Add to your docs:

1. What is Vincent automation
2. How to enable auto-rebalance
3. How to set guardrails
4. What to expect (frequency, notifications)
5. How to disable if needed

### 5.4 Gradual Rollout

**Week 1: Limited Beta**
- Enable for 5-10 test users
- Monitor closely
- Require manual approval for each rebalance
- Collect feedback

**Week 2-3: Expanded Beta**
- Enable for 50-100 users
- Reduce approval requirement (only for large amounts)
- Monitor metrics
- Optimize parameters

**Week 4+: Full Launch**
- Enable for all users who opt-in
- Full automation (no approval needed)
- Public announcement
- Marketing campaign

## Phase 6: Maintenance

### 6.1 Regular Checks

Daily:
- [ ] Check Vincent Dashboard for errors
- [ ] Review rebalancing activity
- [ ] Monitor gas costs
- [ ] Check protocol health

Weekly:
- [ ] Review performance metrics
- [ ] Analyze user satisfaction
- [ ] Optimize parameters if needed
- [ ] Update RPC endpoints if issues

Monthly:
- [ ] Security audit of changes
- [ ] Performance report to stakeholders
- [ ] User feedback review
- [ ] Protocol upgrades if needed

### 6.2 Parameter Tuning

Based on metrics, adjust:

```bash
# Update VincentAutomation parameters
cast send $VINCENT_AUTOMATION_ADDRESS \
  "updateParameters(uint256,uint256,uint256)" \
  <minAPYDiff> <maxGasCost> <cooldown> \
  --rpc-url $BASE_RPC_URL \
  --private-key $ADMIN_PRIVATE_KEY
```

**Recommended adjustments:**
- Increase `minAPYDiff` if too many small rebalances
- Decrease `maxGasCost` during high gas periods
- Adjust `cooldown` based on volatility

### 6.3 Adding New Protocols

When adding new protocol (e.g., Yearn):

1. Deploy new adapter:
```bash
forge create YearnAdapter --constructor-args $YEARN_VAULT
```

2. Register with vault:
```bash
cast send $VAULT_ADDRESS "addProtocolAdapter(...)" ...
```

3. Update `vincent/apy-monitor.ts`:
```typescript
// Add to PROTOCOLS config
{
  id: 4,
  name: 'Yearn',
  adapterAddress: '0x...',
  protocolType: 'yearn'
}
```

4. Deploy updated code to Vincent

## Troubleshooting

### Issue: Vincent Not Executing

**Check:**
1. Vincent executor wallet has funds on all chains
2. Abilities are enabled in Dashboard
3. Workflow is set to "Auto" mode
4. No recent errors in logs

**Solution:**
```bash
# Check executor balance
cast balance $VINCENT_EXECUTOR_ADDRESS --rpc-url $BASE_RPC_URL

# Check if Vincent can rebalance
cast call $VINCENT_AUTOMATION_ADDRESS \
  "canRebalance(address,uint256)" $USER_ADDRESS 8453 \
  --rpc-url $BASE_RPC_URL
```

### Issue: High Gas Costs

**Check:**
1. Current gas prices on chains
2. User gas ceilings
3. Recent rebalancing frequency

**Solution:**
```bash
# Increase cooldown temporarily
cast send $VINCENT_AUTOMATION_ADDRESS \
  "updateParameters(uint256,uint256,uint256)" \
  50 10000000 7200 \
  --rpc-url $BASE_RPC_URL

# (7200 = 2 hours cooldown)
```

### Issue: Rebalances Reverting

**Check:**
1. User guardrails configuration
2. Protocol health
3. Slippage settings
4. Gas estimation

**Debug:**
```bash
# Simulate transaction
cast call $VINCENT_AUTOMATION_ADDRESS \
  "executeSameChainRebalance(...)" ... \
  --rpc-url $BASE_RPC_URL

# Check error message
```

## Next Steps

After successful integration:

1. **Scale to More Chains**
   - Deploy on Polygon, zkSync, etc.
   - Add protocol adapters

2. **Advanced Features**
   - ML-based APY prediction
   - Gas price optimization
   - User risk profiles
   - Automated strategy selection

3. **Community Features**
   - Leaderboard for best strategies
   - Social trading (copy successful users)
   - Governance for parameter tuning

4. **Revenue Model**
   - Performance fees on Vincent-executed rebalances
   - Premium features for power users
   - B2B licensing

## Support

Need help? Contact:

- **Technical Issues:** Create issue on GitHub
- **Vincent Platform:** support@heyvincent.ai
- **Smart Contracts:** security@yieldpro.ai
- **General:** team@yieldpro.ai

## Appendix

### A. Required Accounts & Credentials

| Item | Purpose | Where to Get |
|------|---------|--------------|
| Deployer wallet | Deploy contracts | MetaMask/Hardware wallet |
| Vincent executor | Execute rebalances | New wallet for Vincent |
| Vincent AI account | Platform access | heyvincent.ai |
| RPC URLs | Blockchain access | Alchemy, Infura, etc. |
| Etherscan API keys | Contract verification | Etherscan.io |
| Slack webhook | Notifications | Slack workspace settings |

### B. Contract Addresses Reference

After deployment, maintain this list:

```
# Base Mainnet
VAULT: 0x...
VINCENT_AUTOMATION: 0x...
AAVE_ADAPTER: 0x...

# Ethereum Mainnet
VAULT: 0x...
AAVE_ADAPTER: 0x...
COMPOUND_ADAPTER: 0x...

# Arbitrum
VAULT: 0x...
AAVE_ADAPTER: 0x...
MORPHO_ADAPTER: 0x...

# Optimism
VAULT: 0x...
AAVE_ADAPTER: 0x...
```

### C. Useful Commands

```bash
# Check Vincent status
cast call $VINCENT_AUTOMATION_ADDRESS "totalRebalances()" --rpc-url $BASE_RPC_URL

# Check total yield gained
cast call $VINCENT_AUTOMATION_ADDRESS "totalYieldGained()" --rpc-url $BASE_RPC_URL

# Check protocol performance
cast call $VINCENT_AUTOMATION_ADDRESS \
  "getProtocolPerformance(uint256,uint256)" 8453 1 \
  --rpc-url $BASE_RPC_URL

# Get supported chains
cast call $VINCENT_AUTOMATION_ADDRESS "getSupportedChains()" --rpc-url $BASE_RPC_URL
```

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0
**Status:** Ready for Production
