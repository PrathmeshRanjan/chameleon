// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/YieldOptimizerUSDC.sol";
import "../src/adapters/AaveV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployBaseSepoliaReverse
 * @notice Deploy vault on Base Sepolia for REVERSE flow: Base Sepolia → Sepolia
 * @dev Run with: forge script script/DeployBaseSepoliaReverse.s.sol:DeployBaseSepoliaReverse --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 */
contract DeployBaseSepoliaReverse is Script {
    // Base Sepolia addresses
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
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
        console.log("  BASE SEPOLIA DEPLOYMENT (REVERSE FLOW)");
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
            deployer, // Treasury
            deployer  // Vincent automation
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("");
        
        // 2. Deploy Aave V3 Adapter
        console.log("=== Step 2: Deploying Aave V3 Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_BASE_SEPOLIA,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Vault:", aaveAdapter.vault());
        console.log("");
        
        // 3. Register Aave adapter
        console.log("=== Step 3: Registering Aave Adapter ===");
        vault.addProtocol(
            "Aave V3 Base Sepolia",
            address(aaveAdapter),
            uint8(BASE_SEPOLIA_CHAIN_ID / 1000000)
        );
        console.log("Aave adapter registered");
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("========================================");
        console.log("  DEPLOYMENT COMPLETE - REVERSE FLOW");
        console.log("========================================");
        console.log("Network: Base Sepolia");
        console.log("USDC:", USDC_BASE_SEPOLIA);
        console.log("Vault:", address(vault));
        console.log("Aave Adapter:", address(aaveAdapter));
        console.log("");
        console.log("Flow: Base Sepolia → Sepolia");
        console.log("1. User deposits USDC on Base Sepolia");
        console.log("2. Bridge to Sepolia via Nexus");
        console.log("3. Deposit into Aave on Sepolia");
    }
}
