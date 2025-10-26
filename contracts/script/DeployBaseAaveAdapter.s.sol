// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";

/**
 * @title DeployBaseAaveAdapter
 * @notice Deploy Aave V3 adapter and register it with existing vault on Base Mainnet
 * @dev Run this AFTER deploying the vault with DeployBaseVault.s.sol
 */
contract DeployBaseAaveAdapter is Script {
    // ===== Base Mainnet Addresses =====

    // Aave V3 Pool on Base Mainnet (verified)
    address constant AAVE_POOL_BASE = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;

    uint256 constant BASE_CHAIN_ID = 8453;

    function run() public {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");

        uint256 deployerPrivateKey;
        if (bytes(privateKeyStr).length > 2 &&
            bytes(privateKeyStr)[0] == '0' && bytes(privateKeyStr)[1] == 'x') {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }

        address deployer = vm.addr(deployerPrivateKey);

        // Get vault address from .env
        address vaultAddress = vm.envAddress("BASE_VAULT_ADDRESS");
        require(vaultAddress != address(0), "BASE_VAULT_ADDRESS not set in .env");

        YieldOptimizerUSDC vault = YieldOptimizerUSDC(vaultAddress);

        console.log("========================================");
        console.log("  BASE AAV3 ADAPTER DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Vault Address:", vaultAddress);
        console.log("Chain ID:", BASE_CHAIN_ID);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AaveV3Adapter
        console.log("=== Step 1: Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_BASE,
            vaultAddress
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Protocol:", aaveAdapter.getProtocolName());
        console.log("");

        // 2. Register Aave V3 with vault
        console.log("=== Step 2: Registering Aave V3 with Vault ===");
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(BASE_CHAIN_ID >> 16)
        );
        console.log("Aave V3 registered as Protocol ID: 0");
        console.log("");

        vm.stopBroadcast();

        // Print deployment summary
        console.log("========================================");
        console.log("  AAV3 ADAPTER DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Network: Base Mainnet");
        console.log("Vault Address:", vaultAddress);
        console.log("\nDeployed Adapter:");
        console.log("- AaveV3Adapter:", address(aaveAdapter));
        console.log("\nConfiguration:");
        console.log("- Aave Pool:", AAVE_POOL_BASE);
        console.log("\nProtocol ID:");
        console.log("- 0: Aave V3");
        console.log("\nNext Steps:");
        console.log("1. Update .env with adapter address:");
        console.log("   BASE_AAVE_ADAPTER=%s", address(aaveAdapter));
        console.log("2. Test deposit/withdrawal with Aave V3 adapter");
        console.log("3. Set Vincent automation if ready");
        console.log("========================================\n");
    }
}