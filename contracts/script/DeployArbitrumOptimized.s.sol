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
 * @title DeployArbitrumOptimized
 * @notice Deploy YieldOptimizerUSDC vault and all protocol adapters on Arbitrum Mainnet
 * @dev This script deploys contracts in separate transactions to avoid gas limits
 */
contract DeployArbitrumOptimized is Script {
    // ===== Arbitrum Mainnet Addresses =====
    
    // USDC on Arbitrum Mainnet (verified)
    address constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    
    // Aave V3 Pool on Arbitrum Mainnet (verified)
    address constant AAVE_POOL_ARBITRUM = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    
    address constant COMPOUND_COMET_ARBITRUM = 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf;
    
    // Morpho Blue on Arbitrum Mainnet (verified)
    address constant MORPHO_BLUE_ARBITRUM = 0x6c247b1F6182318877311737BaC0844bAa518F5e;
    
    // Adaptive Curve IRM for Arbitrum (verified)
    address constant MORPHO_IRM_ARBITRUM = 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA;
    
    uint256 constant ARBITRUM_CHAIN_ID = 42161;

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
        console.log("  ARBITRUM MAINNET DEPLOYMENT (OPTIMIZED)");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("USDC Token:", USDC_ARBITRUM);
        console.log("Chain ID:", ARBITRUM_CHAIN_ID);
        console.log("");
        
        // Deploy vault first
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 1: Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_ARBITRUM),
            deployer, // Treasury address (using deployer for now)
            deployer  // Nexus placeholder - will be updated once Nexus is deployed via setNexusContract()
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("");
        
        vm.stopBroadcast();
        
        // Deploy adapters in separate transactions
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 2: Deploying AaveV3Adapter ===");
        AaveV3Adapter aaveAdapter = new AaveV3Adapter(
            AAVE_POOL_ARBITRUM,
            address(vault)
        );
        console.log("AaveV3Adapter deployed at:", address(aaveAdapter));
        console.log("  Protocol:", aaveAdapter.getProtocolName());
        console.log("  Aave Pool:", address(aaveAdapter.aavePool()));
        console.log("");
        
        vm.stopBroadcast();
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 3: Deploying CompoundV3Adapter ===");
        CompoundV3Adapter compoundAdapter = new CompoundV3Adapter(
            COMPOUND_COMET_ARBITRUM,
            address(vault)
        );
        console.log("CompoundV3Adapter deployed at:", address(compoundAdapter));
        console.log("  Protocol:", compoundAdapter.getProtocolName());
        console.log("");
        
        vm.stopBroadcast();
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 4: Deploying MorphoAdapter ===");
        
        // Create market params for USDC supply market on Arbitrum
        IMorpho.MarketParams memory marketParams = IMorpho.MarketParams({
            loanToken: USDC_ARBITRUM,
            collateralToken: address(0),
            oracle: address(0),
            irm: MORPHO_IRM_ARBITRUM,
            lltv: 0
        });
        
        MorphoAdapter morphoAdapter = new MorphoAdapter(
            MORPHO_BLUE_ARBITRUM,
            address(vault),
            USDC_ARBITRUM,
            marketParams
        );
        console.log("MorphoAdapter deployed at:", address(morphoAdapter));
        console.log("  Protocol:", morphoAdapter.getProtocolName());
        console.log("  Asset:", morphoAdapter.asset());
        console.log("");
        
        vm.stopBroadcast();
        
        // Register protocols in separate transactions
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 5: Registering Aave V3 Protocol ===");
        vault.addProtocol(
            "Aave V3",
            address(aaveAdapter),
            uint8(ARBITRUM_CHAIN_ID >> 16) // Store simplified chain ID
        );
        console.log("Aave V3 registered as Protocol ID: 0");
        
        vm.stopBroadcast();
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 6: Registering Compound V3 Protocol ===");
        vault.addProtocol(
            "Compound V3",
            address(compoundAdapter),
            uint8(ARBITRUM_CHAIN_ID >> 16)
        );
        console.log("Compound V3 registered as Protocol ID: 1");
        
        vm.stopBroadcast();
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Step 7: Registering Morpho Blue Protocol ===");
        vault.addProtocol(
            "Morpho Blue",
            address(morphoAdapter),
            uint8(ARBITRUM_CHAIN_ID >> 16)
        );
        console.log("Morpho Blue registered as Protocol ID: 2");
        console.log("");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("========================================");
        console.log("  ARBITRUM MAINNET DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Network: Arbitrum Mainnet");
        console.log("Chain ID:", ARBITRUM_CHAIN_ID);
        console.log("Deployer:", deployer);
        console.log("\nDeployed Contracts:");
        console.log("- YieldOptimizerUSDC:", address(vault));
        console.log("- AaveV3Adapter:", address(aaveAdapter));
        console.log("- CompoundV3Adapter:", address(compoundAdapter));
        console.log("- MorphoAdapter:", address(morphoAdapter));
        console.log("\nConfiguration:");
        console.log("- USDC:", USDC_ARBITRUM);
        console.log("- Aave Pool:", AAVE_POOL_ARBITRUM);
        console.log("- Compound Comet:", COMPOUND_COMET_ARBITRUM);
        console.log("- Morpho Blue:", MORPHO_BLUE_ARBITRUM);
        console.log("- Morpho IRM:", MORPHO_IRM_ARBITRUM);
        console.log("- Treasury:", deployer);
        console.log("\nProtocol IDs:");
        console.log("- 0: Aave V3");
        console.log("- 1: Compound V3");
        console.log("- 2: Morpho Blue");
        console.log("\nNext Steps:");
        console.log("1. Get Arbitrum USDC from bridge.arbitrum.io");
        console.log("2. Deploy Avail Nexus contract for cross-chain bridging");
        console.log("3. Update vault's Nexus address: vault.setNexusContract(nexusAddress)");
        console.log("4. Update .env with: VITE_VAULT_ADDRESS_ARBITRUM=%s", address(vault));
        console.log("5. Test deposit flow in UI");
        console.log("6. Set Vincent automation address via setVincentAutomation()");
        console.log("7. Set proper treasury address via setTreasury()");
        console.log("========================================\n");
    }
}
