# Smart Yield Optimizer

**Automated yield optimization across multiple chains with real-time monitoring and user-defined guardrails.**

## 🎯 Project Overview

Smart Yield Optimizer is a DeFi automation platform that intelligently moves idle stablecoins to the best APY opportunities across any blockchain, leveraging three powerful integrations:

### Tracks

-   ✅ **Avail Nexus** - Unified cross-chain deposits and seamless Bridge & Execute
-   ✅ **Vincent** - DeFi automation with scoped delegations for weekly/daily rebalancing
-   ✅ **Pyth Network** - Real-time price feeds for APY tracking, gas costs, and slippage estimation

## 🚀 Features

### Core Functionality

1. **Unified Deposits** - Users deposit USDC/USDT via Avail Nexus from any supported chain
2. **Automated Rebalancing** - Vincent automation handles periodic rebalancing with user-controlled permissions
3. **Real-time Monitoring** - Pyth price feeds continuously track:
    - APYs across lending protocols (Aave, Compound, etc.)
    - Gas costs for optimal transaction timing
    - Slippage estimates for swaps
    - Protocol TVL changes for risk assessment

### Smart Guardrails

-   Maximum slippage tolerance
-   Gas cost ceiling
-   Minimum APY differential before rebalancing
-   Protocol whitelist/blacklist

### Dashboard

-   Real-time yield comparison across protocols
-   Projected earnings calculator
-   Transaction history
-   Rebalancing analytics

## 🛠 Tech Stack

### Smart Contracts (Foundry)

-   Solidity ^0.8.20
-   Foundry for development and testing
-   Avail Nexus integration
-   Vincent delegation contracts
-   Pyth oracle integration

### Frontend (Vite + React)

-   React 19 + TypeScript
-   Vite for fast development
-   TailwindCSS + shadcn/ui components
-   Wagmi + ConnectKit for wallet connections
-   @avail-project/nexus-core SDK

## 📦 Project Structure

```
smart-yield-optimizer/
├── contracts/                 # Foundry smart contracts
│   ├── src/
│   │   ├── YieldOptimizer.sol       # Main optimizer contract
│   │   ├── StrategyManager.sol      # Strategy execution
│   │   ├── YieldAggregator.sol      # APY data aggregation
│   │   └── interfaces/              # Protocol interfaces
│   ├── script/
│   │   └── Deploy.s.sol             # Deployment scripts
│   └── test/                        # Contract tests
├── src/                       # Frontend application
│   ├── components/
│   │   ├── dashboard/               # Dashboard components
│   │   ├── deposit/                 # Deposit interface
│   │   ├── settings/                # User settings & guardrails
│   │   └── ui/                      # Shared UI components
│   ├── hooks/
│   │   ├── useYieldData.ts          # Pyth yield data hook
│   │   ├── useAvailNexus.ts         # Nexus integration
│   │   └── useVincentAutomation.ts  # Vincent automation
│   ├── providers/
│   │   ├── NexusProvider.tsx
│   │   └── Web3Provider.tsx
│   └── types/                       # TypeScript definitions
└── public/
```

## 🏗 Setup Instructions

### Prerequisites

-   Node.js v18+ and pnpm
-   Foundry (for smart contracts)
-   WalletConnect Project ID

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install Foundry dependencies (if not already done)
cd contracts && forge install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Add your configuration:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 3. Smart Contracts

```bash
# Build contracts
pnpm contracts:build

# Run tests
pnpm contracts:test

# Deploy (set RPC_URL and PRIVATE_KEY first)
pnpm contracts:deploy
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:5173`

## 🎮 Usage

1. **Connect Wallet** - Connect your wallet using ConnectKit
2. **Initialize Nexus** - Click "Connect Nexus" to initialize cross-chain functionality
3. **Deposit Funds** - Deposit USDC/USDT from any supported chain
4. **Set Guardrails** - Configure your risk parameters:
    - Max slippage tolerance
    - Gas ceiling
    - Minimum APY delta for rebalancing
5. **Enable Automation** - Grant Vincent delegation with scoped permissions
6. **Monitor** - Watch real-time yield opportunities and automated rebalancing

## 🔗 Integrations

### Avail Nexus

-   Unified deposits from any chain
-   Bridge & Execute for seamless transfers
-   XCS Swaps for token conversions

### Vincent Automation

-   Scoped delegations for user control
-   Automated rebalancing execution
-   Configurable time intervals

### Pyth Network

-   Real-time APY data feeds
-   Gas price oracles
-   Slippage estimation
-   Protocol TVL monitoring

## 🧪 Testing

```bash
# Frontend tests
pnpm test

# Smart contract tests
pnpm contracts:test

# Coverage
cd contracts && forge coverage
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 🔐 Security

This project is in active development. Do not use with real funds on mainnet without proper audits.

## 📧 Contact

For questions and support, please open an issue on GitHub.
