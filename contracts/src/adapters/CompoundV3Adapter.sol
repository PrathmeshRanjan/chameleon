// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IProtocolAdapter.sol";
import "../interfaces/ICompound.sol";

/**
 * @title CompoundV3Adapter
 * @notice Adapter for interacting with Compound V3 (Comet) protocol
 * @dev Implements IProtocolAdapter interface for YieldOptimizer integration
 */
contract CompoundV3Adapter is IProtocolAdapter, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice Compound V3 Comet contract (e.g., cUSDCv3)
    IComet public immutable comet;

    /// @notice YieldOptimizer vault that owns this adapter
    address public immutable vault;

    /// @notice Protocol name
    string public constant PROTOCOL_NAME = "Compound V3";

    /// @notice Base asset (e.g., USDC)
    address public immutable baseAsset;

    // ============ Events ============

    event Deposited(address indexed asset, uint256 amount);
    event Withdrawn(address indexed asset, uint256 amount);
    event EmergencyWithdrawal(address indexed asset, address indexed recipient, uint256 amount);

    // ============ Modifiers ============

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize Compound V3 adapter
     * @param _comet Compound V3 Comet contract address
     * @param _vault YieldOptimizer vault address
     */
    constructor(address _comet, address _vault) Ownable(msg.sender) {
        require(_comet != address(0), "Invalid comet");
        require(_vault != address(0), "Invalid vault");

        comet = IComet(_comet);
        vault = _vault;
        baseAsset = IComet(_comet).baseToken();
    }

    // ============ Core Functions ============

    /**
     * @notice Deposit assets into Compound V3
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
        require(asset == baseAsset, "Asset not supported");

        // Transfer tokens from vault to adapter
        IERC20(asset).safeTransferFrom(vault, address(this), amount);

        // Approve Comet
        IERC20(asset).forceApprove(address(comet), amount);

        // Supply to Compound
        comet.supply(asset, amount);

        emit Deposited(asset, amount);
        return true;
    }

    /**
     * @notice Withdraw assets from Compound V3
     * @param asset Address of the asset to withdraw
     * @param amount Amount to withdraw
     * @return success Whether withdrawal succeeded
     */
    function withdraw(address asset, uint256 amount)
        external
        override
        onlyVault
        returns (bool success)
    {
        require(amount > 0, "Amount must be > 0");
        require(asset == baseAsset, "Asset not supported");

        // Withdraw from Compound to this adapter
        comet.withdraw(asset, amount);

        // Transfer to vault
        IERC20(asset).safeTransfer(vault, amount);

        emit Withdrawn(asset, amount);
        return true;
    }

    /**
     * @notice Get current balance in Compound V3
     * @param owner Address to check balance for (should be this adapter)
     * @return balance Current balance
     */
    function getBalance(address owner) external view override returns (uint256) {
        // Compound V3 tracks balance per address
        if (owner == address(this)) {
            return comet.balanceOf(address(this));
        }
        return 0;
    }

    /**
     * @notice Get current APY from Compound V3
     * @param asset Asset to get APY for
     * @return apy Current APY in basis points (e.g., 500 = 5%)
     */
    function getCurrentAPY(address asset)
        external
        view
        override
        returns (uint256 apy)
    {
        require(asset == baseAsset, "Asset not supported");

        // Get utilization and supply rate
        uint256 utilization = comet.getUtilization();
        uint64 supplyRatePerSecond = comet.getSupplyRate(utilization);

        // Convert per-second rate to APY
        // APY = (1 + rate)^(seconds per year) - 1
        // Approximation: APY ≈ rate * seconds per year
        // supplyRatePerSecond is scaled by 1e18
        // We want basis points, so multiply by 10000 and divide by 1e18
        uint256 secondsPerYear = 365 * 24 * 60 * 60; // 31,536,000
        apy = (uint256(supplyRatePerSecond) * secondsPerYear * 10000) / 1e18;

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
     * @return protocolType Protocol type (2 for Compound)
     */
    function getProtocolType() external pure returns (uint8) {
        return 2; // 1 = Aave, 2 = Compound, 3 = Morpho, etc.
    }

    /**
     * @notice Check if protocol is healthy/active
     * @return True if protocol is operational
     */
    function isHealthy() external view override returns (bool) {
        // Check if Comet contract is operational by checking if we can read balance
        try comet.balanceOf(address(this)) returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw all assets
     * @param asset Address of the asset
     * @param recipient Address to receive withdrawn assets
     * @return amount Amount withdrawn
     */
    function emergencyWithdraw(address asset, address recipient)
        external
        override
        onlyOwner
        returns (uint256 amount)
    {
        require(asset == baseAsset, "Asset not supported");
        require(recipient != address(0), "Invalid recipient");

        amount = comet.balanceOf(address(this));
        if (amount > 0) {
            comet.withdraw(asset, amount);
            IERC20(asset).safeTransfer(recipient, amount);
        }

        emit EmergencyWithdrawal(asset, recipient, amount);
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
