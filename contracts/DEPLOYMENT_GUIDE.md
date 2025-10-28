# Chameleon Protocol - Deployment Guide

## Quick Start

### Deploy on Ethereum Sepolia
```bash
cd contracts
./deploy-sepolia.sh
```

### Deploy on Base Sepolia
```bash
./deploy-base-sepolia.sh
```

## What Gets Deployed

Each deployment creates:
1. **YieldOptimizerUSDC Vault** - ERC4626 vault for USDC deposits
2. **AaveV3Adapter** - Protocol adapter for Aave V3 integration

## Cross-Chain Integration

Cross-chain rebalancing uses **Avail Nexus SDK** (not a Solidity contract).

### Vincent Automation handles:
- Monitoring rebalance opportunities
- Calling `vault.executeRebalance()` 
- Using Nexus SDK to bridge assets
- Executing deposits on destination chain

See `../NEXUS_INTEGRATION.md` for implementation details.

## Configuration

### Prerequisites
- Deployer wallet with testnet ETH
- USDC tokens for testing
- RPC endpoints configured in `.env`

### Post-Deployment
1. Update `.env` with deployed addresses
2. Set up Vincent automation with Nexus SDK
3. Test with small amounts first

## Testing

```bash
# Get testnet USDC
# Visit: https://staging.aave.com/faucet/

# Deposit to vault
cast send $SEPOLIA_VAULT_ADDRESS \
  "deposit(uint256,address)" \
  1000000000 \
  $YOUR_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Verification

```bash
# Verify on Etherscan
forge verify-contract $VAULT_ADDRESS \
  YieldOptimizerUSDC \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Verify on Basescan  
forge verify-contract $VAULT_ADDRESS \
  YieldOptimizerUSDC \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Next Steps

1. **Deploy contracts** on both chains
2. **Install Nexus SDK** - `npm install @avail-project/nexus-core`
3. **Implement Vincent** - See `../NEXUS_INTEGRATION.md`
4. **Test rebalancing** - Start with same-chain first
5. **Monitor and iterate** - Track performance and optimize

## Support

- Contract issues: Review Solidity code in `src/`
- Integration help: See `NEXUS_INTEGRATION.md`
- Nexus SDK: https://docs.availproject.org/nexus/avail-nexus-sdk

## Prerequisites

1. **Foundry** - Make sure you have Foundry installed
2. **Private Key** - Already configured in `.env`
3. **RPC URLs** - Configured for both Sepolia and Base Sepolia
4. **API Keys** - Etherscan and Basescan API keys for contract verification
5. **ETH for Gas** - Ensure you have testnet ETH in your deployer wallet:
   - Ethereum Sepolia: Get from [Sepolia Faucet](https://sepoliafaucet.com/)
   - Base Sepolia: Get from [Base Sepolia Faucet](https://docs.base.org/docs/tools/network-faucets)

