# Protocol Adapters

This directory contains adapters for integrating various DeFi lending protocols with the YieldOptimizer vault.

## 📋 Available Adapters

### 1. **AaveV3Adapter** ✅

-   **Protocol**: Aave V3
-   **Networks**: Ethereum, Base, Arbitrum, Optimism, Polygon
-   **Features**:
    -   Supply USDC to earn yield
    -   Withdraw on demand
    -   Real-time APY tracking
    -   Automatic aToken mapping

### 2. **CompoundV3Adapter** ✅

-   **Protocol**: Compound V3 (Comet)
-   **Networks**: Ethereum, Base, Arbitrum, Polygon
-   **Features**:
    -   Supply to cUSDCv3 markets
    -   Direct balance tracking
    -   Supply rate calculation
    -   Emergency withdrawal

### 3. **MorphoAdapter** ✅

-   **Protocol**: Morpho Blue
-   **Networks**: Ethereum, Base
-   **Features**:
    -   Supply to Morpho markets
    -   Share-to-asset conversion
    -   Market parameter updates
    -   Utilization-based APY

## 🏗️ Architecture

All adapters implement the `IProtocolAdapter` interface:

```solidity
interface IProtocolAdapter {
    function deposit(address asset, uint256 amount) external returns (bool);
    function withdraw(address asset, uint256 amount) external returns (bool);
    function getBalance(address owner) external view returns (uint256);
    function getCurrentAPY(address asset) external view returns (uint256);
    function getProtocolName() external view returns (string memory);
    function getProtocolType() external pure returns (uint8);
}
```

## 📍 Deployment Addresses

### Ethereum Sepolia (Testnet)

| Protocol    | Adapter Address                              | Protocol Address                             |
| ----------- | -------------------------------------------- | -------------------------------------------- |
| Aave V3     | `0x2643A98BFfd55378C2Fd69A05b673538B3FD1Be3` | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` |
| Compound V3 | TBD                                          | `0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e` |
| Morpho Blue | TBD                                          | TBD                                          |

### Ethereum Mainnet

| Protocol    | Adapter Address | Protocol Address                             |
| ----------- | --------------- | -------------------------------------------- |
| Aave V3     | TBD             | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Compound V3 | TBD             | `0xc3d688B66703497DAA19211EEdff47f25384cdc3` |
| Morpho Blue | TBD             | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |

### Base

| Protocol    | Adapter Address | Protocol Address                             |
| ----------- | --------------- | -------------------------------------------- |
| Aave V3     | TBD             | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| Compound V3 | TBD             | `0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf` |

### Arbitrum

| Protocol    | Adapter Address | Protocol Address                             |
| ----------- | --------------- | -------------------------------------------- |
| Aave V3     | TBD             | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| Compound V3 | TBD             | `0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf` |

## 🚀 Deployment Guide

### 1. Deploy to Sepolia (Testing)

```bash
cd contracts

# Deploy adapters
forge script script/DeployAdapters.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 2. Deploy to Mainnet

Update the deployment script with mainnet addresses:

```solidity
// In DeployAdapters.s.sol, update:
address constant COMPOUND_COMET_MAINNET = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;
address constant MORPHO_BLUE_MAINNET = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
address constant USDC_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
```

Then deploy:

```bash
forge script script/DeployAdapters.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --legacy
```

### 3. Register with Vault

After deployment, the script automatically registers adapters:

```solidity
vault.addProtocol("Compound V3", compoundAdapter, chainId);
vault.addProtocol("Morpho Blue", morphoAdapter, chainId);
```

## 🔍 Testing

### Test Compound Adapter

```bash
# Check balance
cast call ADAPTER_ADDRESS "getBalance(address)(uint256)" YOUR_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# Check APY
cast call ADAPTER_ADDRESS "getCurrentAPY(address)(uint256)" USDC_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# Deposit (from vault)
cast send ADAPTER_ADDRESS "deposit(address,uint256)" USDC_ADDRESS 1000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Test Morpho Adapter

```bash
# Check market ID
cast call ADAPTER_ADDRESS "marketId()(bytes32)" --rpc-url $SEPOLIA_RPC_URL

# Get balance
cast call ADAPTER_ADDRESS "getBalance(address)(uint256)" ADAPTER_ADDRESS --rpc-url $SEPOLIA_RPC_URL
```

## 📊 Protocol Comparison

| Feature   | Aave V3   | Compound V3 | Morpho Blue |
| --------- | --------- | ----------- | ----------- |
| APY Range | 2-8%      | 3-10%       | 4-12%       |
| Gas Cost  | Medium    | Low         | Very Low    |
| Liquidity | Very High | High        | Medium      |
| Maturity  | Mature    | Mature      | New         |
| Risk      | Low       | Low         | Medium      |

## 🛠️ Adding New Protocols

To add a new protocol adapter:

1. Create interface in `src/interfaces/IProtocol.sol`
2. Implement adapter in `src/adapters/ProtocolAdapter.sol`
3. Follow the `IProtocolAdapter` interface
4. Add deployment script
5. Register with vault
6. Test thoroughly

Example structure:

```solidity
contract NewProtocolAdapter is IProtocolAdapter, Ownable {
    using SafeERC20 for IERC20;

    address public immutable vault;
    address public immutable protocolContract;

    function deposit(address asset, uint256 amount) external onlyVault returns (bool) {
        // Implementation
    }

    function withdraw(address asset, uint256 amount) external onlyVault returns (bool) {
        // Implementation
    }

    // ... other functions
}
```

## ⚠️ Important Notes

1. **Morpho Market Parameters**: Update the market params in deployment script with actual values
2. **APY Calculations**: Compound and Morpho APY calculations are approximations. For production, integrate with official APY oracles
3. **Gas Optimization**: All adapters are optimized with `via_ir` compilation
4. **Security**: Emergency withdraw functions are protected by `onlyOwner`
5. **Testing**: Always test on testnet before mainnet deployment

## 🔗 Resources

-   [Aave V3 Docs](https://docs.aave.com/developers/v/3.0/)
-   [Compound V3 Docs](https://docs.compound.finance/)
-   [Morpho Blue Docs](https://docs.morpho.org/)
-   [Contract Addresses](https://github.com/bgd-labs/aave-address-book)
