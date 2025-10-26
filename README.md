# Chameleon

**Automated cross-chain yield optimization with real-time monitoring and user-defined guardrails.**

## 🎯 Project Description

Chameleon is a DeFi automation platform that intelligently moves idle stablecoins to the best APY opportunities across multiple blockchains. The platform leverages Avail Nexus for seamless cross-chain deposits and Vincent automation for periodic rebalancing with user-controlled permissions.

Users can deposit USDC from any supported chain through a unified interface, set custom guardrails for risk management (maximum slippage, gas ceilings, minimum APY differentials), and enable automated rebalancing that continuously optimizes their yields. The system monitors APYs across lending protocols like Aave and Compound, tracks gas costs for optimal transaction timing, and provides real-time analytics through a comprehensive dashboard.

## 🛠 How It's Made

### Architecture Overview

The platform consists of three main components: smart contracts for yield optimization, a React frontend for user interaction, and automated backend services for monitoring and rebalancing.

### Smart Contracts (Solidity + Foundry)

The core smart contracts are built with Solidity 0.8.20 and deployed using Foundry:

-   **YieldOptimizer.sol**: Main ERC4626 vault contract that manages user deposits and handles yield farming across protocols
-   **StrategyManager.sol**: Executes rebalancing strategies based on APY comparisons and user guardrails
-   **YieldAggregator.sol**: Aggregates yield data from multiple DeFi protocols for optimal strategy selection

Contracts are deployed on both Base and Arbitrum networks, with cross-chain communication handled through Avail Nexus bridge contracts.

### Frontend (React + TypeScript + Vite)

The user interface is built with modern React 19 and TypeScript:

-   **React 19** with hooks for state management and component lifecycle
-   **Vite** for fast development and optimized production builds
-   **TailwindCSS + shadcn/ui** for responsive, accessible component design
-   **Wagmi + ConnectKit** for seamless wallet connections and transaction management
-   **Avail Nexus SDK** for cross-chain deposit and bridge operations

### Key Technical Integrations

**Avail Nexus Integration:**

-   Provides unified cross-chain deposits from any supported blockchain
-   Handles Bridge & Execute operations for seamless asset transfers
-   Manages cross-chain communication between Base and Arbitrum vaults

**Vincent Automation:**

-   Implements scoped delegations for user-controlled automation
-   Handles periodic rebalancing based on user-defined parameters
-   Provides gas-optimized transaction execution

### Development Workflow

The project uses a monorepo structure with pnpm for dependency management:

```bash
# Install all dependencies
pnpm install

# Start development server
pnpm dev

# Build contracts
pnpm contracts:build

# Run contract tests
pnpm contracts:test

# Deploy contracts
pnpm contracts:deploy
```

### Smart Contract Deployment

Contracts are deployed to both Base and Arbitrum mainnets:

-   **Base Vault**: `0xD9a8D0C0CFCb7ce6D70a9D2674beA338e7C5223f`
-   **Arbitrum Vault**: `0x32B740171aAA13D7bFecC44c3C87FB1F4c5f819A`
-   **Nexus Bridge**: `0x10d699a7299cbb5d3fb46296dc3aadd555701bed`

### Security & Testing

-   Comprehensive smart contract testing with Foundry
-   Frontend testing with Vitest and React Testing Library
-   Gas optimization and security audits planned for mainnet deployment
-   User guardrails prevent unauthorized transactions and excessive risk

### Notable Technical Decisions

**Cross-Chain Architecture**: Using Avail Nexus eliminates the need for complex bridge management, allowing users to deposit from any chain while the system optimizes yields on the best-performing networks.

**ERC4626 Standard**: Vault contracts follow the ERC4626 standard for tokenized yield vaults, ensuring compatibility with DeFi ecosystems and providing standard interfaces for yield farming.

**Scoped Automation**: Vincent delegations are limited to specific functions and parameters, giving users control over automation while enabling efficient rebalancing.

**Real-Time Monitoring**: The system continuously monitors protocol APYs, gas costs, and TVL changes to make data-driven rebalancing decisions.

This architecture enables a seamless, secure, and efficient yield optimization experience that puts users in control of their DeFi automation.
