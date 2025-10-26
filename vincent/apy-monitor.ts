/**
 * APY Monitor - Multi-chain yield opportunity scanner
 * This service monitors DeFi protocols across multiple chains to find the best APY
 * Used by Vincent AI to make automated rebalancing decisions
 */

import { createPublicClient, http, formatUnits, parseUnits, Address } from 'viem';
import { mainnet, base, arbitrum, optimism } from 'viem/chains';

// ============================================
// Types and Interfaces
// ============================================

interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  vaultAddress: Address;
  usdcAddress: Address;
}

interface ProtocolConfig {
  id: number;
  name: string;
  adapterAddress: Address;
  protocolType: 'aave' | 'compound' | 'morpho';
}

interface APYData {
  chainId: number;
  chainName: string;
  protocolId: number;
  protocolName: string;
  apy: number; // in basis points (100 = 1%)
  tvl: bigint;
  timestamp: number;
  isHealthy: boolean;
}

interface YieldOpportunity {
  sourceChain: ChainConfig;
  sourceProtocol: ProtocolConfig;
  sourceAPY: number;
  destChain: ChainConfig;
  destProtocol: ProtocolConfig;
  destAPY: number;
  apyGain: number; // in basis points
  estimatedGasCost: number; // in USD (scaled by 1e6)
  isCrossChain: boolean;
  expectedProfit: number; // in USD (scaled by 1e6)
  profitableAfterGas: boolean;
}

interface UserPosition {
  user: Address;
  chainId: number;
  protocolId: number;
  balance: bigint;
  canRebalance: boolean;
  cooldownRemaining: number;
}

// ============================================
// Chain Configurations
// ============================================

const CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    vaultAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    vaultAddress: process.env.VITE_VAULT_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    vaultAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    vaultAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  }
};

// ============================================
// Protocol Configurations (Per Chain)
// ============================================

const PROTOCOLS: Record<number, ProtocolConfig[]> = {
  // Ethereum protocols
  1: [
    {
      id: 1,
      name: 'Aave V3',
      adapterAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
      protocolType: 'aave'
    },
    {
      id: 2,
      name: 'Compound V3',
      adapterAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
      protocolType: 'compound'
    }
  ],
  // Base protocols
  8453: [
    {
      id: 1,
      name: 'Aave V3',
      adapterAddress: '0x0000000000000000000000000000000000000000', // From deployment
      protocolType: 'aave'
    }
  ],
  // Arbitrum protocols
  42161: [
    {
      id: 1,
      name: 'Aave V3',
      adapterAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
      protocolType: 'aave'
    },
    {
      id: 3,
      name: 'Morpho Blue',
      adapterAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
      protocolType: 'morpho'
    }
  ],
  // Optimism protocols
  10: [
    {
      id: 1,
      name: 'Aave V3',
      adapterAddress: '0x0000000000000000000000000000000000000000', // TODO: Deploy
      protocolType: 'aave'
    }
  ]
};

// ============================================
// ABIs
// ============================================

const ADAPTER_ABI = [
  {
    name: 'getCurrentAPY',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'isHealthy',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

const VAULT_ABI = [
  {
    name: 'getProtocolBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'protocolId', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getUserGuardrails',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'maxSlippageBps', type: 'uint256' },
      { name: 'gasCeilingUSD', type: 'uint256' },
      { name: 'minAPYDiffBps', type: 'uint256' },
      { name: 'autoRebalanceEnabled', type: 'bool' }
    ]
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  }
] as const;

// ============================================
// APY Fetching Functions
// ============================================

/**
 * Fetch APY from Aave V3
 */
async function fetchAaveAPY(
  client: any,
  adapterAddress: Address,
  assetAddress: Address
): Promise<number> {
  try {
    const apy = await client.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: 'getCurrentAPY',
      args: [assetAddress]
    });

    return Number(apy); // Already in basis points
  } catch (error) {
    console.error('Error fetching Aave APY:', error);
    return 0;
  }
}

/**
 * Fetch APY from Compound V3
 */
async function fetchCompoundAPY(
  client: any,
  adapterAddress: Address,
  assetAddress: Address
): Promise<number> {
  try {
    const apy = await client.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: 'getCurrentAPY',
      args: [assetAddress]
    });

    return Number(apy); // Already in basis points
  } catch (error) {
    console.error('Error fetching Compound APY:', error);
    return 0;
  }
}

/**
 * Fetch APY from Morpho Blue
 */
