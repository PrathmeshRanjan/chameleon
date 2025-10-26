// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VincentAutomation} from "../src/VincentAutomation.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";

/**
 * @title Multi-Chain Deployment Orchestrator
 * @notice Deploys and configures VincentAutomation with vaults across multiple chains
 * @dev Run this AFTER deploying vaults on Base and Arbitrum
 *
 * Prerequisites:
 * 1. Deploy Base vault: forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast
 * 2. Deploy Arbitrum vault: forge script script/DeployArbitrum.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast
 * 3. Save vault addresses to .env
 * 4. Run this script on Base (primary chain for Vincent)
 */
contract DeployMultiChainScript is Script {

    // ===== Chain IDs =====
    uint256 constant BASE_CHAIN_ID = 8453;
    uint256 constant ARBITRUM_CHAIN_ID = 42161;
    uint256 constant ETHEREUM_CHAIN_ID = 1;
    uint256 constant OPTIMISM_CHAIN_ID = 10;

    // ===== Global Parameters =====
    uint256 constant MIN_APY_DIFF = 50;        // 0.5% minimum APY difference
    uint256 constant MAX_GAS_COST = 10 * 1e6;  // $10 maximum gas cost
    uint256 constant REBALANCE_COOLDOWN = 1 hours; // 1 hour cooldown

    function setUp() public {}

    function run() public {
        // Load environment variables
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

        // Vincent executor address - must be set in .env
        address vincentExecutor = vm.envAddress("VINCENT_EXECUTOR_ADDRESS");
        require(vincentExecutor != address(0), "VINCENT_EXECUTOR_ADDRESS not set in .env");

        // Vault addresses - must be deployed first
        address baseVault = vm.envOr("BASE_VAULT_ADDRESS", address(0));
        address arbitrumVault = vm.envOr("ARBITRUM_VAULT_ADDRESS", address(0));
        address ethereumVault = vm.envOr("ETHEREUM_VAULT_ADDRESS", address(0));
        address optimismVault = vm.envOr("OPTIMISM_VAULT_ADDRESS", address(0));

        console.log("\n==============================================");
        console.log("Multi-Chain Vincent Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");
        console.log("Chain ID:", block.chainid);
        console.log("Vincent Executor:", vincentExecutor);
        console.log("==============================================\n");

        console.log("Vault Addresses:");
        console.log("  Base:", baseVault);
        console.log("  Arbitrum:", arbitrumVault);
        console.log("  Ethereum:", ethereumVault);
        console.log("  Optimism:", optimismVault);
        console.log("");

        // Validate at least 2 vaults are deployed for cross-chain demo
        uint256 vaultCount = 0;
        if (baseVault != address(0)) vaultCount++;
        if (arbitrumVault != address(0)) vaultCount++;
        if (ethereumVault != address(0)) vaultCount++;
        if (optimismVault != address(0)) vaultCount++;

        require(vaultCount >= 2, "Need at least 2 vaults deployed for cross-chain");
        console.log("Deploying VincentAutomation with", vaultCount, "registered vaults\n");

        vm.startBroadcast(deployerPrivateKey);

        // ============================================
        // 1. Deploy VincentAutomation
        // ============================================
        console.log("=== Step 1: Deploying VincentAutomation ===");
        VincentAutomation vincent = new VincentAutomation(vincentExecutor);
        console.log("VincentAutomation deployed at:", address(vincent));
        console.log("  Vincent Executor:", vincent.vincentExecutor());
        console.log("");

        // ============================================
        // 2. Register Vaults
        // ============================================
        console.log("=== Step 2: Registering Vaults ===");

        if (baseVault != address(0)) {
            vincent.registerVault(BASE_CHAIN_ID, baseVault);
            console.log("  Registered Base vault:", baseVault);
        }

        if (arbitrumVault != address(0)) {
            vincent.registerVault(ARBITRUM_CHAIN_ID, arbitrumVault);
            console.log("  Registered Arbitrum vault:", arbitrumVault);
        }

        if (ethereumVault != address(0)) {
            vincent.registerVault(ETHEREUM_CHAIN_ID, ethereumVault);
            console.log("  Registered Ethereum vault:", ethereumVault);
        }

        if (optimismVault != address(0)) {
            vincent.registerVault(OPTIMISM_CHAIN_ID, optimismVault);
            console.log("  Registered Optimism vault:", optimismVault);
        }

        console.log("");

        // ============================================
        // 3. Set Global Parameters
        // ============================================
        console.log("=== Step 3: Setting Global Parameters ===");
        vincent.updateParameters(MIN_APY_DIFF, MAX_GAS_COST, REBALANCE_COOLDOWN);
        console.log("  Min APY Diff:", MIN_APY_DIFF, "bps (", MIN_APY_DIFF / 100, "%)");
        console.log("  Max Gas Cost: $", MAX_GAS_COST / 1e6);
        console.log("  Cooldown:", REBALANCE_COOLDOWN / 60, "minutes");
        console.log("");

        // ============================================
        // 4. Update Vaults with VincentAutomation Address
        // ============================================
        console.log("=== Step 4: Updating Vaults with Vincent Address ===");
        console.log("NOTE: This only works if deploying on the same chain as the vault");
        console.log("For cross-chain vaults, run setVincentAutomation manually\n");

        // Only update vaults on the current chain
        if (block.chainid == BASE_CHAIN_ID && baseVault != address(0)) {
            YieldOptimizerUSDC(baseVault).setVincentAutomation(address(vincent));
            console.log("  Updated Base vault");
        }

        if (block.chainid == ARBITRUM_CHAIN_ID && arbitrumVault != address(0)) {
            YieldOptimizerUSDC(arbitrumVault).setVincentAutomation(address(vincent));
            console.log("  Updated Arbitrum vault");
        }

        if (block.chainid == ETHEREUM_CHAIN_ID && ethereumVault != address(0)) {
            YieldOptimizerUSDC(ethereumVault).setVincentAutomation(address(vincent));
            console.log("  Updated Ethereum vault");
        }

        if (block.chainid == OPTIMISM_CHAIN_ID && optimismVault != address(0)) {
            YieldOptimizerUSDC(optimismVault).setVincentAutomation(address(vincent));
            console.log("  Updated Optimism vault");
        }

        console.log("");

        vm.stopBroadcast();

        // ============================================
        // 5. Deployment Summary
        // ============================================
        console.log("==============================================");
        console.log("Deployment Summary");
        console.log("==============================================");
        console.log("VincentAutomation:", address(vincent));
        console.log("Vincent Executor:", vincent.vincentExecutor());
        console.log("");

        console.log("Registered Vaults:");
        uint256[] memory chains = vincent.getSupportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            address vaultAddr = vincent.vaultsByChain(chains[i]);
            string memory chainName = getChainName(chains[i]);
            console.log("  [", chains[i], "]", chainName, ":", vaultAddr);
        }
        console.log("");

        console.log("Global Parameters:");
        console.log("  Min APY Diff:", vincent.globalMinAPYDiff(), "bps");
        console.log("  Max Gas Cost: $", vincent.globalMaxGasCost() / 1e6);
        console.log("  Cooldown:", vincent.rebalanceCooldown() / 60, "minutes");
        console.log("");

        // ============================================
        // 6. Next Steps
        // ============================================
        console.log("==============================================");
        console.log("Next Steps:");
        console.log("==============================================");
        console.log("1. Save VincentAutomation address to .env:");
        console.log("   VINCENT_AUTOMATION_ADDRESS=", address(vincent));
        console.log("");

        console.log("2. For vaults on other chains, set Vincent address manually:");
        if (block.chainid != BASE_CHAIN_ID && baseVault != address(0)) {
            console.log("   Base: cast send", baseVault, "\"setVincentAutomation(address)\"", address(vincent), "--rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY");
        }
        if (block.chainid != ARBITRUM_CHAIN_ID && arbitrumVault != address(0)) {
            console.log("   Arbitrum: cast send", arbitrumVault, "\"setVincentAutomation(address)\"", address(vincent), "--rpc-url $ARBITRUM_RPC_URL --private-key $PRIVATE_KEY");
        }
        console.log("");

        console.log("3. Update vincent/vincent-config.json:");
        console.log("   automation_contract:", address(vincent));
        console.log("   executor_address:", vincentExecutor);
        console.log("");

        console.log("4. Update vincent/apy-monitor.ts with vault/adapter addresses");
        console.log("");

        console.log("5. Test Vincent monitoring:");
        console.log("   cd vincent && npm run monitor");
        console.log("");

        console.log("6. Test rebalancing:");
        console.log("   cd vincent && TEST_USER_ADDRESS=<user> npm run rebalance");
        console.log("==============================================\n");
    }

    function getChainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "Ethereum";
        if (chainId == 8453) return "Base";
        if (chainId == 42161) return "Arbitrum";
        if (chainId == 10) return "Optimism";
        return "Unknown";
    }
}
