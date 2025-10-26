// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {MorphoAdapter} from "../src/adapters/MorphoAdapter.sol";
import {IMorpho} from "../src/interfaces/IMorpho.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Deploy Script for YieldOptimizerUSDC on Arbitrum
 * @notice Deploys the vault and protocol adapters to Arbitrum Mainnet
 * @dev This script focuses on Morpho Blue for higher yields on Arbitrum
 */
contract DeployArbitrumScript is Script {
    // ===== Arbitrum Mainnet Addresses =====

    // USDC on Arbitrum Mainnet (native USDC, not bridged)
    address constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    // Aave V3 Pool on Arbitrum Mainnet
    address constant AAVE_POOL_ARBITRUM = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;

    // Morpho Blue on Arbitrum (same address across all chains)
    address constant MORPHO_BLUE_ARBITRUM = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;

    // Morpho IRM for Arbitrum USDC markets
    // NOTE: Query from specific market or use AdaptiveCurveIRM
    // Can be fetched from app.morpho.org/arbitrum markets
    address constant MORPHO_IRM_ARBITRUM = address(0); // TODO: Set specific IRM or query from market

    // Morpho Oracle (typically Chainlink-based for USDC markets)
    address constant MORPHO_ORACLE_ARBITRUM = address(0); // TODO: Set based on market requirements

    uint256 constant ARBITRUM_CHAIN_ID = 42161;

    function setUp() public {}

    function run() public {
        // Load private key
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

        console.log("\n==============================================");
        console.log("Arbitrum YieldOptimizerUSDC Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == ARBITRUM_CHAIN_ID, "Wrong chain! Expected Arbitrum");
        console.log("==============================================\n");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy YieldOptimizerUSDC vault
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_ARBITRUM),
            deployer, // Treasury address
            deployer  // Nexus placeholder - will be updated via setNexusContract()
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("");

        // 2. Deploy Aave V3 Adapter (for comparison/fallback)
        console.log("=== Step 2: Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_ARBITRUM,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Protocol:", aaveAdapter.getProtocolName());
        console.log("  Aave Pool:", address(aaveAdapter.aavePool()));
        console.log("");

        // 3. Deploy Morpho Blue Adapter (primary protocol for Arbitrum)
        MorphoAdapter morphoAdapter;
        if (MORPHO_IRM_ARBITRUM != address(0)) {
            console.log("=== Step 3: Deploying MorphoAdapter ===");

            // Create market parameters for USDC supply market
            // NOTE: For production, query actual market from Morpho Blue
            IMorpho.MarketParams memory marketParams = IMorpho.MarketParams({
                loanToken: USDC_ARBITRUM,
                collateralToken: USDC_ARBITRUM, // Supply-only market (same token)
                oracle: MORPHO_ORACLE_ARBITRUM,
                irm: MORPHO_IRM_ARBITRUM,
                lltv: 0 // 0 LLTV for supply-only markets
            });

            morphoAdapter = new MorphoAdapter(
                MORPHO_BLUE_ARBITRUM,
                address(vault),
                marketParams
            );
            console.log("MorphoAdapter deployed at:", address(morphoAdapter));
            console.log("  Protocol:", morphoAdapter.getProtocolName());
            console.log("  Morpho Blue:", MORPHO_BLUE_ARBITRUM);
            console.log("  Market Asset:", address(morphoAdapter.asset()));
            console.log("");
        } else {
            console.log("=== Step 3: Skipping MorphoAdapter ===");
            console.log("  MORPHO_IRM_ARBITRUM not set");
            console.log("  Query IRM from existing Morpho markets:");
            console.log("  Visit app.morpho.org/arbitrum and select a USDC market");
            console.log("  Or use AdaptiveCurveIRM for custom markets");
            console.log("");
        }

        // 4. Register protocols with vault
        console.log("=== Step 4: Registering Protocols ===");

        // Register Aave V3 (Protocol ID: 1)
        vault.addProtocolAdapter(
            1, // Protocol ID
            address(aaveAdapter),
            "Aave V3",
            ARBITRUM_CHAIN_ID,
            true // Active
        );
        console.log("Registered Aave V3 (ID: 1)");

        // Register Morpho Blue (Protocol ID: 3 - using 3 to match other chains)
        if (address(morphoAdapter) != address(0)) {
            vault.addProtocolAdapter(
                3, // Protocol ID (3 for Morpho across all chains)
                address(morphoAdapter),
                "Morpho Blue",
                ARBITRUM_CHAIN_ID,
                true // Active
            );
            console.log("Registered Morpho Blue (ID: 3)");
        }

        console.log("");

        vm.stopBroadcast();

        // 5. Deployment Summary
        console.log("==============================================");
        console.log("Deployment Summary - Arbitrum");
        console.log("==============================================");
        console.log("Vault:", address(vault));
        console.log("Aave V3 Adapter:", address(aaveAdapter));
        if (address(morphoAdapter) != address(0)) {
            console.log("Morpho Adapter:", address(morphoAdapter));
        }
        console.log("");
        console.log("Protocol Registrations:");
        console.log("  [1] Aave V3");
        if (address(morphoAdapter) != address(0)) {
            console.log("  [3] Morpho Blue");
        }
        console.log("");
        console.log("==============================================");
        console.log("Next Steps:");
        console.log("==============================================");
        console.log("1. Save addresses to .env:");
        console.log("   ARBITRUM_VAULT_ADDRESS=", address(vault));
        console.log("   ARBITRUM_AAVE_ADAPTER=", address(aaveAdapter));
        if (address(morphoAdapter) != address(0)) {
            console.log("   ARBITRUM_MORPHO_ADAPTER=", address(morphoAdapter));
        }
        console.log("");
        console.log("2. Deploy VincentAutomation and register this vault:");
        console.log("   vincent.registerVault(42161, ", address(vault), ")");
        console.log("");
        console.log("3. Set Nexus contract address:");
        console.log("   vault.setNexusContract(<nexus_address>)");
        console.log("");
        console.log("4. Update vincent/apy-monitor.ts:");
        console.log("   arbitrum.vaultAddress =", address(vault));
        console.log("   arbitrum.adapters[1].adapterAddress =", address(aaveAdapter));
        if (address(morphoAdapter) != address(0)) {
            console.log("   arbitrum.adapters[3].adapterAddress =", address(morphoAdapter));
        }
        console.log("==============================================\n");
    }
}
