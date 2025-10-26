// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {CompoundV3Adapter} from "../src/adapters/CompoundV3Adapter.sol";
import {MorphoAdapter} from "../src/adapters/MorphoAdapter.sol";
import {IMorpho} from "../src/interfaces/IMorpho.sol";

/**
 * @title DeployBaseAdapters
 * @notice Deploy protocol adapters and register them with existing vault on Base Mainnet
 * @dev Run this AFTER deploying the vault with DeployBaseVault.s.sol
 */
contract DeployBaseAdapters is Script {
    // ===== Base Mainnet Addresses =====

    // USDC on Base Mainnet (verified)
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Aave V3 Pool on Base Mainnet (verified)
    address constant AAVE_POOL_BASE = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;

    // TODO: Update with actual Base Mainnet addresses
    address constant COMPOUND_COMET_BASE = 0xb125E6687d4313864e53df431d5425969c15Eb2F;

    // Morpho Blue on Base Mainnet (verified)
    address constant MORPHO_BLUE_BASE = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;

    // Adaptive Curve IRM for Base (verified)
    address constant MORPHO_IRM_BASE = 0x46415998764C29aB2a25CbeA6254146D50D22687;

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
        console.log("  BASE ADAPTERS DEPLOYMENT");
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

        // 2. Deploy CompoundV3Adapter (if address is set)
        CompoundV3Adapter compoundAdapter;
        if (COMPOUND_COMET_BASE != address(0)) {
            console.log("=== Step 2: Deploying CompoundV3Adapter ===");
            compoundAdapter = new CompoundV3Adapter(
                COMPOUND_COMET_BASE,
                vaultAddress
            );
            console.log("CompoundV3Adapter deployed at:", address(compoundAdapter));
            console.log("  Protocol:", compoundAdapter.getProtocolName());
            console.log("");
        } else {
            console.log("=== Step 2: Skipping CompoundV3Adapter (address not set) ===");
        }

        // 3. Deploy MorphoAdapter
        console.log("=== Step 3: Deploying MorphoAdapter ===");
        IMorpho.MarketParams memory marketParams = IMorpho.MarketParams({
            loanToken: USDC_BASE,
            collateralToken: address(0),
            oracle: address(0),
            irm: MORPHO_IRM_BASE,
            lltv: 0
        });

        MorphoAdapter morphoAdapter = new MorphoAdapter(
            MORPHO_BLUE_BASE,
            vaultAddress,
            USDC_BASE,
            marketParams
        );
        console.log("MorphoAdapter deployed at:", address(morphoAdapter));
        console.log("  Protocol:", morphoAdapter.getProtocolName());
        console.log("");

        // 4. Register protocols with vault
        console.log("=== Step 4: Registering Protocols with Vault ===");

        // Register Aave V3
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(BASE_CHAIN_ID >> 16)
        );
        console.log("Aave V3 registered as Protocol ID: 0");

        // Register Compound V3 (if deployed)
        if (address(compoundAdapter) != address(0)) {
            vault.addProtocol(
                "Compound V3",
                address(compoundAdapter),
                uint8(BASE_CHAIN_ID >> 16)
            );
            console.log("Compound V3 registered as Protocol ID: 1");
        }

        // Register Morpho Blue
        vault.addProtocol(
            "Morpho Blue",
            address(morphoAdapter),
            uint8(BASE_CHAIN_ID >> 16)
        );
        console.log("Morpho Blue registered as Protocol ID: 2");
        console.log("");

        vm.stopBroadcast();

        // Print deployment summary
        console.log("========================================");
        console.log("  ADAPTERS DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Network: Base Mainnet");
        console.log("Vault Address:", vaultAddress);
        console.log("\nDeployed Adapters:");
        console.log("- AaveV3Adapter:", address(aaveAdapter));
        if (address(compoundAdapter) != address(0)) {
            console.log("- CompoundV3Adapter:", address(compoundAdapter));
        }
        console.log("- MorphoAdapter:", address(morphoAdapter));
        console.log("\nConfiguration:");
        console.log("- USDC:", USDC_BASE);
        console.log("- Aave Pool:", AAVE_POOL_BASE);
        console.log("- Compound Comet:", COMPOUND_COMET_BASE);
        console.log("- Morpho Blue:", MORPHO_BLUE_BASE);
        console.log("\nProtocol IDs:");
        console.log("- 0: Aave V3");
        if (address(compoundAdapter) != address(0)) {
            console.log("- 1: Compound V3");
        }
        console.log("- 2: Morpho Blue");
        console.log("\nNext Steps:");
        console.log("1. Update .env with adapter addresses:");
        console.log("   BASE_AAVE_ADAPTER=%s", address(aaveAdapter));
        if (address(compoundAdapter) != address(0)) {
            console.log("   BASE_COMPOUND_ADAPTER=%s", address(compoundAdapter));
        }
        console.log("   BASE_MORPHO_ADAPTER=%s", address(morphoAdapter));
        console.log("2. Test deposit/withdrawal with each adapter");
        console.log("3. Set Vincent automation if ready");
        console.log("========================================\n");
    }
}