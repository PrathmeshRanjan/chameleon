/**
 * Type definitions for the Smart Yield Optimizer
 */

export interface YieldOpportunity {
    protocolName: string;
    protocolAddress: string;
    chainId: number;
    chainName: string;
    asset: "USDC" | "USDT" | "DAI";
    apy: number; // in percentage (e.g., 5.25 for 5.25%)
    tvl: string; // Total Value Locked in USD
    lastUpdated: number; // timestamp
    riskScore: number; // 1-10 scale
}

export interface UserGuardrails {
    maxSlippageBps: number; // in basis points (100 = 1%)
    maxGasPrice: string; // in gwei
    minApyDeltaBps: number; // minimum APY difference to trigger rebalancing (in bps)
    protocolWhitelist: string[]; // array of protocol addresses
    protocolBlacklist: string[]; // array of protocol addresses
    enabled: boolean;
}

export interface UserPosition {
    userAddress: string;
    totalDeposited: string; // in USD
    allocations: Allocation[];
    projectedAnnualYield: string; // in USD
    totalEarned: string; // historical earnings in USD
    lastRebalance: number; // timestamp
}

export interface Allocation {
    protocolName: string;
    protocolAddress: string;
    chainId: number;
    amount: string; // in token units
    amountUSD: string; // in USD
    apy: number;
    asset: "USDC" | "USDT" | "DAI";
}

export interface RebalanceTransaction {
    id: string;
    timestamp: number;
    fromProtocol: string;
    toProtocol: string;
    fromChain: number;
    toChain: number;
    amount: string;
    asset: string;
    oldApy: number;
    newApy: number;
    apyDelta: number;
    gasUsed: string;
    txHash: string;
    status: "pending" | "success" | "failed";
}

export interface PythPriceData {
    price: number;
    confidence: number;
    publishTime: number;
    expo: number;
}

export interface GasEstimate {
    chainId: number;
    baseFee: string; // in gwei
    priorityFee: string; // in gwei
    maxFee: string; // in gwei
    estimatedCostUSD: string;
}

export interface SlippageEstimate {
    fromToken: string;
    toToken: string;
    amount: string;
    expectedSlippageBps: number;
    priceImpact: number;
    route: string[];
}

export interface VincentDelegation {
    delegateAddress: string;
    scope: DelegationScope;
    expiryTimestamp: number;
    permissions: Permission[];
    active: boolean;
}

export interface DelegationScope {
    maxAmountPerTx: string;
    allowedProtocols: string[];
    allowedChains: number[];
    allowedAssets: string[];
}

export interface Permission {
    action: "deposit" | "withdraw" | "swap" | "bridge" | "rebalance";
    enabled: boolean;
}

export interface ProtocolMetadata {
    name: string;
    address: string;
    chainId: number;
    logo: string;
    website: string;
    auditStatus: "audited" | "unaudited" | "partially-audited";
    category: "lending" | "staking" | "liquidity-pool" | "vault";
    supportedAssets: string[];
}
