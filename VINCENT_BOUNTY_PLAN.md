# Vincent Bounty Implementation Plan

## 🎯 Bounty Requirements

### Mandatory Deliverables
1. ✅ Fully functional Vincent App (published on Registry)
2. ✅ Uses at least one DeFi ability (NOT just ERC20 transfers)
3. ✅ Accepts user deposits & performs automated transactions
4. ✅ Demo video with deposit → automation walkthrough

### Bonus Points
- 🎁 Build new DeFi Abilities (Aave V3 supply/withdraw/rebalance)
- 🎁 Cross-chain capability (EVM chains + Bitcoin L2)
- 🎁 Use Debridge/Across for cross-chain swaps/deposits

## 🏗️ Vincent Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Vincent Platform                         │
│  (Lit Protocol PKPs + Decentralized MPC Threshold Signing)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vincent App                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │   Database   │     │
│  │   (React)    │◄─┤  (Node.js)   │◄─┤  (MongoDB)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vincent Abilities                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   Aave   │ │ Uniswap  │ │ deBridge │ │  Custom  │      │
│  │ V3 Lend  │ │   Swap   │ │  Bridge  │ │ Rebalance│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Smart Contracts (On-Chain)                      │
│  Aave V3 Pool, Compound V3, Uniswap Router, etc.           │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Current vs Required Implementation

### What We Have (Traditional Approach)
```
✅ YieldOptimizerUSDC.sol - ERC4626 vault
✅ AaveV3Adapter.sol - Protocol adapter
✅ React UI components
✅ Guardrails system
✅ Cross-chain rebalancing logic
```

### What Vincent Requires (Delegation Approach)
```
🔄 Vincent App (Frontend + Backend)
🔄 Vincent Abilities for DeFi protocols
🔄 Lit Protocol PKP integration
🔄 Scoped delegation system
🔄 MongoDB for state management
🔄 Job scheduler for automation
```

## 🛠️ Implementation Strategy

### Option A: Full Vincent App (Recommended for Bounty)
Build a complete Vincent App from scratch using their architecture.

**Pros:**
- ✅ Meets all bounty requirements
- ✅ Eligible for bonus points
- ✅ Can be published to Vincent Registry
- ✅ Uses Lit Protocol PKPs properly

**Cons:**
- ⏱️ Requires building backend + scheduler
- ⏱️ Need MongoDB setup
- ⏱️ More complex architecture

### Option B: Hybrid Approach
Keep existing smart contracts but wrap them with Vincent Abilities.

**Pros:**
- ✅ Reuses existing vault contracts
- ✅ Faster implementation
- ✅ Can still meet bounty requirements

**Cons:**
- ⚠️ May not qualify for full bonus points
- ⚠️ More complex to maintain two systems

## 🎯 Recommended: Option A - Full Vincent App

## 📋 Implementation Roadmap

### Phase 1: Setup Vincent App Structure (Day 1)
```bash
# Clone Vincent starter app
git clone https://github.com/LIT-Protocol/vincent-starter-app
cd vincent-starter-app

# Install dependencies
pnpm install
pnpm build

# Setup MongoDB (Docker)
docker run -d -p 27017:27017 mongo:latest

# Configure environment
cp .env.example .env
# Edit .env with:
# - MongoDB connection string
# - Lit Protocol API keys
# - RPC endpoints
```

**Deliverables:**
- [ ] Vincent App running locally
- [ ] MongoDB connected
- [ ] Authentication working
- [ ] Basic UI skeleton

### Phase 2: Build Custom DeFi Abilities (Day 2-3)

#### 2.1 Aave V3 Supply Ability
```typescript
// packages/dca-backend/abilities/aave-v3-supply.ability.ts
export const AaveV3SupplyAbility = {
  name: "aave-v3-supply",
  description: "Supply assets to Aave V3 lending protocol",
  parameters: {
    asset: { type: "address", required: true },
    amount: { type: "uint256", required: true },
    onBehalfOf: { type: "address", required: true },
  },
  chains: ["ethereum", "arbitrum", "optimism", "base"],
  execute: async (params) => {
    // Contract: 0x794a61358D6845594F94dc1DB02A252b5b4814aD (Arbitrum)
    // Function: pool.supply(asset, amount, onBehalfOf, referralCode)
  }
};
```

#### 2.2 Aave V3 Withdraw Ability
```typescript
// packages/dca-backend/abilities/aave-v3-withdraw.ability.ts
export const AaveV3WithdrawAbility = {
  name: "aave-v3-withdraw",
  description: "Withdraw assets from Aave V3",
  parameters: {
    asset: { type: "address", required: true },
    amount: { type: "uint256", required: true },
    to: { type: "address", required: true },
  },
  chains: ["ethereum", "arbitrum", "optimism", "base"],
  execute: async (params) => {
    // Function: pool.withdraw(asset, amount, to)
  }
};
```

