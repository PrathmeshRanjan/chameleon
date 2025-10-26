// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import "../src/AvailNexus.sol";

/**
 * @title DeployNexus
 * @notice Deploy Avail Nexus contract for cross-chain bridging
 */
contract DeployNexus is Script {
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
        console.log("  AVAIL NEXUS DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AvailNexus with treasury as deployer initially
        AvailNexus nexus = new AvailNexus(deployer);

        console.log("AvailNexus deployed at:", address(nexus));
        console.log("Treasury (initial):", deployer);
        console.log("");

        // Configure supported chains (already done in constructor)
        console.log("Supported chains configured:");
        console.log("- Ethereum Mainnet (1)");
        console.log("- Base Mainnet (8453)");
        console.log("- Arbitrum Mainnet (42161)");
        console.log("");

        vm.stopBroadcast();

        console.log("========================================");
        console.log("  DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("Nexus Contract:", address(nexus));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update .env: NEXUS_CONTRACT_ADDRESS=%s", address(nexus));
        console.log("2. Set proper treasury: nexus.setTreasury(treasuryAddress)");
        console.log("3. Add bridge operators: nexus.setBridgeOperator(operator, true)");
        console.log("4. Update vault: vault.setNexusContract(%s)", address(nexus));
        console.log("========================================\n");
    }
}