// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeploySepolia
 * @notice Deploy YieldOptimizerUSDC vault and protocol adapters on Ethereum Sepolia
 * @dev This script deploys the complete vault system on Ethereum Sepolia testnet
 */
contract DeploySepolia is Script {
    // ===== Ethereum Sepolia Addresses =====
    
    // USDC on Ethereum Sepolia (Aave faucet token)
    address constant USDC_SEPOLIA = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    
    // Aave V3 Pool on Ethereum Sepolia
    address constant AAVE_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;

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
        console.log("  ETHEREUM SEPOLIA DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("USDC Token:", USDC_SEPOLIA);
        console.log("Chain ID:", SEPOLIA_CHAIN_ID);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy YieldOptimizerUSDC vault
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_SEPOLIA),
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
            AAVE_POOL_SEPOLIA,
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
            uint8(SEPOLIA_CHAIN_ID >> 16) // Store simplified chain ID
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
        console.log("   SEPOLIA_VAULT_ADDRESS=%s", address(vault));
        console.log("   SEPOLIA_AAVE_ADAPTER=%s", address(aaveAdapter));
        console.log("2. Install Avail Nexus SDK in your frontend/backend");
        console.log("3. Implement Vincent automation with Nexus integration");
        console.log("4. Verify contracts on Etherscan:");
        console.log("   forge verify-contract %s YieldOptimizerUSDC --chain sepolia", address(vault));
        console.log("   forge verify-contract %s AaveV3Adapter --chain sepolia", address(aaveAdapter));
        console.log("========================================\n");
    }
}
