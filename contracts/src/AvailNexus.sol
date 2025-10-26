// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AvailNexus
 * @notice Cross-chain bridge and execution contract for Avail Nexus
 * @dev Handles bridging assets between chains and executing calls on destination
 */
contract AvailNexus is Ownable {
    using SafeERC20 for IERC20;

    // ============ Events ============

    event BridgeInitiated(
        uint256 indexed srcChainId,
        uint256 indexed dstChainId,
        address indexed token,
        uint256 amount,
        address destinationContract,
        bytes executeData,
        uint256 bridgeId
    );

    event BridgeCompleted(
        uint256 indexed bridgeId,
        bool success,
        bytes returnData
    );

    // ============ State Variables ============

    /// @notice Bridge ID counter
    uint256 public nextBridgeId = 1;

    /// @notice Supported chains mapping
    mapping(uint256 => bool) public supportedChains;

    /// @notice Bridge operators (can execute cross-chain calls)
    mapping(address => bool) public bridgeOperators;

    /// @notice Bridge fees in basis points (100 = 1%)
    uint256 public bridgeFeeBps = 5; // 0.05%

    /// @notice Treasury address for fees
    address public treasury;

    // ============ Constructor ============

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;

        // Initialize supported chains
        supportedChains[1] = true;     // Ethereum Mainnet
        supportedChains[8453] = true;  // Base Mainnet
        supportedChains[42161] = true; // Arbitrum Mainnet
    }

    // ============ Modifiers ============

    modifier onlyBridgeOperator() {
        require(bridgeOperators[msg.sender] || msg.sender == owner(), "Not bridge operator");
        _;
    }

    modifier supportedChain(uint256 chainId) {
        require(supportedChains[chainId], "Unsupported chain");
        _;
    }

    // ============ Core Bridge Functions ============

    /**
     * @notice Bridge assets and execute call on destination chain
     * @param srcChainId Source chain ID
     * @param dstChainId Destination chain ID
     * @param token Token to bridge
     * @param amount Amount to bridge
     * @param destinationContract Contract to call on destination
     * @param executeData Call data for destination contract
     */
    function bridgeAndExecute(
        uint256 srcChainId,
        uint256 dstChainId,
        address token,
        uint256 amount,
        address destinationContract,
        bytes calldata executeData
    ) external supportedChain(srcChainId) supportedChain(dstChainId) returns (uint256 bridgeId) {
        require(amount > 0, "Invalid amount");
        require(token != address(0), "Invalid token");
        require(destinationContract != address(0), "Invalid destination");

        // Calculate bridge fee
        uint256 fee = (amount * bridgeFeeBps) / 10000;
        uint256 netAmount = amount - fee;

        // Transfer tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Send fee to treasury
        if (fee > 0) {
            IERC20(token).safeTransfer(treasury, fee);
        }

        // Generate bridge ID
        bridgeId = nextBridgeId++;
        emit BridgeInitiated(
            srcChainId,
            dstChainId,
            token,
            netAmount,
            destinationContract,
            executeData,
            bridgeId
        );

        // For same-chain operations, execute immediately
        if (srcChainId == dstChainId) {
            _executeOnDestination(bridgeId, token, netAmount, destinationContract, executeData);
        }
        // For cross-chain, this would integrate with actual bridge protocol
        // For now, we'll simulate cross-chain execution
        else {
            _simulateCrossChainExecution(bridgeId, token, netAmount, destinationContract, executeData);
        }
    }

    /**
     * @notice Execute bridged call (called by bridge operators)
     * @param bridgeId Bridge ID
     * @param token Bridged token
     * @param amount Bridged amount
     * @param destinationContract Contract to call
     * @param executeData Call data
     */
    function executeBridgedCall(
        uint256 bridgeId,
        address token,
        uint256 amount,
        address destinationContract,
        bytes calldata executeData
    ) external onlyBridgeOperator {
        _executeOnDestination(bridgeId, token, amount, destinationContract, executeData);
    }

    // ============ Internal Functions ============

    /**
     * @notice Execute call on destination chain
     */
    function _executeOnDestination(
        uint256 bridgeId,
        address token,
        uint256 amount,
        address destinationContract,
        bytes memory executeData
    ) internal {
        // Approve token spending for destination contract
        IERC20(token).forceApprove(destinationContract, amount);

        // Execute the call
        (bool success, bytes memory returnData) = destinationContract.call(executeData);

        emit BridgeCompleted(bridgeId, success, returnData);

        if (!success) {
            // Revert with the original error
            assembly {
                revert(add(returnData, 32), mload(returnData))
            }
        }
    }

    /**
     * @notice Simulate cross-chain execution (for testing)
     * @dev In production, this would be replaced with actual bridge integration
     */
    function _simulateCrossChainExecution(
        uint256 bridgeId,
        address token,
        uint256 amount,
        address destinationContract,
        bytes memory executeData
    ) internal {
        // For demo purposes, execute immediately
        // In production, this would queue for cross-chain execution
        _executeOnDestination(bridgeId, token, amount, destinationContract, executeData);
    }

    // ============ Admin Functions ============

    /**
     * @notice Add or remove supported chain
     * @param chainId Chain ID
     * @param supported Whether chain is supported
     */
    function setSupportedChain(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
    }

    /**
     * @notice Add or remove bridge operator
     * @param operator Operator address
     * @param isOperator Whether address is operator
     */
    function setBridgeOperator(address operator, bool isOperator) external onlyOwner {
        bridgeOperators[operator] = isOperator;
    }

    /**
     * @notice Update bridge fee
     * @param _feeBps New fee in basis points
     */
    function setBridgeFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        bridgeFeeBps = _feeBps;
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Emergency withdraw tokens
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ============ View Functions ============

    /**
     * @notice Check if chain is supported
     * @param chainId Chain ID to check
     * @return Whether chain is supported
     */
    function isSupportedChain(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    /**
     * @notice Calculate bridge fee for amount
     * @param amount Amount to bridge
     * @return Fee amount
     */
    function calculateBridgeFee(uint256 amount) external view returns (uint256) {
        return (amount * bridgeFeeBps) / 10000;
    }
}