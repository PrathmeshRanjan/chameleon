// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployArbitrumVault
 * @notice Deploy only the YieldOptimizerUSDC vault on Arbitrum Mainnet
 * @dev Simplified deployment to avoid gas issues
 */
contract DeployArbitrumVault is Script {
    // ===== Arbitrum Mainnet Addresses =====

    // USDC on Arbitrum Mainnet (verified)
    address constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    uint256 constant ARBITRUM_CHAIN_ID = 42161;

    function run() public {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");

        uint256 deployerPrivateKey;
        if (bytes(privateKeyStr).length > 2 &&
            bytes(privateKeyStr)[0] == '0' && bytes(privateKeyStr)[1] == 'x') {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }

        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("  ARBITRUM VAULT DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("USDC Token:", USDC_ARBITRUM);
        console.log("Chain ID:", ARBITRUM_CHAIN_ID);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy YieldOptimizerUSDC vault
        console.log("=== Deploying YieldOptimizerUSDC Vault ===");
        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(USDC_ARBITRUM),
            deployer, // Treasury address (using deployer for now)
            address(0)  // Nexus placeholder - set to zero for now
        );
        console.log("YieldOptimizerUSDC deployed at:", address(vault));
        console.log("  Name:", vault.name());
        console.log("  Symbol:", vault.symbol());
        console.log("  Asset:", vault.asset());
        console.log("");

        vm.stopBroadcast();

        // Print deployment summary
        console.log("========================================");
        console.log("  VAULT DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Network: Arbitrum Mainnet");
        console.log("Chain ID:", ARBITRUM_CHAIN_ID);
        console.log("Deployer:", deployer);
        console.log("\nDeployed Contracts:");
        console.log("- YieldOptimizerUSDC:", address(vault));
        console.log("\nConfiguration:");
        console.log("- USDC:", USDC_ARBITRUM);
        console.log("- Treasury:", deployer);
        console.log("- Nexus: address(0) (set later)");
        console.log("\nNext Steps:");
        console.log("1. Update .env with: ARBITRUM_VAULT_ADDRESS=%s", address(vault));
        console.log("2. Run DeployArbitrumAdapters.s.sol to deploy adapters");
        console.log("3. Set proper treasury address via setTreasury()");
        console.log("4. Set Avail Nexus address via setNexusContract()");
        console.log("5. Set Vincent automation address via setVincentAutomation()");
        console.log("========================================\n");
    }
}