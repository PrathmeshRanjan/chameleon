// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployBaseMainnet
 * @notice Deploy YieldOptimizerUSDC vault with Aave V3 adapter on Base Mainnet
 * @dev This is the single user-facing vault for Base Mainnet, using canonical USDC and production protocol addresses
 */
contract DeployBaseMainnet is Script {
    // ===== Base Mainnet Addresses =====
    
    // USDC on Base Mainnet (canonical USDC)
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    // Aave V3 Pool on Base Mainnet
    address constant AAVE_POOL_BASE = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    
    // Base Mainnet chain ID
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
        console.log("Aave Pool:", AAVE_POOL_BASE);
        console.log("Chain ID:", BASE_CHAIN_ID);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ===== 1. Deploy Vault =====
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_BASE),
            deployer, // Treasury (update to proper treasury address)
            deployer  // Nexus placeholder (update to Avail Nexus address)
        );
        console.log("Vault deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("  Treasury:", deployer);
        console.log("");
        
        // ===== 2. Deploy Aave V3 Adapter =====
        console.log("=== Step 2: Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_BASE,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Protocol:", aaveAdapter.getProtocolName());
        console.log("  Aave Pool:", address(aaveAdapter.aavePool()));
        console.log("");
        
        // ===== 3. Register Aave Protocol with Vault =====
        console.log("=== Step 3: Registering Aave V3 Protocol ===");
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(BASE_CHAIN_ID >> 16) // Store simplified chain ID
        );
        console.log("Aave V3 registered as Protocol ID: 0");
        console.log("");
        
        // ===== 4. Set Vincent Automation Address (Optional) =====
        // Uncomment and set your Vincent automation address when ready
        // address vincentAutomation = 0x...; // Your Vincent automation address
        // vault.setVincentAutomation(vincentAutomation);
        // console.log("Vincent automation set to:", vincentAutomation);
        
        vm.stopBroadcast();
        
        // ===== Deployment Summary =====
        console.log("========================================");
        console.log("  DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Chain: Base Mainnet (8453)");
        console.log("USDC Token:", USDC_BASE);
        console.log("Aave Pool:", AAVE_POOL_BASE);
        console.log("");
        console.log("Deployed Contracts:");
        console.log("  Vault:              ", address(vault));
        console.log("  AaveV3Adapter:      ", address(aaveAdapter));
        console.log("");
        console.log("Protocol IDs:");
        console.log("  0: Aave V3");
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Verify contracts on BaseScan:");
        console.log("     forge verify-contract <address> <contract> --chain base");
        console.log("  2. Update frontend .env with vault address");
        console.log("  3. Set proper treasury address via setTreasury()");
        console.log("  4. Set Avail Nexus address via setNexusContract()");
        console.log("  5. Set Vincent automation address via setVincentAutomation()");
        console.log("  6. Test deposits to vault");
        console.log("========================================");
        console.log("");
        console.log("Copy these addresses for .env:");
        console.log("VITE_VAULT_ADDRESS=", address(vault));
        console.log("========================================\n");
    }
}
