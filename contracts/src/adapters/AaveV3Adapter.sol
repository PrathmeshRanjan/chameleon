// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IProtocolAdapter.sol";
import "../interfaces/IAave.sol";

/**
 * @title AaveV3Adapter
 * @notice Adapter for interacting with Aave V3 lending protocol
 * @dev Implements IProtocolAdapter interface for YieldOptimizer integration
 */
contract AaveV3Adapter is IProtocolAdapter, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice Aave V3 Pool contract
    IAavePool public immutable aavePool;

    /// @notice YieldOptimizer vault that owns this adapter
    address public immutable vault;

    /// @notice Protocol name
    string public constant PROTOCOL_NAME = "Aave V3";

    /// @notice Mapping of asset to aToken
    mapping(address => address) public aTokens;

    // ============ Events ============

    event Deposited(address indexed asset, uint256 amount);
    event Withdrawn(address indexed asset, uint256 amount);
    event ATokenMapped(address indexed asset, address indexed aToken);

    // ============ Modifiers ============

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize Aave V3 adapter
     * @param _aavePool Aave V3 Pool contract address
     * @param _vault YieldOptimizer vault address
     */
    constructor(address _aavePool, address _vault) Ownable(msg.sender) {
        require(_aavePool != address(0), "Invalid pool");
        require(_vault != address(0), "Invalid vault");

        aavePool = IAavePool(_aavePool);
        vault = _vault;
    }

    // ============ Core Functions ============

    /**
     * @notice Deposit assets into Aave V3
     * @param asset Address of the asset to deposit
     * @param amount Amount to deposit
     * @return success Whether deposit succeeded
     */
    function deposit(address asset, uint256 amount)
        external
        override
        onlyVault
        returns (bool success)
    {
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from vault to adapter
        IERC20(asset).safeTransferFrom(vault, address(this), amount);

        // Approve Aave pool
        IERC20(asset).forceApprove(address(aavePool), amount);

        // Supply to Aave on behalf of this adapter
        aavePool.supply(asset, amount, address(this), 0);

        // Cache aToken address if not already mapped
        if (aTokens[asset] == address(0)) {
            IAavePool.ReserveData memory reserveData = aavePool.getReserveData(
                asset
            );
            aTokens[asset] = reserveData.aTokenAddress;
            emit ATokenMapped(asset, reserveData.aTokenAddress);
        }

        emit Deposited(asset, amount);
        return true;
    }

    /**
     * @notice Withdraw assets from Aave V3
     * @param asset Address of the asset to withdraw
     * @param amount Amount to withdraw (max uint256 for full withdrawal)
     * @return success Whether withdrawal succeeded
     */
    function withdraw(address asset, uint256 amount)
        external
        override
        onlyVault
        returns (bool success)
    {
        require(amount > 0, "Amount must be > 0");

        // Withdraw from Aave (sends directly to this contract)
        uint256 withdrawn = aavePool.withdraw(asset, amount, address(this));

        // Transfer to vault
        IERC20(asset).safeTransfer(vault, withdrawn);

        emit Withdrawn(asset, withdrawn);
        return true;
    }

    /**
     * @notice Get current balance in Aave V3
     * @param owner Address of the owner (should be this adapter)
     * @return balance Current balance including accrued interest
     */
    function getBalance(address owner)
        external
        view
        override
        returns (uint256 balance)
    {
        // If owner is not this adapter, return 0
        if (owner != vault) return 0;

        // Return aToken balance (represents supplied balance + interest)
        address aToken = aTokens[owner];
        if (aToken == address(0)) return 0;

        return IAToken(aToken).balanceOf(address(this));
    }

    /**
     * @notice Get current supply APY for asset
     * @param asset Address of the asset
     * @return apy Current APY in basis points
     */
    function getCurrentAPY(address asset)
        external
        view
        override
        returns (uint256 apy)
    {
        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(asset);

        // Convert Aave's liquidity rate (ray format: 27 decimals) to basis points
        // currentLiquidityRate is the annual rate in ray (1e27 = 100%)
        // Convert to basis points: rate * 10000 / 1e27
        uint256 yearlyRate = uint256(reserveData.currentLiquidityRate);

        // Ray to percentage: divide by 1e25 (1e27 / 1e2 for percentage)
        // Then multiply by 100 to get basis points
        apy = (yearlyRate * 10000) / 1e27;

        return apy;
    }

    /**
     * @notice Get protocol name
     * @return name Protocol name
     */
    function getProtocolName()
        external
        pure
        override
        returns (string memory name)
    {
        return PROTOCOL_NAME;
    }

    /**
     * @notice Check if Aave protocol is healthy
     * @return isHealthy Always returns true (would need more complex checks in production)
     */
    function isHealthy() external pure override returns (bool) {
        // In production, would check:
        // - Pool is not paused
        // - Reserve is active
        // - No critical issues
        return true;
    }

    /**
     * @notice Emergency withdraw all assets
     * @param asset Address of the asset
     * @param recipient Address to receive assets
     * @return amount Amount withdrawn
     */
    function emergencyWithdraw(address asset, address recipient)
        external
        override
        onlyOwner
        returns (uint256 amount)
    {
        require(recipient != address(0), "Invalid recipient");

        // Get aToken address
        address aToken = aTokens[asset];
        if (aToken == address(0)) {
            IAavePool.ReserveData memory reserveData = aavePool.getReserveData(
                asset
            );
            aToken = reserveData.aTokenAddress;
        }

        // Get full balance
        uint256 balance = IAToken(aToken).balanceOf(address(this));
        if (balance == 0) return 0;

        // Withdraw all
        amount = aavePool.withdraw(asset, type(uint256).max, recipient);

        return amount;
    }

    // ============ Admin Functions ============

    /**
     * @notice Manually map aToken address for an asset
     * @param asset Asset address
     */
    function updateATokenMapping(address asset) external onlyOwner {
        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(asset);
        require(reserveData.aTokenAddress != address(0), "Invalid reserve");

        aTokens[asset] = reserveData.aTokenAddress;
        emit ATokenMapped(asset, reserveData.aTokenAddress);
    }
}
