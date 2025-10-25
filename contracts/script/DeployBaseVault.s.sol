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
 * @title DeployBaseVault
 * @notice Deploy YieldOptimizerUSDC vault with all adapters on Base Mainnet
 * @dev This is the single user-facing vault for Base, using canonical USDC and production protocol addresses
 */
contract DeployBaseVault is Script {
    // ===== Base Mainnet Addresses (update before mainnet deployment) =====
    
    // USDC on Base Mainnet
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base Mainnet
    
    // Aave V3 Pool on Base Mainnet
    address constant AAVE_POOL_BASE = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2; // Aave V3 Pool on Base
    
    // Compound V3 cUSDCv3 on Base Mainnet
    address constant COMPOUND_COMET_BASE = address(0); // TODO: Update with actual Compound Comet address
    
    // Morpho Blue on Base Mainnet
    address constant MORPHO_BLUE_BASE = address(0); // TODO: Update with actual Morpho Blue address
    
    // Morpho Adaptive Curve IRM on Base Mainnet
    address constant MORPHO_IRM_BASE = address(0); // TODO: Update with actual Morpho IRM address

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
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ===== 1. Deploy Vault =====
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_BASE),
            deployer, // Treasury
            deployer  // Nexus placeholder (update to Avail Nexus address)
        );
        console.log("Vault deployed at:", address(vault));
        
        // ===== 2. Deploy Adapters (if needed) =====
        // Uncomment and update addresses as needed for mainnet
        // console.log("\n=== Step 2: Deploying Adapters ===");
        // AaveV3Adapter aaveAdapter = new AaveV3Adapter(address(vault), AAVE_POOL_BASE, USDC_BASE);
        // CompoundV3Adapter compoundAdapter = new CompoundV3Adapter(address(vault), COMPOUND_COMET_BASE, USDC_BASE);
        // MorphoAdapter morphoAdapter = new MorphoAdapter(address(vault), MORPHO_BLUE_BASE, MORPHO_IRM_BASE, USDC_BASE);
        // console.log("Aave Adapter:", address(aaveAdapter));
        // console.log("Compound Adapter:", address(compoundAdapter));
        // console.log("Morpho Adapter:", address(morphoAdapter));
        
        vm.stopBroadcast();
    }
}
