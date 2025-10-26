/**
 * Rebalance Engine - Automated yield optimization decision maker
 * This service analyzes opportunities and executes rebalancing through VincentAutomation
 * Used by Vincent AI to automate cross-chain yield optimization
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  Address,
  parseAbi
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, base, arbitrum, optimism } from 'viem/chains';
import {
  monitorAllAPYs,
  findBestOpportunities,
  getUserPositions
} from './apy-monitor';

// ============================================
// Types
// ============================================

interface RebalanceDecision {
  user: Address;
  sourceChainId: number;
  destChainId: number;
  sourceProtocol: number;
  destProtocol: number;
  amount: bigint;
  minAPYGain: number;
  estimatedGasCost: number;
  destVaultAdapter: Address;
  shouldExecute: boolean;
  reason: string;
}

interface UserGuardrails {
  maxSlippageBps: bigint;
  gasCeilingUSD: bigint;
  minAPYDiffBps: bigint;
  autoRebalanceEnabled: boolean;
}

interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasCost?: number;
  apyGain?: number;
}

// ============================================
// Configuration
// ============================================

const VINCENT_AUTOMATION_ADDRESS = process.env.VINCENT_AUTOMATION_ADDRESS as Address;
const VINCENT_PRIVATE_KEY = process.env.VINCENT_PRIVATE_KEY as `0x${string}`;

const CHAINS_CONFIG = {
  1: { name: 'Ethereum', chain: mainnet, rpc: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com' },
  8453: { name: 'Base', chain: base, rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org' },
  42161: { name: 'Arbitrum', chain: arbitrum, rpc: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc' },
  10: { name: 'Optimism', chain: optimism, rpc: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io' }
};

// ============================================
// ABIs
// ============================================

const VINCENT_AUTOMATION_ABI = parseAbi([
  'function executeSameChainRebalance(uint256 chainId, address user, uint256 sourceProtocol, uint256 destProtocol, uint256 amount, uint256 minAPYGain, uint256 estimatedGasCost) external',
  'function executeCrossChainRebalance(uint256 sourceChainId, uint256 destChainId, address user, uint256 sourceProtocol, uint256 destProtocol, uint256 amount, uint256 minAPYGain, uint256 estimatedGasCost, address destVaultAdapter) external',
  'function canRebalance(address user, uint256 chainId) external view returns (bool allowed, uint256 timeRemaining)',
  'function recordAPY(uint256 chainId, uint256 protocolId, uint256 apy) external',
  'function calculateYieldGain(uint256 currentAPY, uint256 newAPY, uint256 amount, uint256 durationDays) external pure returns (uint256)',
  'function isProfitable(uint256 yieldGain, uint256 gasCost, uint256 minProfitThreshold) external pure returns (bool profitable, uint256 netProfit)',
  'event RebalanceExecuted(address indexed user, uint256 indexed sourceChain, uint256 indexed destChain, uint256 sourceProtocol, uint256 destProtocol, uint256 amount, uint256 apyGain, uint256 gasCost)'
]);

const VAULT_ABI = parseAbi([
  'function getUserGuardrails(address user) external view returns (uint256 maxSlippageBps, uint256 gasCeilingUSD, uint256 minAPYDiffBps, bool autoRebalanceEnabled)',
  'function getProtocolBalance(address user, uint256 protocolId) external view returns (uint256)',
  'function asset() external view returns (address)'
]);

// ============================================
// Client Creation
// ============================================

function getChainClient(chainId: number) {
  const config = CHAINS_CONFIG[chainId as keyof typeof CHAINS_CONFIG];
  if (!config) throw new Error(`Unsupported chain ID: ${chainId}`);

  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpc)
  });
}

function getWalletClient(chainId: number) {
  const config = CHAINS_CONFIG[chainId as keyof typeof CHAINS_CONFIG];
  if (!config) throw new Error(`Unsupported chain ID: ${chainId}`);

  if (!VINCENT_PRIVATE_KEY) {
    throw new Error('VINCENT_PRIVATE_KEY not set');
  }

  const account = privateKeyToAccount(VINCENT_PRIVATE_KEY);

  return createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpc)
  });
}

// ============================================
// Guardrails Validation
// ============================================

/**
 * Get user guardrails from vault
 */
