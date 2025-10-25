// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMorpho
 * @notice Interface for Morpho Blue protocol
 */
interface IMorpho {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    struct Market {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    /**
     * @notice Supply assets to a market
     * @param marketParams The market parameters
     * @param assets The amount of assets to supply
     * @param shares The amount of shares to mint
     * @param onBehalf The address that will receive the supply position
     * @param data Additional data for callbacks
     * @return assetsSupplied The amount of assets supplied
     * @return sharesSupplied The amount of shares minted
     */
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    /**
     * @notice Withdraw assets from a market
     * @param marketParams The market parameters
     * @param assets The amount of assets to withdraw
     * @param shares The amount of shares to burn
     * @param onBehalf The address that will pay for the withdrawal
     * @param receiver The address that will receive the assets
     * @return assetsWithdrawn The amount of assets withdrawn
     * @return sharesWithdrawn The amount of shares burned
     */
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /**
     * @notice Get the supply balance of an account in shares
     * @param marketId The market identifier
     * @param user The user address
     * @return The supply balance in shares
     */
    function supplyShares(bytes32 marketId, address user)
        external
        view
        returns (uint256);

    /**
     * @notice Get market data
     * @param marketId The market identifier
     * @return The market data
     */
    function market(bytes32 marketId) external view returns (Market memory);

    /**
     * @notice Get market parameters from market ID
     * @param marketId The market identifier
     * @return The market parameters
     */
    function idToMarketParams(bytes32 marketId)
        external
        view
        returns (MarketParams memory);
}

/**
 * @title IMorphoBlueOracles
 * @notice Interface for Morpho oracle to get APY
 */
interface IMorphoBlueOracles {
    /**
     * @notice Get the borrow rate for a market
     * @param marketParams The market parameters
     * @return The borrow rate per second
     */
    function borrowRate(IMorpho.MarketParams memory marketParams)
        external
        view
        returns (uint256);

    /**
     * @notice Get the supply rate for a market
     * @param marketParams The market parameters  
     * @return The supply rate per second
     */
    function supplyRate(IMorpho.MarketParams memory marketParams)
        external
        view
        returns (uint256);
}
