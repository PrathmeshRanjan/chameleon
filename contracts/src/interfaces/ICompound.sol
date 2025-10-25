// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IComet
 * @notice Interface for Compound V3 (Comet) protocol
 */
interface IComet {
    /**
     * @notice Supply an asset to the protocol
     * @param asset The asset to supply
     * @param amount The quantity to supply
     */
    function supply(address asset, uint256 amount) external;

    /**
     * @notice Supply an asset to the protocol on behalf of another address
     * @param to The address to credit the supply
     * @param asset The asset to supply
     * @param amount The quantity to supply
     */
    function supplyTo(address to, address asset, uint256 amount) external;

    /**
     * @notice Withdraw an asset from the protocol
     * @param asset The asset to withdraw
     * @param amount The quantity to withdraw
     */
    function withdraw(address asset, uint256 amount) external;

    /**
     * @notice Withdraw an asset from the protocol to a specific address
     * @param to The address to send withdrawn funds
     * @param asset The asset to withdraw
     * @param amount The quantity to withdraw
     */
    function withdrawTo(address to, address asset, uint256 amount) external;

    /**
     * @notice Get the current balance of base asset for an account
     * @param account The account to query
     * @return The balance of base asset
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Get the current supply rate per second
     * @return The supply rate per second (scaled by 1e18)
     */
    function getSupplyRate(uint256 utilization) external view returns (uint64);

    /**
     * @notice Get utilization rate
     * @return The current utilization
     */
    function getUtilization() external view returns (uint256);

    /**
     * @notice Get the base asset address
     * @return The base asset address
     */
    function baseToken() external view returns (address);
}
