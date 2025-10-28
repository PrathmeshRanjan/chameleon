// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestCrossChainRebalance
 * @notice Test cross-chain rebalancing from Sepolia to Base Sepolia
 * @dev This simulates what Vincent will do - manually trigger a cross-chain rebalance
 */
contract TestCrossChainRebalance is Script {
    // Deployed contract addresses
    address constant SEPOLIA_VAULT = 0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a;
    address constant SEPOLIA_AAVE_ADAPTER = 0x018e2f42a6C4a0c6400b14b7A35552e6C0f41D4E;
    address constant BASE_SEPOLIA_VAULT = 0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81;
    address constant BASE_SEPOLIA_AAVE_ADAPTER = 0x73951d806B2f2896e639e75c413DD09bA52f61a6;
    
    // USDC addresses
    address constant USDC_SEPOLIA = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    
    // Chain IDs
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;

    function run() public {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        
        uint256 deployerPrivateKey;
        if (bytes(privateKeyStr).length > 2 && 
            bytes(privateKeyStr)[0] == '0' && 
            bytes(privateKeyStr)[1] == 'x') {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("  CROSS-CHAIN REBALANCE TEST");
        console.log("========================================");
        console.log("Deployer/Vincent:", deployer);
        console.log("Source: Sepolia Vault:", SEPOLIA_VAULT);
        console.log("Destination: Base Sepolia Vault:", BASE_SEPOLIA_VAULT);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        YieldOptimizerUSDC sepoliaVault = YieldOptimizerUSDC(SEPOLIA_VAULT);
        IERC20 usdc = IERC20(USDC_SEPOLIA);
        
        // Step 0: Check current state
        console.log("=== Step 0: Check Current State ===");
        uint256 deployerUSDC = usdc.balanceOf(deployer);
        uint256 vaultShares = sepoliaVault.balanceOf(deployer);
        uint256 vaultAssets = sepoliaVault.totalAssets();
        
        console.log("Deployer USDC balance:", deployerUSDC / 1e6, "USDC");
        console.log("Deployer vault shares:", vaultShares);
        console.log("Vault total assets:", vaultAssets / 1e6, "USDC");
        console.log("");
        
        // Step 1: Deposit USDC to vault (if not already done)
        if (vaultShares == 0) {
            console.log("=== Step 1: Depositing USDC to Vault ===");
            require(deployerUSDC > 0, "No USDC to deposit");
            
            uint256 depositAmount = deployerUSDC > 100 * 1e6 ? 100 * 1e6 : deployerUSDC;
            console.log("Depositing:", depositAmount / 1e6, "USDC");
            
            // Approve vault
            usdc.approve(SEPOLIA_VAULT, depositAmount);
            console.log("USDC approved for vault");
            
            // Deposit
            uint256 shares = sepoliaVault.deposit(depositAmount, deployer);
            console.log("Deposited! Received shares:", shares);
            console.log("");
        } else {
            console.log("=== Step 1: Already have vault shares ===");
            console.log("Shares:", vaultShares);
            console.log("");
        }
        
        // Step 2: Prepare rebalance parameters
        console.log("=== Step 2: Preparing Cross-Chain Rebalance ===");
        
        // Amount to rebalance (use 10 USDC for testing)
        uint256 rebalanceAmount = 10 * 1e6; // 10 USDC
        
        YieldOptimizerUSDC.RebalanceParams memory params = YieldOptimizerUSDC.RebalanceParams({
            user: deployer,
            fromProtocol: 0,  // 0 = vault idle balance (not deposited to Aave yet)
            toProtocol: 0,    // Protocol ID 0 on destination (Aave on Base Sepolia)
            amount: rebalanceAmount,
            srcChainId: SEPOLIA_CHAIN_ID,
            dstChainId: BASE_SEPOLIA_CHAIN_ID,
            expectedAPYGain: 50,  // 0.5% expected gain
            estimatedGasCostUSD: 5  // $5 gas cost estimate (simple number, not wei)
        });
        
        console.log("Rebalance params:");
        console.log("  User:", params.user);
        console.log("  Amount:", params.amount / 1e6, "USDC");
        console.log("  From chain:", params.srcChainId);
        console.log("  To chain:", params.dstChainId);
        console.log("  From protocol:", params.fromProtocol);
        console.log("  To protocol:", params.toProtocol);
        console.log("");
        
        // Step 3: Set user guardrails (if not set)
        console.log("=== Step 3: Setting User Guardrails ===");
        (
            uint256 maxSlippage,
            uint256 gasCeiling,
            uint256 minAPYDiff,
            bool autoRebalanceEnabled,
        ) = sepoliaVault.userGuardrails(deployer);
        
        // Always update guardrails to ensure they're high enough
        console.log("Updating guardrails to allow cross-chain rebalancing...");
        sepoliaVault.updateGuardrails(
            500,           // 5% max slippage
            10,            // $10 gas ceiling (simple number, not wei)
            25,            // 0.25% min APY diff
            true           // auto-rebalance enabled
        );
        console.log("Guardrails updated:");
        console.log("  Max slippage: 500 bps (5%)");
        console.log("  Gas ceiling: $10");
        console.log("  Min APY diff: 25 bps (0.25%)");
        console.log("  Auto-rebalance: true");
        console.log("");
        
        // Step 4: Execute cross-chain rebalance
        console.log("=== Step 4: Executing Cross-Chain Rebalance ===");
        console.log("NOTE: This will:");
        console.log("1. Withdraw USDC from source protocol (if deposited)");
        console.log("2. Approve Vincent (deployer) to spend USDC");
        console.log("3. Emit CrossChainRebalanceInitiated event");
        console.log("4. Vincent (you) will then need to use Nexus SDK to bridge");
        console.log("");
        
        try sepoliaVault.executeRebalance(params) {
            console.log("SUCCESS! Cross-chain rebalance initiated!");
            console.log("");
            console.log("Next steps:");
            console.log("1. The vault has approved you to spend", rebalanceAmount / 1e6, "USDC");
            console.log("2. Check the CrossChainRebalanceInitiated event");
            console.log("3. Use Nexus SDK to bridge from Sepolia to Base Sepolia");
            console.log("4. Call adapter.deposit() on Base Sepolia to complete rebalance");
        } catch Error(string memory reason) {
            console.log("FAILED:", reason);
        } catch {
            console.log("FAILED: Unknown error");
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("========================================");
        console.log("  TEST COMPLETE");
        console.log("========================================");
    }
}
