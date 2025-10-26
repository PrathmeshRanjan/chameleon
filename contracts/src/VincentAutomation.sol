// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./YieldOptimizerUSDC.sol";

/**
 * @title VincentAutomation
 * @notice Automated yield optimization contract controlled by Vincent AI
 * @dev Monitors vaults across multiple chains and executes rebalancing
 */
contract VincentAutomation is Ownable, ReentrancyGuard {

    // ============================================
    // State Variables
    // ============================================

    /// @notice Address authorized to execute Vincent operations (Vincent AI wallet)
    address public vincentExecutor;

    /// @notice Mapping of chain ID to vault address
    mapping(uint256 => address) public vaultsByChain;

    /// @notice Supported chain IDs
    uint256[] public supportedChains;

    /// @notice Minimum APY difference to trigger rebalancing (in basis points)
    uint256 public globalMinAPYDiff = 50; // 0.5%

    /// @notice Maximum gas cost for rebalancing (in USD, scaled by 1e6)
    uint256 public globalMaxGasCost = 10 * 1e6; // $10

    /// @notice Cooldown period between rebalances (in seconds)
    uint256 public rebalanceCooldown = 1 hours;

    /// @notice Last rebalance timestamp per user per chain
    mapping(address => mapping(uint256 => uint256)) public lastRebalance;

    /// @notice Total rebalances executed
    uint256 public totalRebalances;

    /// @notice Total gas saved (in USD, scaled by 1e6)
    uint256 public totalGasSaved;

    /// @notice Total yield gained (in basis points)
    uint256 public totalYieldGained;

    /// @notice Performance tracking per protocol
    struct ProtocolPerformance {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 averageAPY;
        uint256 rebalanceCount;
        bool isActive;
    }

    mapping(uint256 => mapping(uint256 => ProtocolPerformance)) public protocolPerformance; // chainId => protocolId => performance

    // ============================================
    // Events
    // ============================================

    event VincentExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event VaultRegistered(uint256 indexed chainId, address indexed vault);
    event VaultRemoved(uint256 indexed chainId);
    event RebalanceExecuted(
        address indexed user,
        uint256 indexed sourceChain,
        uint256 indexed destChain,
        uint256 sourceProtocol,
        uint256 destProtocol,
        uint256 amount,
        uint256 apyGain,
        uint256 gasCost
    );
    event APYMonitored(
        uint256 indexed chainId,
        uint256 indexed protocolId,
        uint256 apy,
        uint256 timestamp
    );
    event ParametersUpdated(
        uint256 minAPYDiff,
        uint256 maxGasCost,
        uint256 cooldown
    );

    // ============================================
    // Errors
    // ============================================

    error UnauthorizedExecutor();
    error VaultNotRegistered(uint256 chainId);
    error RebalanceCooldownActive(uint256 remainingTime);
    error InsufficientAPYGain(uint256 current, uint256 required);
    error GasCostTooHigh(uint256 cost, uint256 max);
    error InvalidChainId();
    error InvalidVaultAddress();
    error UserGuardrailsViolated();

    // ============================================
    // Modifiers
    // ============================================

    modifier onlyVincentExecutor() {
        if (msg.sender != vincentExecutor && msg.sender != owner()) {
            revert UnauthorizedExecutor();
        }
        _;
    }

    // ============================================
    // Constructor
    // ============================================

    constructor(address _vincentExecutor) Ownable(msg.sender) {
        vincentExecutor = _vincentExecutor;
        emit VincentExecutorUpdated(address(0), _vincentExecutor);
    }

    // ============================================
    // Vincent Executor Functions
    // ============================================

    /**
     * @notice Execute same-chain rebalancing for a user
     * @param chainId Chain ID where vault exists
     * @param user User address to rebalance
     * @param sourceProtocol Source protocol ID
     * @param destProtocol Destination protocol ID
     * @param amount Amount to rebalance
     * @param minAPYGain Minimum APY gain expected (in bps)
     * @param estimatedGasCost Estimated gas cost in USD (scaled by 1e6)
     */
    function executeSameChainRebalance(
        uint256 chainId,
        address user,
        uint256 sourceProtocol,
        uint256 destProtocol,
        uint256 amount,
        uint256 minAPYGain,
        uint256 estimatedGasCost
    ) external onlyVincentExecutor nonReentrant {
        _validateRebalance(chainId, user, minAPYGain, estimatedGasCost);

        address vaultAddress = vaultsByChain[chainId];
        if (vaultAddress == address(0)) revert VaultNotRegistered(chainId);

        YieldOptimizerUSDC vault = YieldOptimizerUSDC(vaultAddress);

        // Get user guardrails
        (uint256 maxSlippage, uint256 gasCeiling, uint256 minAPYDiff, bool autoEnabled) =
            vault.getUserGuardrails(user);

        if (!autoEnabled) revert UserGuardrailsViolated();
        if (minAPYGain < minAPYDiff) revert InsufficientAPYGain(minAPYGain, minAPYDiff);
        if (estimatedGasCost > gasCeiling) revert GasCostTooHigh(estimatedGasCost, gasCeiling);

        // Execute rebalance
        YieldOptimizerUSDC.RebalanceParams memory params = YieldOptimizerUSDC.RebalanceParams({
            user: user,
            fromProtocol: uint8(sourceProtocol),
            toProtocol: uint8(destProtocol),
            amount: amount,
            srcChainId: chainId,
            dstChainId: chainId,
            expectedAPYGain: minAPYGain,
            estimatedGasCostUSD: estimatedGasCost
        });

        vault.executeRebalance(params);

        // Update tracking
        lastRebalance[user][chainId] = block.timestamp;
        totalRebalances++;
        totalYieldGained += minAPYGain;

        // Update protocol performance
        protocolPerformance[chainId][sourceProtocol].totalWithdrawn += amount;
        protocolPerformance[chainId][destProtocol].totalDeposited += amount;
        protocolPerformance[chainId][destProtocol].rebalanceCount++;

        emit RebalanceExecuted(
            user,
            chainId,
            chainId,
            sourceProtocol,
            destProtocol,
            amount,
            minAPYGain,
            estimatedGasCost
        );
    }

    /**
     * @notice Execute cross-chain rebalancing for a user
     * @param sourceChainId Source chain ID
     * @param destChainId Destination chain ID
     * @param user User address to rebalance
     * @param sourceProtocol Source protocol ID
     * @param destProtocol Destination protocol ID
     * @param amount Amount to rebalance
     * @param minAPYGain Minimum APY gain expected (in bps)
     * @param estimatedGasCost Estimated gas cost in USD (scaled by 1e6)
     * @param destVaultAdapter Destination vault adapter address
     */
    function executeCrossChainRebalance(
        uint256 sourceChainId,
        uint256 destChainId,
        address user,
        uint256 sourceProtocol,
        uint256 destProtocol,
        uint256 amount,
        uint256 minAPYGain,
        uint256 estimatedGasCost,
        address destVaultAdapter
    ) external onlyVincentExecutor nonReentrant {
        _validateRebalance(sourceChainId, user, minAPYGain, estimatedGasCost);

        address sourceVaultAddress = vaultsByChain[sourceChainId];
        if (sourceVaultAddress == address(0)) revert VaultNotRegistered(sourceChainId);
        if (vaultsByChain[destChainId] == address(0)) revert VaultNotRegistered(destChainId);

        YieldOptimizerUSDC sourceVault = YieldOptimizerUSDC(sourceVaultAddress);

        // Get user guardrails
        (uint256 maxSlippage, uint256 gasCeiling, uint256 minAPYDiff, bool autoEnabled) =
            sourceVault.getUserGuardrails(user);

        if (!autoEnabled) revert UserGuardrailsViolated();
        if (minAPYGain < minAPYDiff) revert InsufficientAPYGain(minAPYGain, minAPYDiff);
        if (estimatedGasCost > gasCeiling) revert GasCostTooHigh(estimatedGasCost, gasCeiling);

        // Execute cross-chain rebalance
        YieldOptimizerUSDC.RebalanceParams memory params = YieldOptimizerUSDC.RebalanceParams({
            user: user,
            fromProtocol: uint8(sourceProtocol),
            toProtocol: uint8(destProtocol),
            amount: amount,
            srcChainId: sourceChainId,
            dstChainId: destChainId,
            expectedAPYGain: minAPYGain,
            estimatedGasCostUSD: estimatedGasCost
        });

        sourceVault.executeRebalance(params);

        // Update tracking
        lastRebalance[user][sourceChainId] = block.timestamp;
        totalRebalances++;
        totalYieldGained += minAPYGain;

        // Update protocol performance
        protocolPerformance[sourceChainId][sourceProtocol].totalWithdrawn += amount;
        protocolPerformance[destChainId][destProtocol].totalDeposited += amount;
        protocolPerformance[destChainId][destProtocol].rebalanceCount++;

        emit RebalanceExecuted(
            user,
            sourceChainId,
            destChainId,
            sourceProtocol,
            destProtocol,
            amount,
            minAPYGain,
            estimatedGasCost
        );
    }

    /**
     * @notice Monitor and record APY for a protocol
     * @param chainId Chain ID
     * @param protocolId Protocol ID
     * @param apy Current APY in basis points
     */
    function recordAPY(
        uint256 chainId,
        uint256 protocolId,
        uint256 apy
    ) external onlyVincentExecutor {
        if (vaultsByChain[chainId] == address(0)) revert VaultNotRegistered(chainId);

        // Update rolling average APY
        ProtocolPerformance storage perf = protocolPerformance[chainId][protocolId];
        if (perf.averageAPY == 0) {
            perf.averageAPY = apy;
        } else {
            // Simple moving average
            perf.averageAPY = (perf.averageAPY * 9 + apy) / 10;
        }
        perf.isActive = true;

        emit APYMonitored(chainId, protocolId, apy, block.timestamp);
    }

    // ============================================
    // View Functions
    // ============================================

    /**
     * @notice Check if rebalancing is allowed for a user
     * @param user User address
     * @param chainId Chain ID
     * @return allowed True if rebalancing is allowed
     * @return timeRemaining Time remaining in cooldown
     */
    function canRebalance(address user, uint256 chainId)
        external
        view
        returns (bool allowed, uint256 timeRemaining)
    {
        uint256 lastRebalanceTime = lastRebalance[user][chainId];
        if (lastRebalanceTime == 0) {
            return (true, 0);
        }

        uint256 timeSinceLastRebalance = block.timestamp - lastRebalanceTime;
        if (timeSinceLastRebalance >= rebalanceCooldown) {
            return (true, 0);
        }

        return (false, rebalanceCooldown - timeSinceLastRebalance);
    }

    /**
     * @notice Get all supported chain IDs
     * @return Array of chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }

    /**
     * @notice Get protocol performance data
     * @param chainId Chain ID
     * @param protocolId Protocol ID
     * @return performance Protocol performance struct
     */
    function getProtocolPerformance(uint256 chainId, uint256 protocolId)
        external
        view
        returns (ProtocolPerformance memory performance)
    {
        return protocolPerformance[chainId][protocolId];
    }

    /**
     * @notice Calculate potential yield gain from rebalancing
     * @param currentAPY Current APY in basis points
     * @param newAPY New APY in basis points
     * @param amount Amount to rebalance
     * @param durationDays Expected duration in days
     * @return yieldGain Expected yield gain in USDC (6 decimals)
     */
    function calculateYieldGain(
        uint256 currentAPY,
        uint256 newAPY,
        uint256 amount,
        uint256 durationDays
    ) external pure returns (uint256 yieldGain) {
        if (newAPY <= currentAPY) return 0;

        uint256 apyDiff = newAPY - currentAPY;
        // yieldGain = amount * apyDiff * durationDays / (10000 * 365)
        yieldGain = (amount * apyDiff * durationDays) / (10000 * 365);

        return yieldGain;
    }

    /**
     * @notice Check if rebalancing is profitable after gas costs
     * @param yieldGain Expected yield gain in USDC (6 decimals)
     * @param gasCost Gas cost in USD (scaled by 1e6)
     * @param minProfitThreshold Minimum profit threshold (scaled by 1e6)
     * @return profitable True if profitable
     * @return netProfit Net profit after gas costs
     */
    function isProfitable(
        uint256 yieldGain,
        uint256 gasCost,
        uint256 minProfitThreshold
    ) external pure returns (bool profitable, uint256 netProfit) {
        if (yieldGain <= gasCost) {
            return (false, 0);
        }

        netProfit = yieldGain - gasCost;
        profitable = netProfit >= minProfitThreshold;

        return (profitable, netProfit);
    }

    // ============================================
    // Admin Functions
    // ============================================

    /**
     * @notice Register a vault for a specific chain
     * @param chainId Chain ID
     * @param vaultAddress Vault contract address
     */
    function registerVault(uint256 chainId, address vaultAddress) external onlyOwner {
        if (chainId == 0) revert InvalidChainId();
        if (vaultAddress == address(0)) revert InvalidVaultAddress();

        // Add to supported chains if not already present
        bool chainExists = false;
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == chainId) {
                chainExists = true;
                break;
            }
        }

        if (!chainExists) {
            supportedChains.push(chainId);
        }

        vaultsByChain[chainId] = vaultAddress;
        emit VaultRegistered(chainId, vaultAddress);
    }

    /**
     * @notice Remove a vault from a specific chain
     * @param chainId Chain ID
     */
    function removeVault(uint256 chainId) external onlyOwner {
        delete vaultsByChain[chainId];

        // Remove from supported chains
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == chainId) {
                supportedChains[i] = supportedChains[supportedChains.length - 1];
                supportedChains.pop();
                break;
            }
        }

        emit VaultRemoved(chainId);
    }

    /**
     * @notice Update Vincent executor address
     * @param newExecutor New executor address
     */
    function setVincentExecutor(address newExecutor) external onlyOwner {
        if (newExecutor == address(0)) revert InvalidVaultAddress();
        address oldExecutor = vincentExecutor;
        vincentExecutor = newExecutor;
        emit VincentExecutorUpdated(oldExecutor, newExecutor);
    }

    /**
     * @notice Update global rebalancing parameters
     * @param _minAPYDiff Minimum APY difference (in bps)
     * @param _maxGasCost Maximum gas cost (in USD, scaled by 1e6)
     * @param _cooldown Cooldown period (in seconds)
     */
    function updateParameters(
        uint256 _minAPYDiff,
        uint256 _maxGasCost,
        uint256 _cooldown
    ) external onlyOwner {
        globalMinAPYDiff = _minAPYDiff;
        globalMaxGasCost = _maxGasCost;
        rebalanceCooldown = _cooldown;

        emit ParametersUpdated(_minAPYDiff, _maxGasCost, _cooldown);
    }

    // ============================================
    // Internal Functions
    // ============================================

    /**
     * @notice Validate rebalance conditions
     */
    function _validateRebalance(
        uint256 chainId,
        address user,
        uint256 minAPYGain,
        uint256 estimatedGasCost
    ) internal view {
        if (vaultsByChain[chainId] == address(0)) revert VaultNotRegistered(chainId);

        // Check cooldown
        (bool allowed, uint256 timeRemaining) = this.canRebalance(user, chainId);
        if (!allowed) revert RebalanceCooldownActive(timeRemaining);

        // Check global parameters
        if (minAPYGain < globalMinAPYDiff) {
            revert InsufficientAPYGain(minAPYGain, globalMinAPYDiff);
        }

        if (estimatedGasCost > globalMaxGasCost) {
            revert GasCostTooHigh(estimatedGasCost, globalMaxGasCost);
        }
    }
}
