// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Deploy Script for YieldOptimizerUSDC
 * @notice Deploys the vault and Aave V3 adapter to Base Mainnet
 * @dev This is the main deployment script for the simplified architecture
 */
contract DeployScript is Script {
    // Base Mainnet addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base Mainnet
    address constant AAVE_POOL_BASE = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2; // Aave V3 Pool on Base
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
        console.log("\n=== Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_BASE),
            deployer, // Treasury address (using deployer for now)
            deployer  // Nexus placeholder - will be updated once Nexus is deployed via setNexusContract()
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        
        // 2. Deploy AaveV3Adapter
        console.log("\n=== Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_BASE,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        
        // 3. Add Aave protocol to vault
        console.log("\n=== Adding Aave V3 protocol to vault ===");
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(BASE_CHAIN_ID >> 16) // Store simplified chain ID
        );
        console.log("Aave V3 protocol added with ID: 0");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Network: Base Mainnet");
        console.log("Chain ID:", BASE_CHAIN_ID);
        console.log("Deployer:", deployer);
        console.log("\nContracts:");
        console.log("- YieldOptimizerUSDC:", address(vault));
        console.log("- AaveV3Adapter:", address(aaveAdapter));
        console.log("\nConfiguration:");
        console.log("- USDC:", USDC_BASE);
        console.log("- Aave Pool:", AAVE_POOL_BASE);
        console.log("- Treasury:", deployer);
        console.log("\nNext Steps:");
        console.log("1. Get Base USDC from bridge.base.org");
        console.log("2. Deploy Avail Nexus contract for cross-chain bridging");
        console.log("3. Update vault's Nexus address: vault.setNexusContract(nexusAddress)");
        console.log("4. Update .env with: VITE_VAULT_ADDRESS=%s", address(vault));
        console.log("5. Test deposit flow in UI");
        console.log("6. Set Vincent automation address via setVincentAutomation()");
        console.log("7. Set proper treasury address via setTreasury()");
        console.log("========================================\n");
    }
}