#### 2.3 Yield Rebalance Ability (Custom)
```typescript
// packages/dca-backend/abilities/yield-rebalance.ability.ts
export const YieldRebalanceAbility = {
  name: "yield-rebalance",
  description: "Automatically rebalance between protocols for max yield",
  parameters: {
    fromProtocol: { type: "string", required: true }, // "aave-v3", "compound-v3"
    toProtocol: { type: "string", required: true },
    asset: { type: "address", required: true },
    amount: { type: "uint256", required: true },
    minAPYGain: { type: "uint256", required: true }, // in bps
  },
  chains: ["ethereum", "arbitrum", "optimism"],
  execute: async (params) => {
    // 1. Check APY difference
    // 2. Withdraw from source protocol
    // 3. Deposit to destination protocol
    // 4. Emit rebalance event
  }
};
```

#### 2.4 Cross-Chain Rebalance Ability (Bonus)
```typescript
// packages/dca-backend/abilities/cross-chain-rebalance.ability.ts
export const CrossChainRebalanceAbility = {
  name: "cross-chain-rebalance",
  description: "Rebalance across chains using deBridge",
  parameters: {
    fromChain: { type: "uint256", required: true },
    toChain: { type: "uint256", required: true },
    fromProtocol: { type: "string", required: true },
    toProtocol: { type: "string", required: true },
    asset: { type: "address", required: true },
    amount: { type: "uint256", required: true },
  },
  chains: ["ethereum", "arbitrum", "optimism", "base"],
  integrations: ["debridge", "across"],
  execute: async (params) => {
    // 1. Withdraw from source protocol on source chain
    // 2. Bridge assets using deBridge/Across
    // 3. Deposit to destination protocol on destination chain
  }
};
```

**Deliverables:**
- [ ] 4 custom Vincent Abilities
- [ ] Type-safe schemas for each
- [ ] Unit tests for abilities
- [ ] Integration with Lit Protocol signing

### Phase 3: Build Frontend (Day 4)

#### 3.1 Reuse Existing UI Components
Adapt our existing components:
- ✅ `YieldDashboard.tsx` - Show live yields
- ✅ `DepositCard.tsx` - User deposits
- ✅ `VincentSettings.tsx` - Guardrails config
- ✅ `AutomationStatus.tsx` - Status display
- ✅ `RebalanceHistory.tsx` - History viewer

#### 3.2 New Vincent-Specific Components
```typescript
// packages/dca-frontend/components/VincentDelegation.tsx
- Connect to Vincent
- Delegate PKP to app
- Set scoped permissions
- Approve abilities

// packages/dca-frontend/components/DepositFlow.tsx
- Deposit USDC/USDT
- Choose target yield (auto-optimize)
- Set guardrails (slippage, gas, APY threshold)
- Confirm delegation scope
```

**Deliverables:**
- [ ] Vincent authentication flow
- [ ] Deposit interface
- [ ] Delegation management UI
- [ ] Real-time status dashboard

### Phase 4: Build Backend Logic (Day 5)

#### 4.1 Job Scheduler
```typescript
// packages/dca-backend/scheduler/yield-optimizer.scheduler.ts
import Agenda from 'agenda';

export class YieldOptimizerScheduler {
  async checkAndRebalance(userId: string) {
    // 1. Fetch user positions from MongoDB
    // 2. Query current APYs from protocols
    // 3. Calculate best protocol
    // 4. Check user guardrails
    // 5. If conditions met, execute rebalance
    // 6. Update database
    // 7. Emit event
  }
}

// Run every 5 minutes for all users
agenda.define('check-yields', async () => {
  const users = await db.users.find({ autoRebalanceEnabled: true });
  for (const user of users) {
    await yieldOptimizer.checkAndRebalance(user.id);
  }
});
```

#### 4.2 APY Data Provider
```typescript
// packages/dca-backend/services/apy-provider.service.ts
export class APYProviderService {
  async getAaveV3APY(chain: string, asset: string): Promise<number> {
    // Query Aave V3 reserve data
    // Convert ray to bps
  }

  async getCompoundV3APY(chain: string, asset: string): Promise<number> {
    // Query Compound V3 utilization rate
  }

  async getBestProtocol(asset: string, chain: string) {
    const apys = await Promise.all([
      this.getAaveV3APY(chain, asset),
      this.getCompoundV3APY(chain, asset),
    ]);
    return apys.reduce((max, curr, i) =>
      curr > apys[max] ? i : max, 0
    );
  }
}
```

