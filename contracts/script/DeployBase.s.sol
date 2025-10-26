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
 * @title DeployBase
 * @notice Deploy YieldOptimizerUSDC vault and all protocol adapters on Base Mainnet
 * @dev This script deploys the complete vault system on Base Mainnet
 */
contract DeployBase is Script {
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
            bytes(privateKeyStr)[0] == '0' && 
            bytes(privateKeyStr)[1] == 'x') {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("  BASE MAINNET DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("USDC Token:", USDC_BASE);
        console.log("Chain ID:", BASE_CHAIN_ID);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy YieldOptimizerUSDC vault
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
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
        
        // 4. Deploy MorphoAdapter
        // console.log("=== Step 4: Deploying MorphoAdapter ===");
        
        // // Create market params for USDC supply market on Base
        // IMorpho.MarketParams memory marketParams = IMorpho.MarketParams({
        //     loanToken: USDC_BASE,
        //     collateralToken: address(0),
        //     oracle: address(0),
        //     irm: MORPHO_IRM_BASE,
        //     lltv: 0
        // });
        
        // MorphoAdapter morphoAdapter = new MorphoAdapter(
        //     MORPHO_BLUE_BASE,
        //     address(vault),
        //     USDC_BASE,
        //     marketParams
        // );
        // console.log("MorphoAdapter deployed at:", address(morphoAdapter));
        // console.log("  Protocol:", morphoAdapter.getProtocolName());
        // console.log("  Asset:", morphoAdapter.asset());
        // console.log("");
        
        MorphoAdapter morphoAdapter; // Placeholder - commented out for now
        
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
        
        // Register Morpho Blue (commented out for now)
        // vault.addProtocol(
        //     "Morpho Blue",
        //     address(morphoAdapter),
        //     uint8(BASE_CHAIN_ID >> 16)
        // );
        // console.log("Morpho Blue registered as Protocol ID: 2");
        console.log("");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("========================================");
        console.log("  BASE MAINNET DEPLOYMENT COMPLETE!");
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
        console.log("- MorphoAdapter: (commented out for now)");
        console.log("\nConfiguration:");
        console.log("- USDC:", USDC_BASE);
        console.log("- Aave Pool:", AAVE_POOL_BASE);
        console.log("- Morpho Blue:", MORPHO_BLUE_BASE, "(commented out)");
        console.log("- Morpho IRM:", MORPHO_IRM_BASE, "(commented out)");
        console.log("- Treasury:", deployer);
        console.log("\nProtocol IDs:");
        console.log("- 0: Aave V3");
        if (address(compoundAdapter) != address(0)) {
            console.log("- 1: Compound V3");
        }
        console.log("- 2: Morpho Blue (commented out)");
        console.log("\nNext Steps:");
        console.log("1. Update COMPOUND_COMET_BASE address in script (if needed)");
        console.log("2. Get Base USDC from bridge.base.org");
        console.log("3. Deploy Avail Nexus contract for cross-chain bridging");
        console.log("4. Update vault's Nexus address: vault.setNexusContract(nexusAddress)");
        console.log("5. Update .env with: VITE_VAULT_ADDRESS_BASE=%s", address(vault));
        console.log("6. Test deposit flow in UI");
        console.log("7. Set Vincent automation address via setVincentAutomation()");
        console.log("8. Set proper treasury address via setTreasury()");
        console.log("9. Uncomment and deploy MorphoAdapter when ready");
        console.log("========================================\n");
    }
}
