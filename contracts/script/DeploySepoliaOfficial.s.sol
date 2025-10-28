// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/YieldOptimizerUSDC.sol";
import "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeploySepoliaOfficial
 * @notice Deploy YieldOptimizerUSDC vault with Official Circle USDC on Ethereum Sepolia
 * @dev Run with: forge script script/DeploySepoliaOfficial.s.sol:DeploySepoliaOfficial --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeploySepoliaOfficial is Script {
    // ===== Ethereum Sepolia Addresses =====
    
    // Official Circle USDC on Ethereum Sepolia
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
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
        console.log("  ETHEREUM SEPOLIA DEPLOYMENT (OFFICIAL USDC)");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("Official USDC Token:", USDC_SEPOLIA);
        console.log("Chain ID:", SEPOLIA_CHAIN_ID);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy YieldOptimizerUSDC vault with Official USDC
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
        console.log("  Treasury:", vault.treasury());
        console.log("  Vincent:", vault.vincentAutomation());
        console.log("");
        
        // 2. Deploy Aave V3 Adapter
        console.log("=== Step 2: Deploying Aave V3 Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_SEPOLIA,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Vault:", aaveAdapter.vault());
        console.log("");
        
        // 3. Register Aave adapter with vault
        console.log("=== Step 3: Registering Aave Adapter ===");
        vault.addProtocol(
            "Aave V3 Sepolia", // Protocol name
            address(aaveAdapter),
            uint8(SEPOLIA_CHAIN_ID / 1000000) // Simplified chain ID
        );
        console.log("Aave adapter registered");
        console.log("");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("========================================");
        console.log("  DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("Network: Ethereum Sepolia");
        console.log("Official USDC:", USDC_SEPOLIA);
        console.log("YieldOptimizerUSDC Vault:", address(vault));
        console.log("Aave V3 Adapter:", address(aaveAdapter));
        console.log("");
        console.log("Next steps:");
        console.log("1. Update frontend config with new vault address");
        console.log("2. Approve official USDC to vault");
        console.log("3. Test deposit flow");
        console.log("4. Verify contracts:");
        console.log("   forge verify-contract %s YieldOptimizerUSDC --chain sepolia", address(vault));
        console.log("   forge verify-contract %s AaveV3Adapter --chain sepolia --constructor-args $(cast abi-encode 'constructor(address,address)' %s %s)", 
            address(aaveAdapter), AAVE_POOL_SEPOLIA, address(vault));
    }
}
