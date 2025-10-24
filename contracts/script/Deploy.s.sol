// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {YieldOptimizerUSDC} from "../src/YieldOptimizerUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy USDC mock for testing (use real USDC address for mainnet)
        // For testing, we'll use a mock USDC
        address mockUSDC = address(0x1234567890123456789012345678901234567890); // Replace with actual USDC
        address treasury = deployer; // Use deployer as treasury for testing
        address nexus = address(0x1111111111111111111111111111111111111111); // Replace with actual Nexus

        YieldOptimizerUSDC vault = new YieldOptimizerUSDC(
            IERC20(mockUSDC),
            treasury,
            nexus
        );

        console.log("YieldOptimizerUSDC deployed to:", address(vault));

        vm.stopBroadcast();
    }
}
