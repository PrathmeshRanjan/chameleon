// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VincentAutomation.sol";
import "../src/YieldOptimizerUSDC.sol";

/**
 * @title DeployVincent
 * @notice Deployment script for VincentAutomation contract
 * @dev Deploys VincentAutomation and registers vaults across multiple chains
 */
contract DeployVincent is Script {

    // ============================================
    // Configuration
    // ============================================

    // Vincent executor address (wallet controlled by Vincent AI)
    address constant VINCENT_EXECUTOR = address(0); // TODO: Set Vincent executor address

    // Vault addresses per chain (update after deploying vaults)
    address constant ETHEREUM_VAULT = address(0); // TODO: Set after deployment
    address constant BASE_VAULT = address(0); // TODO: Set after deployment
    address constant ARBITRUM_VAULT = address(0); // TODO: Set after deployment
    address constant OPTIMISM_VAULT = address(0); // TODO: Set after deployment

    // Chain IDs
    uint256 constant ETHEREUM_CHAIN_ID = 1;
    uint256 constant BASE_CHAIN_ID = 8453;
    uint256 constant ARBITRUM_CHAIN_ID = 42161;
    uint256 constant OPTIMISM_CHAIN_ID = 10;

    // Global parameters
    uint256 constant MIN_APY_DIFF = 50; // 0.5%
    uint256 constant MAX_GAS_COST = 10 * 1e6; // $10
    uint256 constant REBALANCE_COOLDOWN = 1 hours;

    // ============================================
    // Deployment
    // ============================================

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n==============================================");
        console.log("Vincent Automation Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("==============================================\n");

        // Validate configuration
        require(VINCENT_EXECUTOR != address(0), "VINCENT_EXECUTOR not set");
        console.log("Vincent Executor:", VINCENT_EXECUTOR);

        vm.startBroadcast(deployerPrivateKey);

        // ============================================
        // 1. Deploy VincentAutomation
        // ============================================

        console.log("\n1. Deploying VincentAutomation...");
        VincentAutomation vincent = new VincentAutomation(VINCENT_EXECUTOR);
        console.log("   VincentAutomation deployed at:", address(vincent));

        // ============================================
        // 2. Register Vaults
        // ============================================

        console.log("\n2. Registering vaults...");

        if (BASE_VAULT != address(0)) {
            console.log("   Registering Base vault:", BASE_VAULT);
            vincent.registerVault(BASE_CHAIN_ID, BASE_VAULT);
            console.log("   Base vault registered");
        } else {
            console.log("   Base vault not set - skipping");
        }

        if (ETHEREUM_VAULT != address(0)) {
            console.log("   Registering Ethereum vault:", ETHEREUM_VAULT);
            vincent.registerVault(ETHEREUM_CHAIN_ID, ETHEREUM_VAULT);
            console.log("   Ethereum vault registered");
        } else {
            console.log("   Ethereum vault not set - skipping");
        }

        if (ARBITRUM_VAULT != address(0)) {
            console.log("   Registering Arbitrum vault:", ARBITRUM_VAULT);
            vincent.registerVault(ARBITRUM_CHAIN_ID, ARBITRUM_VAULT);
            console.log("   Arbitrum vault registered");
        } else {
            console.log("   Arbitrum vault not set - skipping");
        }

        if (OPTIMISM_VAULT != address(0)) {
            console.log("   Registering Optimism vault:", OPTIMISM_VAULT);
            vincent.registerVault(OPTIMISM_CHAIN_ID, OPTIMISM_VAULT);
            console.log("   Optimism vault registered");
        } else {
            console.log("   Optimism vault not set - skipping");
        }

        // ============================================
        // 3. Set Global Parameters
        // ============================================

        console.log("\n3. Setting global parameters...");
        vincent.updateParameters(MIN_APY_DIFF, MAX_GAS_COST, REBALANCE_COOLDOWN);
        console.log("   Min APY Diff:", MIN_APY_DIFF, "bps");
        console.log("   Max Gas Cost: $", MAX_GAS_COST / 1e6);
        console.log("   Cooldown:", REBALANCE_COOLDOWN, "seconds");

        // ============================================
        // 4. Update Vaults with VincentAutomation Address
        // ============================================

        console.log("\n4. Updating vaults with Vincent address...");

        if (BASE_VAULT != address(0)) {
            YieldOptimizerUSDC baseVault = YieldOptimizerUSDC(BASE_VAULT);
            baseVault.setVincentAutomation(address(vincent));
            console.log("   Base vault updated");
        }

        if (ETHEREUM_VAULT != address(0) && block.chainid == ETHEREUM_CHAIN_ID) {
            YieldOptimizerUSDC ethVault = YieldOptimizerUSDC(ETHEREUM_VAULT);
            ethVault.setVincentAutomation(address(vincent));
            console.log("   Ethereum vault updated");
        }

        if (ARBITRUM_VAULT != address(0) && block.chainid == ARBITRUM_CHAIN_ID) {
            YieldOptimizerUSDC arbVault = YieldOptimizerUSDC(ARBITRUM_VAULT);
            arbVault.setVincentAutomation(address(vincent));
            console.log("   Arbitrum vault updated");
        }

        if (OPTIMISM_VAULT != address(0) && block.chainid == OPTIMISM_CHAIN_ID) {
            YieldOptimizerUSDC opVault = YieldOptimizerUSDC(OPTIMISM_VAULT);
            opVault.setVincentAutomation(address(vincent));
            console.log("   Optimism vault updated");
        }

        vm.stopBroadcast();

        // ============================================
        // 5. Deployment Summary
        // ============================================

        console.log("\n==============================================");
        console.log("Deployment Summary");
        console.log("==============================================");
        console.log("VincentAutomation:", address(vincent));
        console.log("Vincent Executor:", vincent.vincentExecutor());
        console.log("Supported Chains:", vincent.getSupportedChains().length);
        console.log("\nVault Addresses:");

        uint256[] memory chains = vincent.getSupportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            address vaultAddr = vincent.vaultsByChain(chains[i]);
            console.log("  Chain", chains[i], ":", vaultAddr);
        }

        console.log("\nGlobal Parameters:");
        console.log("  Min APY Diff:", vincent.globalMinAPYDiff(), "bps");
        console.log("  Max Gas Cost: $", vincent.globalMaxGasCost() / 1e6);
        console.log("  Cooldown:", vincent.rebalanceCooldown(), "seconds");

        console.log("\n==============================================");
        console.log("Next Steps:");
        console.log("==============================================");
        console.log("1. Save VincentAutomation address to .env:");
        console.log("   VINCENT_AUTOMATION_ADDRESS=", address(vincent));
        console.log("\n2. Update vincent/vincent-config.json with:");
        console.log("   - automation_contract:", address(vincent));
        console.log("   - executor_address:", VINCENT_EXECUTOR);
        console.log("\n3. Deploy to other chains if needed:");
        console.log("   forge script DeployVincent --rpc-url <chain_rpc> --broadcast");
        console.log("\n4. Register Vincent abilities:");
        console.log("   cd vincent && npm run register-abilities");
        console.log("\n5. Start Vincent monitoring:");
        console.log("   cd vincent && npm run monitor");
        console.log("==============================================\n");
    }
}