async function fetchMorphoAPY(
  client: any,
  adapterAddress: Address,
  assetAddress: Address
): Promise<number> {
  try {
    const apy = await client.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: 'getCurrentAPY',
      args: [assetAddress]
    });

    return Number(apy); // Already in basis points
  } catch (error) {
    console.error('Error fetching Morpho APY:', error);
    return 0;
  }
}

/**
 * Check if protocol is healthy
 */
async function checkProtocolHealth(
  client: any,
  adapterAddress: Address
): Promise<boolean> {
  try {
    const isHealthy = await client.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: 'isHealthy',
      args: []
    });

    return isHealthy as boolean;
  } catch (error) {
    console.error('Error checking protocol health:', error);
    return false;
  }
}

/**
 * Get TVL for a protocol
 */
async function getProtocolTVL(
  client: any,
  adapterAddress: Address,
  vaultAddress: Address
): Promise<bigint> {
  try {
    const balance = await client.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: 'getBalance',
      args: [vaultAddress]
    });

    return balance as bigint;
  } catch (error) {
    console.error('Error fetching protocol TVL:', error);
    return 0n;
  }
}

// ============================================
// Main Monitoring Functions
// ============================================

/**
 * Monitor all protocols across all chains
 */
export async function monitorAllAPYs(): Promise<APYData[]> {
  const allAPYs: APYData[] = [];

  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    const protocols = PROTOCOLS[chainConfig.chainId] || [];

    console.log(`\n📊 Monitoring ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);

    // Skip if vault not deployed
    if (chainConfig.vaultAddress === '0x0000000000000000000000000000000000000000') {
      console.log(`  ⏭️  Skipping - vault not deployed yet`);
      continue;
    }

    // Create client for this chain
    const client = createPublicClient({
      chain: chainKey === 'ethereum' ? mainnet :
             chainKey === 'base' ? base :
             chainKey === 'arbitrum' ? arbitrum : optimism,
      transport: http(chainConfig.rpcUrl)
    });

    for (const protocol of protocols) {
      // Skip if adapter not deployed
      if (protocol.adapterAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`  ⏭️  Skipping ${protocol.name} - adapter not deployed yet`);
        continue;
      }

      try {
        console.log(`  🔍 Checking ${protocol.name}...`);

        // Fetch APY based on protocol type
        let apy = 0;
        switch (protocol.protocolType) {
          case 'aave':
            apy = await fetchAaveAPY(client, protocol.adapterAddress, chainConfig.usdcAddress);
            break;
          case 'compound':
            apy = await fetchCompoundAPY(client, protocol.adapterAddress, chainConfig.usdcAddress);
            break;
          case 'morpho':
            apy = await fetchMorphoAPY(client, protocol.adapterAddress, chainConfig.usdcAddress);
            break;
        }

        // Check health
        const isHealthy = await checkProtocolHealth(client, protocol.adapterAddress);

        // Get TVL
        const tvl = await getProtocolTVL(client, protocol.adapterAddress, chainConfig.vaultAddress);

        const apyData: APYData = {
          chainId: chainConfig.chainId,
          chainName: chainConfig.name,
          protocolId: protocol.id,
          protocolName: protocol.name,
          apy,
          tvl,
          timestamp: Date.now(),
          isHealthy
        };

        allAPYs.push(apyData);

        console.log(`    ✅ APY: ${(apy / 100).toFixed(2)}% | TVL: $${formatUnits(tvl, 6)} | Health: ${isHealthy ? '✓' : '✗'}`);

      } catch (error) {
        console.error(`    ❌ Error monitoring ${protocol.name}:`, error);
      }
    }
  }

  return allAPYs;
}

/**
 * Find best yield opportunities
 */
export function findBestOpportunities(
  apyData: APYData[],
  minAPYGain: number = 50 // 0.5% minimum gain
): YieldOpportunity[] {
  const opportunities: YieldOpportunity[] = [];

  // Only consider healthy protocols
  const healthyAPYs = apyData.filter(data => data.isHealthy && data.apy > 0);

  // Compare each protocol with every other protocol
  for (let i = 0; i < healthyAPYs.length; i++) {
    for (let j = 0; j < healthyAPYs.length; j++) {
      if (i === j) continue;

      const source = healthyAPYs[i];
      const dest = healthyAPYs[j];

      const apyGain = dest.apy - source.apy;

      // Only consider if destination has higher APY
      if (apyGain < minAPYGain) continue;

      const sourceChain = Object.values(CHAINS).find(c => c.chainId === source.chainId)!;
      const destChain = Object.values(CHAINS).find(c => c.chainId === dest.chainId)!;
      const sourceProtocol = PROTOCOLS[source.chainId]?.find(p => p.id === source.protocolId)!;
      const destProtocol = PROTOCOLS[dest.chainId]?.find(p => p.id === dest.protocolId)!;

      const isCrossChain = source.chainId !== dest.chainId;

      // Estimate gas cost (simplified)
      const estimatedGasCost = isCrossChain ? 5 * 1e6 : 1 * 1e6; // $5 for cross-chain, $1 for same-chain

      // Calculate expected profit for a $1000 position over 30 days
      const testAmount = 1000 * 1e6; // $1000
      const daysToEarn = 30;
      const expectedYield = (testAmount * apyGain * daysToEarn) / (10000 * 365);
      const expectedProfit = expectedYield - estimatedGasCost;

      opportunities.push({
        sourceChain,
        sourceProtocol,
        sourceAPY: source.apy,
        destChain,
        destProtocol,
        destAPY: dest.apy,
        apyGain,
        estimatedGasCost,
        isCrossChain,
        expectedProfit,
        profitableAfterGas: expectedProfit > 0
      });
    }
  }

  // Sort by APY gain (highest first)
  return opportunities.sort((a, b) => b.apyGain - a.apyGain);
}

/**
 * Get user positions across all chains
 */
export async function getUserPositions(userAddress: Address): Promise<UserPosition[]> {
  const positions: UserPosition[] = [];

  for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
    // Skip if vault not deployed
    if (chainConfig.vaultAddress === '0x0000000000000000000000000000000000000000') {
      continue;
    }

    const client = createPublicClient({
      chain: chainKey === 'ethereum' ? mainnet :
             chainKey === 'base' ? base :
             chainKey === 'arbitrum' ? arbitrum : optimism,
      transport: http(chainConfig.rpcUrl)
    });

    const protocols = PROTOCOLS[chainConfig.chainId] || [];

    for (const protocol of protocols) {
      // Skip if adapter not deployed
      if (protocol.adapterAddress === '0x0000000000000000000000000000000000000000') {
        continue;
      }

      try {
        // Get user's balance in this protocol
        const balance = await client.readContract({
          address: chainConfig.vaultAddress,
          abi: VAULT_ABI,
          functionName: 'getProtocolBalance',
          args: [userAddress, BigInt(protocol.id)]
        }) as bigint;

        if (balance > 0n) {
          positions.push({
            user: userAddress,
            chainId: chainConfig.chainId,
            protocolId: protocol.id,
            balance,
            canRebalance: true, // TODO: Check with VincentAutomation
            cooldownRemaining: 0
          });
        }
      } catch (error) {
        console.error(`Error fetching position for ${protocol.name} on ${chainConfig.name}:`, error);
      }
    }
  }

  return positions;
}

/**
 * Format opportunities for display
 */
export function formatOpportunities(opportunities: YieldOpportunity[]): void {
  console.log('\n🎯 Top Yield Opportunities:');
  console.log('═══════════════════════════════════════════════════════════════════');

  if (opportunities.length === 0) {
    console.log('No profitable opportunities found.');
    return;
  }

  opportunities.slice(0, 10).forEach((opp, index) => {
    console.log(`\n${index + 1}. ${opp.sourceChain.name} → ${opp.destChain.name} ${opp.isCrossChain ? '🌉' : '🔄'}`);
    console.log(`   From: ${opp.sourceProtocol.name} (${(opp.sourceAPY / 100).toFixed(2)}%)`);
    console.log(`   To:   ${opp.destProtocol.name} (${(opp.destAPY / 100).toFixed(2)}%)`);
    console.log(`   Gain: ${(opp.apyGain / 100).toFixed(2)}% APY`);
    console.log(`   Gas:  $${(opp.estimatedGasCost / 1e6).toFixed(2)}`);
    console.log(`   Profit (30d on $1k): $${(opp.expectedProfit / 1e6).toFixed(2)} ${opp.profitableAfterGas ? '✅' : '❌'}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════');
}

// ============================================
// CLI Runner
// ============================================

if (require.main === module) {
  (async () => {
    console.log('🤖 Vincent APY Monitor Starting...\n');

    try {
      // Monitor all APYs
      const apyData = await monitorAllAPYs();

      // Find opportunities
      const opportunities = findBestOpportunities(apyData);

      // Display results
      formatOpportunities(opportunities);

      // Example: Get positions for a test user
      const testUser = '0x0000000000000000000000000000000000000000' as Address;
      if (process.env.TEST_USER_ADDRESS) {
        const positions = await getUserPositions(process.env.TEST_USER_ADDRESS as Address);
        console.log(`\n📍 User Positions: ${positions.length} active positions`);
      }

    } catch (error) {
      console.error('❌ Error running APY monitor:', error);
      process.exit(1);
    }
  })();
}