async function getUserGuardrails(
  vaultAddress: Address,
  userAddress: Address,
  chainId: number
): Promise<UserGuardrails> {
  const client = getChainClient(chainId);

  const [maxSlippageBps, gasCeilingUSD, minAPYDiffBps, autoRebalanceEnabled] =
    await client.readContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'getUserGuardrails',
      args: [userAddress]
    }) as [bigint, bigint, bigint, boolean];

  return {
    maxSlippageBps,
    gasCeilingUSD,
    minAPYDiffBps,
    autoRebalanceEnabled
  };
}

/**
 * Check if rebalancing is allowed by VincentAutomation cooldown
 */
async function canRebalance(
  userAddress: Address,
  chainId: number
): Promise<{ allowed: boolean; timeRemaining: number }> {
  const client = getChainClient(chainId);

  const [allowed, timeRemaining] = await client.readContract({
    address: VINCENT_AUTOMATION_ADDRESS,
    abi: VINCENT_AUTOMATION_ABI,
    functionName: 'canRebalance',
    args: [userAddress, BigInt(chainId)]
  }) as [boolean, bigint];

  return {
    allowed,
    timeRemaining: Number(timeRemaining)
  };
}

/**
 * Validate if rebalancing decision meets all requirements
 */
async function validateRebalanceDecision(
  decision: RebalanceDecision,
  vaultAddress: Address
): Promise<{ valid: boolean; reason: string }> {
  try {
    // Check user guardrails
    const guardrails = await getUserGuardrails(
      vaultAddress,
      decision.user,
      decision.sourceChainId
    );

    // Must have auto-rebalance enabled
    if (!guardrails.autoRebalanceEnabled) {
      return { valid: false, reason: 'User has auto-rebalance disabled' };
    }

    // Check minimum APY difference
    if (decision.minAPYGain < Number(guardrails.minAPYDiffBps)) {
      return {
        valid: false,
        reason: `APY gain ${decision.minAPYGain} bps below user minimum ${guardrails.minAPYDiffBps} bps`
      };
    }

    // Check gas ceiling
    if (decision.estimatedGasCost > Number(guardrails.gasCeilingUSD)) {
      return {
        valid: false,
        reason: `Gas cost $${decision.estimatedGasCost / 1e6} exceeds user ceiling $${Number(guardrails.gasCeilingUSD) / 1e6}`
      };
    }

    // Check cooldown
    const cooldown = await canRebalance(decision.user, decision.sourceChainId);
    if (!cooldown.allowed) {
      return {
        valid: false,
        reason: `Cooldown active - ${cooldown.timeRemaining}s remaining`
      };
    }

    // Check profitability using VincentAutomation contract
    const client = getChainClient(decision.sourceChainId);
    const yieldGain = await client.readContract({
      address: VINCENT_AUTOMATION_ADDRESS,
      abi: VINCENT_AUTOMATION_ABI,
      functionName: 'calculateYieldGain',
      args: [
        BigInt(0), // currentAPY - will be fetched from source
        BigInt(decision.minAPYGain),
        decision.amount,
        BigInt(30) // 30 days
      ]
    }) as bigint;

    const [profitable, netProfit] = await client.readContract({
      address: VINCENT_AUTOMATION_ADDRESS,
      abi: VINCENT_AUTOMATION_ABI,
      functionName: 'isProfitable',
      args: [
        yieldGain,
        BigInt(decision.estimatedGasCost),
        BigInt(1 * 1e6) // $1 minimum profit threshold
      ]
    }) as [boolean, bigint];

    if (!profitable) {
      return {
        valid: false,
        reason: `Not profitable after gas costs - net profit: $${Number(netProfit) / 1e6}`
      };
    }

    return { valid: true, reason: 'All validations passed' };

  } catch (error) {
    return {
      valid: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================
// Rebalancing Execution
// ============================================

/**
 * Execute same-chain rebalancing
 */
async function executeSameChainRebalance(
  decision: RebalanceDecision
): Promise<ExecutionResult> {
  try {
    console.log(`\n🔄 Executing same-chain rebalance on chain ${decision.sourceChainId}...`);

    const walletClient = getWalletClient(decision.sourceChainId);

    const hash = await walletClient.writeContract({
      address: VINCENT_AUTOMATION_ADDRESS,
      abi: VINCENT_AUTOMATION_ABI,
      functionName: 'executeSameChainRebalance',
      args: [
        BigInt(decision.sourceChainId),
        decision.user,
        BigInt(decision.sourceProtocol),
        BigInt(decision.destProtocol),
        decision.amount,
        BigInt(decision.minAPYGain),
        BigInt(decision.estimatedGasCost)
      ]
    });

    console.log(`✅ Transaction submitted: ${hash}`);

    // Wait for confirmation
    const publicClient = getChainClient(decision.sourceChainId);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    return {
      success: true,
      txHash: hash,
      gasCost: decision.estimatedGasCost,
      apyGain: decision.minAPYGain
    };

  } catch (error) {
    console.error('❌ Execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Execute cross-chain rebalancing
 */
async function executeCrossChainRebalance(
  decision: RebalanceDecision
): Promise<ExecutionResult> {
  try {
    console.log(`\n🌉 Executing cross-chain rebalance ${decision.sourceChainId} → ${decision.destChainId}...`);

    const walletClient = getWalletClient(decision.sourceChainId);

    const hash = await walletClient.writeContract({
      address: VINCENT_AUTOMATION_ADDRESS,
      abi: VINCENT_AUTOMATION_ABI,
      functionName: 'executeCrossChainRebalance',
      args: [
        BigInt(decision.sourceChainId),
        BigInt(decision.destChainId),
        decision.user,
        BigInt(decision.sourceProtocol),
        BigInt(decision.destProtocol),
        decision.amount,
        BigInt(decision.minAPYGain),
        BigInt(decision.estimatedGasCost),
        decision.destVaultAdapter
      ]
    });

    console.log(`✅ Transaction submitted: ${hash}`);

    // Wait for confirmation
    const publicClient = getChainClient(decision.sourceChainId);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`🌉 Cross-chain bridge initiated - monitor Nexus for completion`);

    return {
      success: true,
      txHash: hash,
      gasCost: decision.estimatedGasCost,
      apyGain: decision.minAPYGain
    };

  } catch (error) {
    console.error('❌ Execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// APY Recording
// ============================================

/**
 * Record APY data on-chain for monitoring
 */
async function recordAPYs(chainId: number, apyData: { protocolId: number; apy: number }[]): Promise<void> {
  try {
    const walletClient = getWalletClient(chainId);

    for (const data of apyData) {
      const hash = await walletClient.writeContract({
        address: VINCENT_AUTOMATION_ADDRESS,
        abi: VINCENT_AUTOMATION_ABI,
        functionName: 'recordAPY',
        args: [BigInt(chainId), BigInt(data.protocolId), BigInt(data.apy)]
      });

      console.log(`📝 Recorded APY for protocol ${data.protocolId}: ${data.apy} bps (tx: ${hash})`);
    }
  } catch (error) {
    console.error(`❌ Failed to record APYs:`, error);
  }
}

// ============================================
// Main Rebalancing Logic
// ============================================

/**
 * Analyze and execute rebalancing for a specific user
 */
export async function rebalanceUser(
  userAddress: Address,
  vaultAddresses: Record<number, Address>
): Promise<ExecutionResult[]> {
  console.log(`\n🎯 Analyzing rebalancing opportunities for user ${userAddress}...`);

  const results: ExecutionResult[] = [];

  try {
    // 1. Monitor all APYs
    console.log('\n📊 Step 1: Monitoring APYs across all chains...');
    const apyData = await monitorAllAPYs();

    // 2. Find best opportunities
    console.log('\n🔍 Step 2: Finding best yield opportunities...');
    const opportunities = findBestOpportunities(apyData, 50); // Minimum 0.5% gain

    if (opportunities.length === 0) {
      console.log('❌ No profitable opportunities found');
      return results;
    }

    // 3. Get user positions
    console.log('\n📍 Step 3: Fetching user positions...');
    const positions = await getUserPositions(userAddress);

    if (positions.length === 0) {
      console.log('❌ No active positions found for user');
      return results;
    }

    console.log(`✅ Found ${positions.length} active positions`);

    // 4. Match positions with opportunities
    console.log('\n🎲 Step 4: Matching positions with opportunities...');

    for (const position of positions) {
      // Find best opportunity for this position
      const bestOpp = opportunities.find(opp =>
        opp.sourceChain.chainId === position.chainId &&
        opp.sourceProtocol.id === position.protocolId &&
        opp.profitableAfterGas
      );

      if (!bestOpp) {
        console.log(`  ⏭️  No profitable opportunity for position on chain ${position.chainId}, protocol ${position.protocolId}`);
        continue;
      }

      // Create rebalance decision
      const decision: RebalanceDecision = {
        user: userAddress,
        sourceChainId: bestOpp.sourceChain.chainId,
        destChainId: bestOpp.destChain.chainId,
        sourceProtocol: bestOpp.sourceProtocol.id,
        destProtocol: bestOpp.destProtocol.id,
        amount: position.balance,
        minAPYGain: bestOpp.apyGain,
        estimatedGasCost: bestOpp.estimatedGasCost,
        destVaultAdapter: bestOpp.destProtocol.adapterAddress,
        shouldExecute: false,
        reason: ''
      };

      // Validate decision
      console.log(`\n  🔍 Validating opportunity: ${bestOpp.sourceChain.name} → ${bestOpp.destChain.name}`);
      const vaultAddress = vaultAddresses[position.chainId];
      const validation = await validateRebalanceDecision(decision, vaultAddress);

      decision.shouldExecute = validation.valid;
      decision.reason = validation.reason;

      if (!validation.valid) {
        console.log(`  ❌ Validation failed: ${validation.reason}`);
        continue;
      }

      console.log(`  ✅ Validation passed - executing rebalance`);

      // Execute rebalance
      let result: ExecutionResult;
      if (decision.sourceChainId === decision.destChainId) {
        result = await executeSameChainRebalance(decision);
      } else {
        result = await executeCrossChainRebalance(decision);
      }

      results.push(result);

      // Small delay between rebalances
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Error during rebalancing:', error);
    results.push({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

/**
 * Monitor and rebalance all users (batch processing)
 */
export async function rebalanceAllUsers(
  users: Address[],
  vaultAddresses: Record<number, Address>
): Promise<Record<string, ExecutionResult[]>> {
  console.log(`\n🚀 Starting batch rebalancing for ${users.length} users...`);

  const allResults: Record<string, ExecutionResult[]> = {};

  for (const user of users) {
    const results = await rebalanceUser(user, vaultAddresses);
    allResults[user] = results;

    // Delay between users to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Summary
  console.log('\n📊 Batch Rebalancing Summary:');
  console.log('═══════════════════════════════════════════════════════════════════');

  let totalExecuted = 0;
  let totalFailed = 0;
  let totalGasSaved = 0;
  let totalYieldGained = 0;

  for (const [user, results] of Object.entries(allResults)) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    totalExecuted += successful;
    totalFailed += failed;

    results.forEach(r => {
      if (r.success) {
        totalGasSaved += r.gasCost || 0;
        totalYieldGained += r.apyGain || 0;
      }
    });

    console.log(`\n  ${user}:`);
    console.log(`    ✅ Successful: ${successful}`);
    console.log(`    ❌ Failed: ${failed}`);
  }

  console.log('\n  Overall:');
  console.log(`    Total Executed: ${totalExecuted}`);
  console.log(`    Total Failed: ${totalFailed}`);
  console.log(`    Total Gas Used: $${totalGasSaved / 1e6}`);
  console.log(`    Total APY Gained: ${totalYieldGained / 100}%`);
  console.log('═══════════════════════════════════════════════════════════════════');

  return allResults;
}

// ============================================
// CLI Runner
// ============================================

if (require.main === module) {
  (async () => {
    console.log('🤖 Vincent Rebalance Engine Starting...\n');

    if (!VINCENT_AUTOMATION_ADDRESS) {
      console.error('❌ VINCENT_AUTOMATION_ADDRESS not set in environment');
      process.exit(1);
    }

    if (!VINCENT_PRIVATE_KEY) {
      console.error('❌ VINCENT_PRIVATE_KEY not set in environment');
      process.exit(1);
    }

    try {
      // Example: Rebalance a single user
      const testUser = process.env.TEST_USER_ADDRESS as Address;
      const vaultAddresses = {
        8453: process.env.VITE_VAULT_ADDRESS as Address,
        // Add other chains as deployed
      };

      if (testUser && vaultAddresses[8453]) {
        const results = await rebalanceUser(testUser, vaultAddresses);
        console.log(`\n✅ Rebalancing completed with ${results.filter(r => r.success).length} successful executions`);
      } else {
        console.log('⚠️  TEST_USER_ADDRESS or VITE_VAULT_ADDRESS not set - skipping execution');
        console.log('💡 Set these environment variables to test rebalancing');
      }

    } catch (error) {
      console.error('❌ Error running rebalance engine:', error);
      process.exit(1);
    }
  })();
}
