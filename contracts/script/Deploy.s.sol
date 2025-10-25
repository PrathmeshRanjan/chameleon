// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {CompoundV3Adapter} from "../src/adapters/CompoundV3Adapter.sol";
import {MorphoAdapter} from "../src/adapters/MorphoAdapter.sol";
import {IMorpho} from "../src/interfaces/IMorpho.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Deploy Script for YieldOptimizerUSDC
 * @notice Deploys the vault and all protocol adapters to Base Mainnet
 * @dev This is the main deployment script for the simplified architecture
 */
contract DeployScript is Script {
    // ===== Base Mainnet Addresses =====
    
    // USDC on Base Mainnet (verified)
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    // Aave V3 Pool on Base Mainnet (verified)
    address constant AAVE_POOL_BASE = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    
    // TODO: Update with actual Base Mainnet addresses
    address constant COMPOUND_COMET_BASE = address(0); // TODO: Update with Compound V3 Comet address
    address constant MORPHO_BLUE_BASE = address(0); // TODO: Update with Morpho Blue address
    address constant MORPHO_IRM_BASE = address(0); // TODO: Update with Morpho IRM address
    
    uint256 constant BASE_CHAIN_ID = 8453;

    function setUp() public {}

    function run() public {
        // Load private key as string first, then convert to uint256
        // This handles both formats: with or without 0x prefix
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        
        // Check if it starts with 0x, if not add it
        if (bytes(privateKeyStr).length > 2 && 
            bytes(privateKeyStr)[0] == '0' && 
            bytes(privateKeyStr)[1] == 'x') {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy YieldOptimizerUSDC vault
        console.log("\n=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_BASE),
            deployer, // Treasury address (using deployer for now)
            deployer  // Nexus placeholder - will be updated once Nexus is deployed via setNexusContract()
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("");
        
        // 2. Deploy AaveV3Adapter
        console.log("=== Step 2: Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_BASE,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Protocol:", aaveAdapter.getProtocolName());
        console.log("  Aave Pool:", address(aaveAdapter.aavePool()));
        console.log("");
        
        // 3. Deploy CompoundV3Adapter (if address is set)
        CompoundV3Adapter compoundAdapter;
        if (COMPOUND_COMET_BASE != address(0)) {
            console.log("=== Step 3: Deploying CompoundV3Adapter ===");
            compoundAdapter = new CompoundV3Adapter(
                COMPOUND_COMET_BASE,
                address(vault)
            );
            console.log("CompoundV3Adapter deployed at:", address(compoundAdapter));
            console.log("  Protocol:", compoundAdapter.getProtocolName());
            console.log("");
        } else {
            console.log("=== Step 3: Skipping CompoundV3Adapter (address not set) ===");
            console.log("  TODO: Update COMPOUND_COMET_BASE address in script");
            console.log("");
        }
        
        // 4. Deploy MorphoAdapter (if addresses are set)
        MorphoAdapter morphoAdapter;
        if (MORPHO_BLUE_BASE != address(0) && MORPHO_IRM_BASE != address(0)) {
            console.log("=== Step 4: Deploying MorphoAdapter ===");
            
            // Create market params for USDC supply market on Base
            IMorpho.MarketParams memory marketParams = IMorpho.MarketParams({
                loanToken: USDC_BASE,
                collateralToken: address(0),
                oracle: address(0),
                irm: MORPHO_IRM_BASE,
                lltv: 0
            });
            
            morphoAdapter = new MorphoAdapter(
                MORPHO_BLUE_BASE,
                address(vault),
                USDC_BASE,
                marketParams
            );
            console.log("MorphoAdapter deployed at:", address(morphoAdapter));
            console.log("  Protocol:", morphoAdapter.getProtocolName());
            console.log("  Asset:", morphoAdapter.asset());
            console.log("");
        } else {
            console.log("=== Step 4: Skipping MorphoAdapter (addresses not set) ===");
            console.log("  TODO: Update MORPHO_BLUE_BASE and MORPHO_IRM_BASE addresses in script");
            console.log("");
        }
        
        // 5. Register protocols with vault
        console.log("=== Step 5: Registering Protocols with Vault ===");
        
        // Register Aave V3 (always available)
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(BASE_CHAIN_ID >> 16) // Store simplified chain ID
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
        
        // Register Morpho Blue (if deployed)
        if (address(morphoAdapter) != address(0)) {
            vault.addProtocol(
                "Morpho Blue",
                address(morphoAdapter),
                uint8(BASE_CHAIN_ID >> 16)
            );
            console.log("Morpho Blue registered as Protocol ID: 2");
        }
        console.log("");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Network: Base Mainnet");
        console.log("Chain ID:", BASE_CHAIN_ID);
        console.log("Deployer:", deployer);
        console.log("\nDeployed Contracts:");
        console.log("- YieldOptimizerUSDC:", address(vault));
        console.log("- AaveV3Adapter:", address(aaveAdapter));
        if (address(compoundAdapter) != address(0)) {
            console.log("- CompoundV3Adapter:", address(compoundAdapter));
        }
        if (address(morphoAdapter) != address(0)) {
            console.log("- MorphoAdapter:", address(morphoAdapter));
        }
        console.log("\nConfiguration:");
        console.log("- USDC:", USDC_BASE);
        console.log("- Aave Pool:", AAVE_POOL_BASE);
        console.log("- Treasury:", deployer);
        console.log("\nProtocol IDs:");
        console.log("- 0: Aave V3");
        if (address(compoundAdapter) != address(0)) {
            console.log("- 1: Compound V3");
        }
        if (address(morphoAdapter) != address(0)) {
            console.log("- 2: Morpho Blue");
        }
        console.log("\nNext Steps:");
        console.log("1. Update placeholder addresses in script (if needed):");
        console.log("   - COMPOUND_COMET_BASE");
        console.log("   - MORPHO_BLUE_BASE");
        console.log("   - MORPHO_IRM_BASE");
        console.log("2. Get Base USDC from bridge.base.org");
        console.log("3. Deploy Avail Nexus contract for cross-chain bridging");
        console.log("4. Update vault's Nexus address: vault.setNexusContract(nexusAddress)");
        console.log("5. Update .env with: VITE_VAULT_ADDRESS=%s", address(vault));
        console.log("6. Test deposit flow in UI");
        console.log("7. Set Vincent automation address via setVincentAutomation()");
        console.log("8. Set proper treasury address via setTreasury()");
        console.log("========================================\n");
    }
}
