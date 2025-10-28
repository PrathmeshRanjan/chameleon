// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployBaseSepolia
 * @notice Deploy YieldOptimizerUSDC vault and protocol adapters on Base Sepolia
 * @dev This script deploys the complete vault system on Base Sepolia testnet
 */
contract DeployBaseSepolia is Script {
    // ===== Base Sepolia Addresses =====
    
    // USDC on Base Sepolia (Circle's testnet USDC)
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Aave V3 Pool on Base Sepolia
    address constant AAVE_POOL_BASE_SEPOLIA = 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b;
    
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
        console.log("  BASE SEPOLIA DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("USDC Token:", USDC_BASE_SEPOLIA);
        console.log("Chain ID:", BASE_SEPOLIA_CHAIN_ID);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy YieldOptimizerUSDC vault
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_BASE_SEPOLIA),
            deployer, // Treasury address (using deployer for now)
            deployer  // Vincent automation address (using deployer for testing)
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("");
        
        // 2. Deploy AaveV3Adapter
        console.log("=== Step 2: Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_BASE_SEPOLIA,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Protocol:", aaveAdapter.getProtocolName());
        console.log("  Aave Pool:", address(aaveAdapter.aavePool()));
        console.log("");
        
        // 3. Register protocols with vault
        console.log("=== Step 3: Registering Protocols with Vault ===");
        
        // Register Aave V3
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(BASE_SEPOLIA_CHAIN_ID >> 16) // Store simplified chain ID
        );
        console.log("Aave V3 registered as Protocol ID: 0");
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("========================================");
        console.log("  DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Vault:", address(vault));
        console.log("Aave V3 Adapter:", address(aaveAdapter));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update .env:");
        console.log("   BASE_SEPOLIA_VAULT_ADDRESS=%s", address(vault));
        console.log("   BASE_SEPOLIA_AAVE_ADAPTER=%s", address(aaveAdapter));
        console.log("2. Install Avail Nexus SDK in your frontend/backend");
        console.log("3. Implement Vincent automation with Nexus integration");
        console.log("4. Verify contracts on Basescan:");
        console.log("   forge verify-contract %s YieldOptimizerUSDC --chain base-sepolia", address(vault));
        console.log("   forge verify-contract %s AaveV3Adapter --chain base-sepolia", address(aaveAdapter));
        console.log("========================================\n");
    }
}
