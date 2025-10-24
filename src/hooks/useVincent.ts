import { useState, useCallback, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";
import { parseAbi } from "viem";
import type { UserGuardrails, RebalanceEvent, VincentStatus } from "../types/yield";

// Simplified ABI for the functions we need
const YIELD_OPTIMIZER_ABI = parseAbi([
  "function getUserGuardrails(address user) view returns (uint256 maxSlippageBps, uint256 gasCeilingUSD, uint256 minAPYDiffBps, bool autoRebalanceEnabled, uint64 lastUpdated)",
  "function updateGuardrails(uint256 maxSlippageBps, uint256 gasCeilingUSD, uint256 minAPYDiffBps, bool autoRebalanceEnabled)",
  "function vincentAutomation() view returns (address)",
  "event Rebalanced(address indexed user, uint8 fromProtocol, uint8 toProtocol, uint256 amount, uint256 srcChain, uint256 dstChain, uint256 apyGain)",
  "event GuardrailsUpdated(address indexed user, uint256 maxSlippageBps, uint256 gasCeilingUSD, uint256 minAPYDiffBps, bool autoRebalanceEnabled)",
]);

interface UseVincentProps {
  vaultAddress: `0x${string}`;
  enabled?: boolean;
}

export const useVincent = ({ vaultAddress, enabled = true }: UseVincentProps) => {
  const { address } = useAccount();
  const [rebalanceHistory, setRebalanceHistory] = useState<RebalanceEvent[]>([]);
  const [vincentStatus, setVincentStatus] = useState<VincentStatus>({
    isActive: false,
    lastRebalance: 0,
    totalRebalances: 0,
    totalSaved: "0",
    totalYieldGained: "0",
  });

  // Read user's current guardrails
  const { data: guardrailsData, isLoading: isLoadingGuardrails, refetch: refetchGuardrails } = useReadContract({
    address: vaultAddress,
    abi: YIELD_OPTIMIZER_ABI,
    functionName: "getUserGuardrails",
    args: address ? [address] : undefined,
    query: {
      enabled: enabled && !!address,
    },
  });

  // Read Vincent automation address
  const { data: vincentAddress } = useReadContract({
    address: vaultAddress,
    abi: YIELD_OPTIMIZER_ABI,
    functionName: "vincentAutomation",
    query: {
      enabled,
    },
  });

  // Write contract hook for updating guardrails
  const { writeContract, isPending: isUpdatingGuardrails } = useWriteContract();

  // Parse guardrails data
  const userGuardrails: UserGuardrails | null = guardrailsData
    ? {
        maxSlippageBps: Number(guardrailsData[0]),
        gasCeilingUSD: Number(guardrailsData[1]),
        minAPYDiffBps: Number(guardrailsData[2]),
        autoRebalanceEnabled: guardrailsData[3],
        lastUpdated: Number(guardrailsData[4]),
      }
    : null;

  // Watch for rebalance events
  useWatchContractEvent({
    address: vaultAddress,
    abi: YIELD_OPTIMIZER_ABI,
    eventName: "Rebalanced",
    onLogs: (logs) => {
      const newEvents = logs
        .filter((log) => log.args.user === address)
        .map((log) => ({
          user: log.args.user as string,
          fromProtocol: Number(log.args.fromProtocol),
          toProtocol: Number(log.args.toProtocol),
          amount: log.args.amount?.toString() || "0",
          srcChain: Number(log.args.srcChain),
          dstChain: Number(log.args.dstChain),
          apyGain: Number(log.args.apyGain),
          timestamp: Date.now(),
          txHash: log.transactionHash || "",
        }));

      if (newEvents.length > 0) {
        setRebalanceHistory((prev) => [...newEvents, ...prev]);

        // Update Vincent status
        setVincentStatus((prev) => ({
          ...prev,
          lastRebalance: Date.now(),
          totalRebalances: prev.totalRebalances + newEvents.length,
        }));
      }
    },
  });

  // Watch for guardrails updates
  useWatchContractEvent({
    address: vaultAddress,
    abi: YIELD_OPTIMIZER_ABI,
    eventName: "GuardrailsUpdated",
    onLogs: (logs) => {
      const userLogs = logs.filter((log) => log.args.user === address);
      if (userLogs.length > 0) {
        refetchGuardrails();
      }
    },
  });

  // Update guardrails function
  const updateGuardrails = useCallback(
    async (guardrails: Omit<UserGuardrails, "lastUpdated">) => {
      if (!address) {
        throw new Error("No wallet connected");
      }

      // Validate guardrails
      if (guardrails.maxSlippageBps > 1000) {
        throw new Error("Max slippage cannot exceed 10% (1000 bps)");
      }
      if (guardrails.gasCeilingUSD > 100) {
        throw new Error("Gas ceiling cannot exceed $100");
      }
      if (guardrails.minAPYDiffBps > 10000) {
        throw new Error("Min APY diff cannot exceed 100% (10000 bps)");
      }

      try {
        writeContract({
          address: vaultAddress,
          abi: YIELD_OPTIMIZER_ABI,
          functionName: "updateGuardrails",
          args: [
            BigInt(guardrails.maxSlippageBps),
            BigInt(guardrails.gasCeilingUSD),
            BigInt(guardrails.minAPYDiffBps),
            guardrails.autoRebalanceEnabled,
          ],
        });
      } catch (error) {
        console.error("Error updating guardrails:", error);
        throw error;
      }
    },
    [address, vaultAddress, writeContract]
  );

  // Calculate Vincent status based on rebalance history
  useEffect(() => {
    if (rebalanceHistory.length > 0) {
      const lastRebalance = rebalanceHistory[0]?.timestamp || 0;
      const totalRebalances = rebalanceHistory.length;

      setVincentStatus((prev) => ({
        ...prev,
        isActive: userGuardrails?.autoRebalanceEnabled || false,
        lastRebalance,
        totalRebalances,
      }));
    }
  }, [rebalanceHistory, userGuardrails?.autoRebalanceEnabled]);

  return {
    // Data
    userGuardrails,
    vincentAddress: vincentAddress as `0x${string}` | undefined,
    rebalanceHistory,
    vincentStatus,

    // Loading states
    isLoadingGuardrails,
    isUpdatingGuardrails,

    // Actions
    updateGuardrails,
    refetchGuardrails,
  };
};

export default useVincent;