#### 4.3 Rebalance Executor
```typescript
// packages/dca-backend/services/rebalance-executor.service.ts
export class RebalanceExecutorService {
  async executeRebalance(userId: string, params: RebalanceParams) {
    // 1. Load user's PKP
    // 2. Get delegation scope
    // 3. Validate against guardrails
    // 4. Execute Vincent Ability (yield-rebalance)
    // 5. Wait for transaction confirmation
    // 6. Update MongoDB with transaction hash
    // 7. Calculate gas savings & yield gain
  }
}
```

**Deliverables:**
- [ ] Job scheduler running
- [ ] APY data fetching
- [ ] Rebalance executor
- [ ] Database models
- [ ] API endpoints

### Phase 5: Integration & Testing (Day 6)

#### 5.1 End-to-End Testing
```bash
# Test flow:
1. User connects wallet
2. User delegates to Vincent App
3. User deposits $1000 USDC
4. System detects best protocol (Aave V3 Arbitrum @ 5.5%)
5. System executes initial deposit
6. Wait 5 minutes
7. Better opportunity detected (Compound V3 @ 6.2%)
8. System executes rebalance
9. User sees transaction in history
10. Check gas saved & extra yield
```

#### 5.2 Cross-Chain Testing (Bonus)
```bash
# Test cross-chain flow:
1. User has position on Ethereum (Compound V3 @ 4.8%)
2. Better opportunity on Arbitrum (Aave V3 @ 5.5%)
3. System uses CrossChainRebalanceAbility
4. Withdraw from Compound V3 (Ethereum)
5. Bridge via deBridge to Arbitrum
6. Deposit to Aave V3 (Arbitrum)
7. Verify transaction on both chains
```

**Deliverables:**
- [ ] All test cases passing
- [ ] Cross-chain functionality verified
- [ ] Gas cost tracking working
- [ ] Error handling tested

### Phase 6: Deploy & Publish (Day 7)

#### 6.1 Deploy Backend
```bash
# Deploy to Heroku/Railway/Vercel
pnpm build
# Set environment variables
# Deploy backend
# Deploy frontend
```

#### 6.2 Publish to Vincent Registry
Follow Vincent's publishing guide to register the app.

#### 6.3 Create Demo Video
**Script:**
```
1. Introduction (30s)
   - "AdaptiveYield Pro - Smart Yield Optimizer"
   - "Automated cross-chain yield optimization"

2. Connect & Delegate (1min)
   - Connect wallet
   - Delegate to Vincent App
   - Set scoped permissions

3. Deposit & Configure (1min)
   - Deposit $1000 USDC
   - Set guardrails (slippage, gas, APY)
   - Enable auto-rebalance

4. Initial Position (30s)
   - System selects best protocol
   - Deposit to Aave V3 Arbitrum @ 5.5%

5. Automated Rebalance (2min)
   - New opportunity detected
   - Show guardrails validation
   - Execute rebalance
   - Show transaction on explorer

6. Cross-Chain Demo (2min - Bonus)
   - Opportunity on different chain
   - Show deBridge integration
   - Execute cross-chain rebalance

7. Results Dashboard (1min)
   - Total rebalances
   - Gas saved
   - Extra yield earned
   - Projected annual return

8. Summary (30s)
   - Key features recap
   - Vincent Abilities used
   - Benefits to users
```

**Deliverables:**
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] App published to Vincent Registry
- [ ] Demo video uploaded
- [ ] GitHub repo polished

## 🎨 What We Can Reuse

### From Current Implementation ✅
- UI components (with minor adaptations)
- Type definitions
- Smart contract knowledge (Aave V3, Compound)
- Guardrails validation logic
- APY calculation formulas
- Design system & branding

### What Needs to Be Built 🔨
- Vincent App backend
- Vincent Abilities (4 custom)
- Lit Protocol PKP integration
- MongoDB models
- Job scheduler
- API endpoints
- Authentication flow

## 📦 Tech Stack (Final)

### Frontend
```json
{
  "framework": "React 19",
  "styling": "TailwindCSS",
  "state": "React Query",
  "wallet": "wagmi + viem",
  "vincent": "@lit-protocol/vincent-sdk"
}
```

### Backend
```json
{
  "runtime": "Node.js 22+",
  "framework": "Express.js",
  "database": "MongoDB",
  "scheduler": "Agenda",
  "vincent": "@lit-protocol/lit-node-client"
}
```

### Abilities
```typescript
- aave-v3-supply
- aave-v3-withdraw
- yield-rebalance (custom)
- cross-chain-rebalance (custom, bonus)
```

