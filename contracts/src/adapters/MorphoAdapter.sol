// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IProtocolAdapter.sol";
import "../interfaces/IMorpho.sol";

/**
 * @title MorphoAdapter
 * @notice Adapter for interacting with Morpho Blue protocol
 * @dev Implements IProtocolAdapter interface for YieldOptimizer integration
 */
contract MorphoAdapter is IProtocolAdapter, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice Morpho Blue contract
    IMorpho public immutable morpho;

    /// @notice YieldOptimizer vault that owns this adapter
    address public immutable vault;

    /// @notice Protocol name
    string public constant PROTOCOL_NAME = "Morpho Blue";

    /// @notice Market parameters for USDC supply-only market
    IMorpho.MarketParams public marketParams;

    /// @notice Market ID (hash of market params)
    bytes32 public marketId;

    /// @notice Supported asset (USDC)
    address public immutable asset;

    // ============ Events ============

    event Deposited(address indexed asset, uint256 amount);
    event Withdrawn(address indexed asset, uint256 amount);
    event MarketUpdated(bytes32 indexed marketId);
    event EmergencyWithdrawal(address indexed asset, address indexed recipient, uint256 amount);

    // ============ Modifiers ============

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize Morpho adapter
     * @param _morpho Morpho Blue contract address
     * @param _vault YieldOptimizer vault address
     * @param _asset Asset address (e.g., USDC)
     * @param _marketParams Initial market parameters
     */
    constructor(
        address _morpho,
        address _vault,
        address _asset,
        IMorpho.MarketParams memory _marketParams
    ) Ownable(msg.sender) {
        require(_morpho != address(0), "Invalid morpho");
        require(_vault != address(0), "Invalid vault");
        require(_asset != address(0), "Invalid asset");

        morpho = IMorpho(_morpho);
        vault = _vault;
        asset = _asset;
        marketParams = _marketParams;

        // Compute market ID
        marketId = keccak256(abi.encode(_marketParams));
    }

    // ============ Core Functions ============

    /**
     * @notice Deposit assets into Morpho Blue
     * @param _asset Address of the asset to deposit
     * @param amount Amount to deposit
     * @return success Whether deposit succeeded
     */
    function deposit(address _asset, uint256 amount)
        external
        override
        onlyVault
        returns (bool success)
    {
        require(amount > 0, "Amount must be > 0");
        require(_asset == asset, "Asset not supported");

        // Transfer tokens from vault to adapter
        IERC20(_asset).safeTransferFrom(vault, address(this), amount);

        // Approve Morpho
        IERC20(_asset).forceApprove(address(morpho), amount);

        // Supply to Morpho (shares = 0 means supply assets, not shares)
        morpho.supply(marketParams, amount, 0, address(this), "");

        emit Deposited(_asset, amount);
        return true;
    }

    /**
     * @notice Withdraw assets from Morpho Blue
     * @param _asset Address of the asset to withdraw
     * @param amount Amount to withdraw
     * @return success Whether withdrawal succeeded
     */
    function withdraw(address _asset, uint256 amount)
        external
        override
        onlyVault
        returns (bool success)
    {
        require(amount > 0, "Amount must be > 0");
        require(_asset == asset, "Asset not supported");

        // Withdraw from Morpho (shares = 0 means withdraw assets, not shares)
        morpho.withdraw(marketParams, amount, 0, address(this), vault);

        emit Withdrawn(_asset, amount);
        return true;
    }

    /**
     * @notice Get current balance in Morpho Blue
     * @param owner Address to check balance for (should be this adapter)
     * @return balance Current balance in assets
     */
    function getBalance(address owner) external view override returns (uint256) {
        if (owner != address(this)) {
            return 0;
        }

        // Get shares
        uint256 shares = morpho.supplyShares(marketId, address(this));
        if (shares == 0) {
            return 0;
        }

        // Convert shares to assets
        IMorpho.Market memory marketData = morpho.market(marketId);
        
        // assets = shares * totalSupplyAssets / totalSupplyShares
        if (marketData.totalSupplyShares == 0) {
            return 0;
        }

        return (shares * marketData.totalSupplyAssets) / marketData.totalSupplyShares;
    }

    /**
     * @notice Get current APY from Morpho Blue
     * @param _asset Asset to get APY for
     * @return apy Current APY in basis points (e.g., 500 = 5%)
     */
    function getCurrentAPY(address _asset)
        external
        view
        override
        returns (uint256 apy)
    {
        require(_asset == asset, "Asset not supported");

        // Get market data
        IMorpho.Market memory marketData = morpho.market(marketId);

        // Calculate utilization
        uint256 totalBorrow = marketData.totalBorrowAssets;
        uint256 totalSupply = marketData.totalSupplyAssets;

        if (totalSupply == 0) {
            return 0;
        }

        uint256 utilization = (totalBorrow * 1e18) / totalSupply;

        // Estimate supply rate based on utilization
        // This is a simplified calculation - in production, you'd query the IRM contract
        // Supply APY ≈ Borrow APY * Utilization * (1 - fee)
        
        // For simplicity, assume a base rate model
        // Supply rate ≈ 2% + (utilization * 8%)
        uint256 baseRate = 200; // 2% in bps
        uint256 utilizationRate = (utilization * 800) / 1e18; // Scale to bps
        
        apy = baseRate + utilizationRate;

        return apy;
    }

    /**
     * @notice Get protocol name
     * @return name Protocol name
     */
    function getProtocolName() external pure override returns (string memory) {
        return PROTOCOL_NAME;
    }

    /**
     * @notice Get protocol type identifier
     * @return protocolType Protocol type (3 for Morpho)
     */
    function getProtocolType() external pure returns (uint8) {
        return 3; // 1 = Aave, 2 = Compound, 3 = Morpho
    }

    /**
     * @notice Check if protocol is healthy/active
     * @return True if protocol is operational
     */
    function isHealthy() external view override returns (bool) {
        // Check if Morpho contract is operational by checking if we can read supply shares
        try morpho.supplyShares(marketId, address(this)) returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Update market parameters (owner only)
     * @param _marketParams New market parameters
     */
    function updateMarketParams(IMorpho.MarketParams memory _marketParams)
        external
        onlyOwner
    {
        marketParams = _marketParams;
        marketId = keccak256(abi.encode(_marketParams));
        emit MarketUpdated(marketId);
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw all assets
     * @param assetToWithdraw Address of the asset to withdraw
     * @param recipient Address to receive withdrawn assets
     * @return amount Amount withdrawn
     */
    function emergencyWithdraw(address assetToWithdraw, address recipient)
        external
        override
        onlyOwner
        returns (uint256 amount)
    {
        require(assetToWithdraw == marketParams.loanToken, "Asset not supported");
        require(recipient != address(0), "Invalid recipient");

        uint256 shares = morpho.supplyShares(marketId, address(this));
        if (shares > 0) {
            // Withdraw all shares to recipient
            (amount,) = morpho.withdraw(marketParams, 0, shares, address(this), recipient);
        }

        emit EmergencyWithdrawal(assetToWithdraw, recipient, amount);
    }

    /**
     * @notice Recover ERC20 tokens sent to this contract by mistake
     * @param token Token to recover
     * @param amount Amount to recover
     */
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
