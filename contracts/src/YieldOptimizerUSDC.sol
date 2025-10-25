// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title YieldOptimizerUSDC
 * @notice ERC4626 vault that automatically optimizes USDC yields across DeFi protocols and chains
 * @dev Integrates with Avail Nexus for cross-chain operations and supports automated rebalancing
 */
contract YieldOptimizerUSDC is ERC4626, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice User-defined safety guardrails for automated rebalancing
    struct UserGuardrails {
        uint256 maxSlippageBps;        // Maximum allowed slippage in basis points (100 = 1%)
        uint256 gasCeilingUSD;         // Maximum gas cost user is willing to pay in USD
        uint256 minAPYDiffBps;         // Minimum APY difference to trigger rebalance (basis points)
        bool autoRebalanceEnabled;     // Toggle for automated rebalancing
        uint64 lastUpdated;            // Timestamp of last guardrails update
    }

    /// @notice Protocol adapter information
    struct ProtocolAdapter {
        address adapterAddress;        // Address of the protocol adapter contract
        string name;                   // Protocol name (e.g., "Aave V3")
        uint8 chainId;                 // Chain where protocol is deployed
        bool isActive;                 // Whether protocol is active
        uint64 addedAt;                // Timestamp when protocol was added
    }

    /// @notice User position tracking for analytics
    struct UserMetadata {
        uint256 totalDeposited;        // Cumulative deposits (for tracking, not accounting)
        uint256 totalWithdrawn;        // Cumulative withdrawals
        uint64 firstDepositTime;       // First deposit timestamp
        uint64 lastActionTime;         // Last deposit/withdrawal timestamp
        uint8 currentProtocol;         // Current protocol allocation (primary)
    }

    /// @notice Rebalancing parameters
    struct RebalanceParams {
        address user;                  // User whose position is being rebalanced
        uint8 fromProtocol;            // Source protocol ID
        uint8 toProtocol;              // Destination protocol ID
        uint256 amount;                // Amount to rebalance
        uint256 srcChainId;            // Source chain ID
        uint256 dstChainId;            // Destination chain ID
        uint256 expectedAPYGain;       // Expected APY improvement (bps)
        uint256 estimatedGasCostUSD;   // Estimated gas cost
    }

    // ============ Storage ============

    /// @notice Mapping of user addresses to their guardrails
    mapping(address => UserGuardrails) public userGuardrails;

    /// @notice Mapping of user addresses to their metadata
    mapping(address => UserMetadata) public userMetadata;

    /// @notice Mapping of protocol IDs to their adapters
    mapping(uint8 => ProtocolAdapter) public protocolAdapters;

    /// @notice Avail Nexus contract for cross-chain operations
    address public nexusContract;

    /// @notice Vincent automation contract address
    address public vincentAutomation;

    /// @notice Performance fee in basis points (e.g., 1000 = 10%)
    uint256 public performanceFeeBps = 1000;

    /// @notice Management fee in basis points per year (e.g., 200 = 2%)
    uint256 public managementFeeBps = 200;

    /// @notice Treasury address for collecting fees
    address public treasury;

    /// @notice Total number of registered protocols
    uint8 public protocolCount;

    /// @notice Accumulated fees not yet claimed
    uint256 public accruedFees;

    /// @notice Last time management fees were calculated
    uint64 public lastFeeCalculation;

    /// @notice Emergency pause flag
    bool public paused;

    // ============ Events ============

    event Deposited(
        address indexed user,
        uint256 assets,
        uint256 shares,
        uint256 timestamp
    );

    event Withdrawn(
        address indexed user,
        uint256 assets,
        uint256 shares,
        uint256 timestamp
    );

    event Rebalanced(
        address indexed user,
        uint8 fromProtocol,
        uint8 toProtocol,
        uint256 amount,
        uint256 srcChain,
        uint256 dstChain,
        uint256 apyGain
    );

    event GuardrailsUpdated(
        address indexed user,
        uint256 maxSlippageBps,
        uint256 gasCeilingUSD,
        uint256 minAPYDiffBps,
        bool autoRebalanceEnabled
    );

    event ProtocolAdded(
        uint8 indexed protocolId,
        string name,
        address adapterAddress,
        uint8 chainId
    );

    event ProtocolStatusChanged(
        uint8 indexed protocolId,
        bool isActive
    );

    event FeesCollected(
        uint256 performanceFees,
        uint256 managementFees,
        address treasury
    );

    event EmergencyPaused(bool isPaused);

    // ============ Modifiers ============

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyVincent() {
        require(msg.sender == vincentAutomation, "Only Vincent automation");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the yield optimizer vault
     * @param _usdc USDC token address
     * @param _treasury Treasury address for fees
     * @param _nexus Avail Nexus contract address (can be updated later via setNexusContract)
     */
    constructor(
        IERC20 _usdc,
        address _treasury,
        address _nexus
    ) ERC4626(_usdc) ERC20("Smart Yield USDC", "syUSDC") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_nexus != address(0), "Invalid nexus");
        
        treasury = _treasury;
        nexusContract = _nexus;
        lastFeeCalculation = uint64(block.timestamp);
    }

    // ============ Core Vault Functions ============

    /**
     * @notice Deposit USDC and receive syUSDC shares
     * @param assets Amount of USDC to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of syUSDC shares minted
     */
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        require(assets > 0, "Cannot deposit 0");
        
        // Calculate and accrue management fees before deposit
        _accrueManagementFees();
        
        // Execute ERC4626 deposit
        shares = super.deposit(assets, receiver);
        
        // Initialize default guardrails for first-time depositors
        if (userGuardrails[receiver].lastUpdated == 0) {
            _setDefaultGuardrails(receiver);
        }
        
        // Update user metadata
        UserMetadata storage metadata = userMetadata[receiver];
        metadata.totalDeposited += assets;
        metadata.lastActionTime = uint64(block.timestamp);
        
        if (metadata.firstDepositTime == 0) {
            metadata.firstDepositTime = uint64(block.timestamp);
        }
        
        emit Deposited(receiver, assets, shares, block.timestamp);
        
        return shares;
    }

    /**
     * @notice Withdraw USDC by burning syUSDC shares
     * @param assets Amount of USDC to withdraw
     * @param receiver Address to receive USDC
     * @param owner Address that owns the shares
     * @return shares Amount of syUSDC shares burned
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant whenNotPaused returns (uint256 shares) {
        require(assets > 0, "Cannot withdraw 0");
        
        // Calculate and accrue fees before withdrawal
        _accrueManagementFees();
        
        // Execute ERC4626 withdrawal
        shares = super.withdraw(assets, receiver, owner);
        
        // Update user metadata
        UserMetadata storage metadata = userMetadata[owner];
        metadata.totalWithdrawn += assets;
        metadata.lastActionTime = uint64(block.timestamp);
        
        emit Withdrawn(owner, assets, shares, block.timestamp);
        
        return shares;
    }

    /**
     * @notice Redeem syUSDC shares for USDC
     * @param shares Amount of syUSDC shares to burn
     * @param receiver Address to receive USDC
     * @param owner Address that owns the shares
     * @return assets Amount of USDC received
     */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override nonReentrant whenNotPaused returns (uint256 assets) {
        require(shares > 0, "Cannot redeem 0");
        
        // Calculate and accrue fees before redemption
        _accrueManagementFees();
        
        // Execute ERC4626 redemption
        assets = super.redeem(shares, receiver, owner);
        
        // Update user metadata
        UserMetadata storage metadata = userMetadata[owner];
        metadata.totalWithdrawn += assets;
        metadata.lastActionTime = uint64(block.timestamp);
        
        emit Withdrawn(owner, assets, shares, block.timestamp);
        
        return assets;
    }

    // ============ Yield Optimization Functions ============

    /**
     * @notice Calculate total assets under management (idle + deployed)
     * @return Total USDC value including yields, net of fees
     */
    function totalAssets() public view override returns (uint256) {
        uint256 idleBalance = IERC20(asset()).balanceOf(address(this));
        uint256 deployedBalance = _getDeployedBalance();
        uint256 pendingFees = _calculatePendingFees();
        
        uint256 grossAssets = idleBalance + deployedBalance;
        
        // Return net assets after fees
        return grossAssets > pendingFees ? grossAssets - pendingFees : 0;
    }

    /**
     * @notice Execute rebalancing to move funds between protocols
     * @param params Rebalancing parameters
     * @dev Can only be called by Vincent automation or owner
     */
    function executeRebalance(RebalanceParams calldata params)
        external
        onlyVincent
        nonReentrant
        whenNotPaused
    {
        // Validate rebalance parameters
        require(params.amount > 0, "Amount must be > 0");
        require(
            protocolAdapters[params.fromProtocol].isActive ||
                params.fromProtocol == 0, // 0 = vault idle balance
            "Source protocol inactive"
        );
        require(
            protocolAdapters[params.toProtocol].isActive,
            "Destination protocol inactive"
        );
        
        // Validate against user guardrails
        _validateGuardrails(params);
        
        // Execute the rebalance
        if (params.srcChainId == params.dstChainId) {
            // Same-chain rebalance
            _rebalanceSameChain(params);
        } else {
            // Cross-chain rebalance via Avail Nexus
            _rebalanceCrossChain(params);
        }
        
        // Update user metadata
        userMetadata[params.user].currentProtocol = params.toProtocol;
        userMetadata[params.user].lastActionTime = uint64(block.timestamp);
        
        emit Rebalanced(
            params.user,
            params.fromProtocol,
            params.toProtocol,
            params.amount,
            params.srcChainId,
            params.dstChainId,
            params.expectedAPYGain
        );
    }

    // ============ Guardrails Management ============

    /**
     * @notice Update user's safety guardrails
     * @param maxSlippageBps Maximum slippage tolerance (basis points)
     * @param gasCeilingUSD Maximum gas cost in USD
     * @param minAPYDiffBps Minimum APY difference to trigger rebalance
     * @param autoRebalanceEnabled Enable/disable auto-rebalancing
     */
    function updateGuardrails(
        uint256 maxSlippageBps,
        uint256 gasCeilingUSD,
        uint256 minAPYDiffBps,
        bool autoRebalanceEnabled
    ) external {
        require(maxSlippageBps <= 1000, "Slippage too high"); // Max 10%
        require(gasCeilingUSD <= 100, "Gas ceiling too high"); // Max $100
        require(minAPYDiffBps <= 10000, "APY diff too high"); // Max 100%
        
        userGuardrails[msg.sender] = UserGuardrails({
            maxSlippageBps: maxSlippageBps,
            gasCeilingUSD: gasCeilingUSD,
            minAPYDiffBps: minAPYDiffBps,
            autoRebalanceEnabled: autoRebalanceEnabled,
            lastUpdated: uint64(block.timestamp)
        });
        
        emit GuardrailsUpdated(
            msg.sender,
            maxSlippageBps,
            gasCeilingUSD,
            minAPYDiffBps,
            autoRebalanceEnabled
        );
    }

    /**
     * @notice Get user's guardrails
     * @param user User address
     * @return User's guardrails configuration
     */
    function getUserGuardrails(address user)
        external
        view
        returns (UserGuardrails memory)
    {
        return userGuardrails[user];
    }

    // ============ Protocol Management ============

    /**
     * @notice Add a new protocol adapter
     * @param name Protocol name
     * @param adapterAddress Address of the adapter contract
     * @param chainId Chain ID where protocol is deployed
     */
    function addProtocol(
        string calldata name,
        address adapterAddress,
        uint8 chainId
    ) external onlyOwner {
        require(adapterAddress != address(0), "Invalid adapter");
        require(bytes(name).length > 0, "Invalid name");
        require(protocolCount < 255, "Max protocols reached");
        
        protocolAdapters[protocolCount] = ProtocolAdapter({
            adapterAddress: adapterAddress,
            name: name,
            chainId: chainId,
            isActive: true,
            addedAt: uint64(block.timestamp)
        });
        
        emit ProtocolAdded(protocolCount, name, adapterAddress, chainId);
        protocolCount++;
    }

    /**
     * @notice Enable or disable a protocol
     * @param protocolId Protocol ID to update
     * @param isActive New active status
     */
    function setProtocolStatus(uint8 protocolId, bool isActive)
        external
        onlyOwner
    {
        require(protocolId < protocolCount, "Invalid protocol ID");
        protocolAdapters[protocolId].isActive = isActive;
        
        emit ProtocolStatusChanged(protocolId, isActive);
    }

    /**
     * @notice Get all active protocols
     * @return Array of active protocol adapters
     */
    function getActiveProtocols()
        external
        view
        returns (ProtocolAdapter[] memory)
    {
        // Count active protocols
        uint8 activeCount = 0;
        for (uint8 i = 0; i < protocolCount; i++) {
            if (protocolAdapters[i].isActive) {
                activeCount++;
            }
        }
        
        // Build array of active protocols
        ProtocolAdapter[] memory active = new ProtocolAdapter[](activeCount);
        uint8 index = 0;
        for (uint8 i = 0; i < protocolCount; i++) {
            if (protocolAdapters[i].isActive) {
                active[index] = protocolAdapters[i];
                index++;
            }
        }
        
        return active;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update Vincent automation address
     * @param _vincent New Vincent address
     */
    function setVincentAutomation(address _vincent) external onlyOwner {
        require(_vincent != address(0), "Invalid address");
        vincentAutomation = _vincent;
    }

    /**
     * @notice Update Nexus contract address
     * @param _nexus New Nexus address
     */
    function setNexusContract(address _nexus) external onlyOwner {
        require(_nexus != address(0), "Invalid address");
        nexusContract = _nexus;
    }

    /**
     * @notice Update performance fee
     * @param _feeBps New fee in basis points
     */
    function setPerformanceFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 2000, "Fee too high"); // Max 20%
        performanceFeeBps = _feeBps;
    }

    /**
     * @notice Update management fee
     * @param _feeBps New fee in basis points per year
     */
    function setManagementFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Fee too high"); // Max 5%
        
        // Accrue fees before changing rate
        _accrueManagementFees();
        managementFeeBps = _feeBps;
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }

    /**
     * @notice Collect accrued fees
     */
    function collectFees() external nonReentrant {
        _accrueManagementFees();
        
        uint256 fees = accruedFees;
        require(fees > 0, "No fees to collect");
        
        accruedFees = 0;
        IERC20(asset()).safeTransfer(treasury, fees);
        
        emit FeesCollected(0, fees, treasury);
    }

    /**
     * @notice Emergency pause/unpause
     * @param _paused Pause status
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPaused(_paused);
    }

    // ============ Internal Functions ============

    /**
     * @notice Set default guardrails for new users
     * @param user User address
     */
    function _setDefaultGuardrails(address user) internal {
        userGuardrails[user] = UserGuardrails({
            maxSlippageBps: 100,           // 1% default
            gasCeilingUSD: 5,              // $5 max gas
            minAPYDiffBps: 50,             // 0.5% min APY difference
            autoRebalanceEnabled: true,    // Auto-rebalance on by default
            lastUpdated: uint64(block.timestamp)
        });
    }

    /**
     * @notice Validate rebalance parameters against user guardrails
     * @param params Rebalance parameters
     */
    function _validateGuardrails(RebalanceParams calldata params)
        internal
        view
    {
        UserGuardrails memory guardrails = userGuardrails[params.user];
        
        require(guardrails.autoRebalanceEnabled, "Auto-rebalance disabled");
        require(
            params.estimatedGasCostUSD <= guardrails.gasCeilingUSD,
            "Gas cost exceeds ceiling"
        );
        require(
            params.expectedAPYGain >= guardrails.minAPYDiffBps,
            "APY gain below minimum"
        );
    }

    /**
     * @notice Execute same-chain rebalancing
     * @param params Rebalance parameters
     */
    function _rebalanceSameChain(RebalanceParams calldata params) internal {
        // Withdraw from source protocol (or use vault balance if fromProtocol = 0)
        if (params.fromProtocol > 0) {
            address sourceAdapter = protocolAdapters[params.fromProtocol]
                .adapterAddress;
            
            // Call adapter's withdraw function
            (bool withdrawSuccess, ) = sourceAdapter.call(
                abi.encodeWithSignature(
                    "withdraw(address,uint256)",
                    asset(),
                    params.amount
                )
            );
            require(withdrawSuccess, "Withdraw failed");
        }
        
        // Deposit to destination protocol
        address destAdapter = protocolAdapters[params.toProtocol]
            .adapterAddress;
        
        IERC20(asset()).forceApprove(destAdapter, params.amount);
        
        (bool depositSuccess, ) = destAdapter.call(
            abi.encodeWithSignature(
                "deposit(address,uint256)",
                asset(),
                params.amount
            )
        );
        require(depositSuccess, "Deposit failed");
    }

    /**
     * @notice Execute cross-chain rebalancing via Avail Nexus
     * @param params Rebalance parameters
     */
    function _rebalanceCrossChain(RebalanceParams calldata params) internal {
        // Withdraw from source protocol
        if (params.fromProtocol > 0) {
            address sourceAdapter = protocolAdapters[params.fromProtocol]
                .adapterAddress;
            
            (bool withdrawSuccess, ) = sourceAdapter.call(
                abi.encodeWithSignature(
                    "withdraw(address,uint256)",
                    asset(),
                    params.amount
                )
            );
            require(withdrawSuccess, "Withdraw failed");
        }
        
        // Get destination adapter address
        address destAdapter = protocolAdapters[params.toProtocol]
            .adapterAddress;
        
        // Approve Nexus to spend tokens
        IERC20(asset()).forceApprove(nexusContract, params.amount);
        
        // Encode deposit call for destination chain
        bytes memory executeCall = abi.encodeWithSignature(
            "deposit(address,uint256)",
            asset(),
            params.amount
        );
        
        // Execute bridge & execute via Nexus
        // Note: Actual Nexus interface may differ - adjust based on SDK
        (bool bridgeSuccess, ) = nexusContract.call(
            abi.encodeWithSignature(
                "bridgeAndExecute(uint256,uint256,address,uint256,address,bytes)",
                params.srcChainId,
                params.dstChainId,
                asset(),
                params.amount,
                destAdapter,
                executeCall
            )
        );
        require(bridgeSuccess, "Cross-chain rebalance failed");
    }

    /**
     * @notice Get total balance deployed to protocols
     * @return Total USDC deployed across all protocols
     */
    function _getDeployedBalance() internal view returns (uint256) {
        uint256 total = 0;
        
        // Sum balances from all active protocol adapters
        for (uint8 i = 0; i < protocolCount; i++) {
            if (protocolAdapters[i].isActive) {
                address adapter = protocolAdapters[i].adapterAddress;
                
                // Call adapter's getBalance function
                (bool success, bytes memory data) = adapter.staticcall(
                    abi.encodeWithSignature(
                        "getBalance(address)",
                        address(this)
                    )
                );
                
                if (success && data.length >= 32) {
                    total += abi.decode(data, (uint256));
                }
            }
        }
        
        return total;
    }

    /**
     * @notice Calculate pending management fees
     * @return Pending fees in USDC
     */
    function _calculatePendingFees() internal view returns (uint256) {
        if (managementFeeBps == 0) return accruedFees;
        
        uint256 timeElapsed = block.timestamp - lastFeeCalculation;
        uint256 currentAssets = IERC20(asset()).balanceOf(address(this)) +
            _getDeployedBalance();
        
        // Annual management fee calculation
        uint256 newFees = (currentAssets * managementFeeBps * timeElapsed) /
            (10000 * 365 days);
        
        return accruedFees + newFees;
    }

    /**
     * @notice Accrue management fees
     */
    function _accrueManagementFees() internal {
        uint256 pendingFees = _calculatePendingFees();
        accruedFees = pendingFees;
        lastFeeCalculation = uint64(block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get user's position details
     * @param user User address
     * @return shares User's syUSDC shares
     * @return assets User's USDC value (with yield)
     * @return totalDeposited Cumulative deposits
     * @return totalWithdrawn Cumulative withdrawals
     * @return unrealizedProfit Current unrealized profit
     */
    function getUserPosition(address user)
        external
        view
        returns (
            uint256 shares,
            uint256 assets,
            uint256 totalDeposited,
            uint256 totalWithdrawn,
            uint256 unrealizedProfit
        )
    {
        shares = balanceOf(user);
        assets = convertToAssets(shares);
        
        UserMetadata memory metadata = userMetadata[user];
        totalDeposited = metadata.totalDeposited;
        totalWithdrawn = metadata.totalWithdrawn;
        
        // Calculate unrealized profit
        uint256 netDeposited = totalDeposited > totalWithdrawn
            ? totalDeposited - totalWithdrawn
            : 0;
        unrealizedProfit = assets > netDeposited ? assets - netDeposited : 0;
        
        return (shares, assets, totalDeposited, totalWithdrawn, unrealizedProfit);
    }

    /**
     * @notice Get vault statistics
     * @return totalValueLocked Total USDC in vault
     * @return totalIdle Idle USDC in vault
     * @return totalDeployed USDC deployed to protocols
     * @return sharePrice Price of 1 syUSDC in USDC
     */
    function getVaultStats()
        external
        view
        returns (
            uint256 totalValueLocked,
            uint256 totalIdle,
            uint256 totalDeployed,
            uint256 sharePrice
        )
    {
        totalValueLocked = totalAssets();
        totalIdle = IERC20(asset()).balanceOf(address(this));
        totalDeployed = _getDeployedBalance();
        sharePrice = convertToAssets(1e18); // Price of 1 share (18 decimals)
        
        return (totalValueLocked, totalIdle, totalDeployed, sharePrice);
    }
}
