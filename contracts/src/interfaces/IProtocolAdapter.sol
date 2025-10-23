// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IProtocolAdapter
 * @notice Interface for protocol adapters that interact with external DeFi protocols
 * @dev All adapters must implement this interface for compatibility with YieldOptimizer
 */
interface IProtocolAdapter {
    /**
     * @notice Deposit assets into the underlying protocol
     * @param asset Address of the asset to deposit (e.g., USDC)
     * @param amount Amount of assets to deposit
     * @return success Whether the deposit was successful
     */
    function deposit(address asset, uint256 amount)
        external
        returns (bool success);

    /**
     * @notice Withdraw assets from the underlying protocol
     * @param asset Address of the asset to withdraw
     * @param amount Amount of assets to withdraw
     * @return success Whether the withdrawal was successful
     */
    function withdraw(address asset, uint256 amount)
        external
        returns (bool success);

    /**
     * @notice Get current balance of assets in the protocol
     * @param owner Address of the owner (typically the vault)
     * @return balance Current balance in the protocol
     */
    function getBalance(address owner) external view returns (uint256 balance);

    /**
     * @notice Get current APY of the protocol for given asset
     * @param asset Address of the asset
     * @return apy Current APY in basis points (e.g., 500 = 5%)
     */
    function getCurrentAPY(address asset) external view returns (uint256 apy);

    /**
     * @notice Get protocol name
     * @return name Name of the protocol (e.g., "Aave V3")
     */
    function getProtocolName() external view returns (string memory name);

    /**
     * @notice Check if protocol is healthy/active
     * @return isHealthy Whether the protocol is in a healthy state
     */
    function isHealthy() external view returns (bool isHealthy);

    /**
     * @notice Emergency withdraw all assets
     * @param asset Address of the asset
     * @param recipient Address to receive withdrawn assets
     * @return amount Amount withdrawn
     */
    function emergencyWithdraw(address asset, address recipient)
        external
        returns (uint256 amount);
}
