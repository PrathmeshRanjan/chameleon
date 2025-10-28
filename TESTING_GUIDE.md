# Testing Chameleon Cross-Chain Rebalancing

This guide walks you through testing the complete cross-chain rebalancing flow.

## Current Status ✅

**Completed:**

-   ✅ Contracts deployed on Sepolia and Base Sepolia
-   ✅ Cross-chain rebalance initiated on Sepolia (10 USDC approved to Vincent)
-   ✅ Event monitor service created and ready
-   ✅ CrossChainRebalanceInitiated event emitted

**Next Steps:**

1. Start event monitor
2. Complete the bridge via Nexus Dashboard
3. Verify funds deposited to Aave on Base Sepolia

---

## Step 1: Start Event Monitor 🎧

The event monitor will listen for all rebalancing events and provide actionable instructions.

```bash
cd event-monitor
npm run watch
```

You should see:

```
========================================
  CHAMELEON EVENT MONITOR
========================================

Monitoring contracts:
  Sepolia Vault: 0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a
  Base Sepolia Vault: 0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81

🎧 Listening for events...
```

The monitor is now listening for events in real-time!

---

## Step 2: Complete Nexus Bridge 🌉

Since we already initiated the cross-chain rebalance (see transaction from TestCrossChainRebalance.s.sol), we now need to complete the bridging.

### Option A: Manual via Nexus Dashboard (Recommended for Testing)

1. **Go to Nexus Dashboard**
    - URL: https://nexus.availproject.org
2. **Connect Your Wallet**

    - Connect the deployer wallet (same one used in TestCrossChainRebalance)
    - Make sure you're on Sepolia network

3. **Bridge USDC**

    - Token: USDC (0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8 on Sepolia)
    - Amount: 10 USDC
    - From: Ethereum Sepolia (Chain ID: 11155111)
    - To: Base Sepolia (Chain ID: 84532)

4. **Execute on Destination**
   After bridging completes, you need to call the adapter's deposit function on Base Sepolia:

    **Contract:** `0x73951d806B2f2896e639e75c413DD09bA52f61a6` (Base Sepolia Aave Adapter)

    **Function:** `deposit(address asset, uint256 amount)`

    **Parameters:**

    - `asset`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC on Base Sepolia)
    - `amount`: `10000000` (10 USDC with 6 decimals)

    You can execute this via:

    - Nexus Dashboard's "Execute" feature
    - Etherscan's "Write Contract" interface
    - Cast command: `cast send 0x73951d806B2f2896e639e75c413DD09bA52f61a6 "deposit(address,uint256)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 10000000 --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY`

### Option B: Using Nexus Dashboard's Smart Flow

Nexus supports "bridge and execute" in one transaction:

1. Go to https://nexus.availproject.org
2. Select "Bridge & Execute"
3. Configure:
    - Bridge: 10 USDC from Sepolia to Base Sepolia
    - Execute: Call `0x73951d806B2f2896e639e75c413DD09bA52f61a6.deposit(...)` on arrival
4. Submit and wait for confirmation

---

## Step 3: Verify Results ✅

### Check Event Monitor Output

Your event monitor should have logged the `CrossChainRebalanceInitiated` event when it was emitted. After the bridge completes and deposit executes, you should see a `Rebalanced` event.

### Verify On-Chain State

**1. Check Base Sepolia Aave Adapter Balance**

```bash
cd contracts
cast call 0x73951d806B2f2896e639e75c413DD09bA52f61a6 "totalAssets()" --rpc-url $BASE_SEPOLIA_RPC_URL
```

Expected: Should show ~10 USDC deposited (10000000 in 6 decimals)

**2. Check Base Sepolia Vault Shares**

```bash
cast call 0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81 "totalSupply()" --rpc-url $BASE_SEPOLIA_RPC_URL
```

**3. Verify Aave Position on Base Sepolia**

Check the Aave V3 testnet UI at https://staging.aave.com/ and look for deposits under the deployer address on Base Sepolia.

---

## Step 4: Test Same-Chain Rebalancing (Optional)

To test same-chain rebalancing (simpler, no Nexus needed):

```solidity
// Create TestSameChainRebalance.s.sol
forge script script/TestSameChainRebalance.s.sol:TestSameChainRebalance --rpc-url sepolia --broadcast
```

This will test:

-   Withdraw from Aave on Sepolia
-   Deposit to Compound on Sepolia
-   All within the same transaction
-   No cross-chain bridging needed

---

## Troubleshooting

### Event Monitor Not Detecting Events

**Problem:** Monitor starts but doesn't show the CrossChainRebalanceInitiated event from earlier.

**Reason:** The monitor only listens for NEW events from the current block forward. It doesn't fetch historical events.

**Solution:** To see historical events, modify the monitor to fetch past events:

```typescript
// In EventMonitor.start() method, add:
const currentBlock = await this.sepoliaProvider.getBlockNumber();
const fromBlock = currentBlock - 1000; // Look back 1000 blocks

const pastEvents = await this.sepoliaVault.queryFilter(
    "CrossChainRebalanceInitiated",
    fromBlock
);

console.log(`Found ${pastEvents.length} historical events`);
for (const event of pastEvents) {
    // Process historical events
}
```

### Nexus Bridge Failing

**Check:**

1. Sufficient USDC balance in wallet
2. Sufficient ETH for gas on both chains
3. USDC approval to Nexus bridge contract
4. Correct chain IDs and addresses

### Deposit Function Reverts

**Common Issues:**

-   Insufficient USDC balance after bridge (check slippage)
-   USDC not approved to adapter
-   Wrong USDC address for the network
-   Aave pool not configured properly

---

## Expected Timeline

| Step                         | Time                  |
| ---------------------------- | --------------------- |
| Start event monitor          | Instant               |
| Bridge via Nexus             | 2-5 minutes           |
| Funds arrive on Base Sepolia | 1-2 minutes           |
| Execute deposit to Aave      | ~15 seconds           |
| See Rebalanced event         | Instant after deposit |

**Total:** ~5-10 minutes for complete cross-chain rebalance

---

## Production Architecture (Future)

The current setup uses manual bridging via Nexus Dashboard. For production, the architecture will be:

```
┌─────────────────────┐
│  Event Monitor      │  ← Node.js service (this one!)
│  (Node.js)          │     Listens to blockchain events
└──────────┬──────────┘
           │ HTTP API
           ↓
┌─────────────────────┐
│  Nexus Automation   │  ← Headless browser (Puppeteer)
│  (Browser/Headless) │     Executes bridgeAndExecute()
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Vincent Automation │  ← Lit Protocol EOA
│  (Lit Protocol)     │     Executes same-chain rebalancing
└─────────────────────┘
```

For now, YOU are the automation layer 😄

---

## Summary

1. ✅ **Event Monitor**: Running and listening
2. 🔄 **Bridge USDC**: Use Nexus Dashboard to bridge 10 USDC from Sepolia to Base Sepolia
3. 🔄 **Execute Deposit**: Call adapter.deposit() on Base Sepolia
4. ✅ **Verify**: Check adapter balance and Aave position

Once you complete steps 2-3, the cross-chain rebalancing flow is complete! 🎉