## 🏆 Bounty Checklist

### Mandatory Requirements
- [ ] Vincent App created (frontend + backend)
- [ ] Uses DeFi Abilities (Aave V3 supply/withdraw)
- [ ] Custom rebalancing Ability
- [ ] Accepts user deposits
- [ ] Automated transactions via Vincent
- [ ] Published to Vincent Registry
- [ ] Demo video created

### Bonus Points
- [ ] Built 2 new DeFi Abilities (yield-rebalance, cross-chain-rebalance)
- [ ] Cross-chain capability demonstrated
- [ ] deBridge/Across integration
- [ ] Bitcoin L2 support (optional)

## 🎯 MVP vs Full Implementation

### MVP (Minimum for Bounty)
```
✅ Single chain (Arbitrum)
✅ 2 protocols (Aave V3, Compound V3)
✅ Basic rebalancing logic
✅ Simple guardrails
✅ Manual deposits
```

### Full Implementation (Maximum Points)
```
🌟 Multi-chain (Ethereum, Arbitrum, Optimism, Base)
🌟 5+ protocols (Aave, Compound, Yearn, Morpho, etc.)
🌟 Advanced rebalancing logic
🌟 Comprehensive guardrails
🌟 Cross-chain rebalancing
🌟 deBridge/Across integration
🌟 Real-time APY feeds (Pyth)
```

## 📊 Project Structure

```
vincent-adaptive-yield/
├── packages/
│   ├── frontend/              # React UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── automation/     # Reuse existing
│   │   │   │   ├── dashboard/      # Reuse existing
│   │   │   │   ├── deposit/        # Reuse existing
│   │   │   │   └── vincent/        # New: delegation
│   │   │   ├── hooks/
│   │   │   │   ├── useVincent.ts   # Adapted
│   │   │   │   └── useLitProtocol.ts # New
│   │   │   └── types/
│   │   │       └── yield.ts        # Reuse
│   │   └── package.json
│   │
│   └── backend/               # Node.js API
│       ├── src/
│       │   ├── abilities/
│       │   │   ├── aave-v3-supply.ts
│       │   │   ├── aave-v3-withdraw.ts
│       │   │   ├── yield-rebalance.ts
│       │   │   └── cross-chain-rebalance.ts
│       │   ├── services/
│       │   │   ├── apy-provider.service.ts
│       │   │   ├── rebalance-executor.service.ts
│       │   │   └── lit-protocol.service.ts
│       │   ├── scheduler/
│       │   │   └── yield-optimizer.scheduler.ts
│       │   ├── models/
│       │   │   ├── user.model.ts
│       │   │   └── rebalance.model.ts
│       │   └── api/
│       │       ├── auth.routes.ts
│       │       ├── positions.routes.ts
│       │       └── rebalance.routes.ts
│       └── package.json
│
├── contracts/                 # Optional: Keep for reference
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## ⏱️ Timeline Estimate

- **Day 1:** Setup Vincent App, MongoDB, authentication ✅
- **Day 2-3:** Build 4 custom Abilities ✅
- **Day 4:** Adapt frontend components ✅
- **Day 5:** Build backend logic (scheduler, executor) ✅
- **Day 6:** Testing & cross-chain integration ✅
- **Day 7:** Deploy, publish, demo video ✅

**Total:** 7 days for full implementation

## 🚀 Next Steps

1. **Immediate:**
   ```bash
   git clone https://github.com/LIT-Protocol/vincent-starter-app
   cd vincent-starter-app
   pnpm install
   ```

2. **Study:**
   - Review starter app code
   - Understand ability structure
   - Learn Lit Protocol PKP flow

3. **Plan:**
   - Decide MVP vs Full scope
   - Prioritize abilities to build
   - Set up development environment

4. **Build:**
   - Follow roadmap above
   - Test incrementally
   - Document as you go

## 💡 Key Insights

1. **Vincent is NOT just a contract address** - It's a full delegation platform
2. **Abilities are the core** - Build reusable, composable abilities
3. **Lit Protocol PKPs** - Enable true non-custodial automation
4. **Backend is required** - Can't just be a frontend app
5. **MongoDB for state** - Track positions, guardrails, history
6. **Job scheduler critical** - Agenda runs automated checks

## 🎓 Resources

- **Docs:** https://docs.heyvincent.ai
- **Starter:** https://github.com/LIT-Protocol/vincent-starter-app
- **Registry:** https://www.heyvincent.ai/registry
- **Discord:** Join Lit Protocol Discord for support

---

**This plan converts our existing work into a Vincent-compliant implementation that maximizes bounty potential!** 🏆
