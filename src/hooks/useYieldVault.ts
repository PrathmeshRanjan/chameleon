import { useState, useCallback, useEffect } from "react";
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { parseAbi, parseUnits, formatUnits } from "viem";
import { erc20Abi } from "viem";
import { sepolia } from "wagmi/chains";

// Simplified ABI for YieldOptimizerUSDC
const YIELD_OPTIMIZER_ABI = parseAbi([
    "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
    "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
    "function balanceOf(address account) view returns (uint256)",
    "function totalAssets() view returns (uint256)",
    "function convertToAssets(uint256 shares) view returns (uint256)",
    "function asset() view returns (address)",
    "event Deposited(address indexed user, uint256 assets, uint256 shares, uint256 timestamp)",
]);

interface UseYieldVaultProps {
    vaultAddress: `0x${string}`;
    enabled?: boolean;
}

// Hardcoded USDC address on Ethereum Sepolia (Aave V3 reserve)
const USDC_SEPOLIA =
    "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as `0x${string}`;

// Vault is deployed on Sepolia
const VAULT_CHAIN_ID = sepolia.id;

export const useYieldVault = ({
    vaultAddress,
    enabled = true,
}: UseYieldVaultProps) => {
    const { address } = useAccount();
    const [depositStatus, setDepositStatus] = useState<
        "idle" | "approving" | "depositing" | "success" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Use hardcoded USDC address instead of fetching from contract
    // This avoids issues with unverified contracts
    const assetAddress = USDC_SEPOLIA;

    // Get user's syUSDC balance (on Sepolia)
    const { data: userShares, refetch: refetchShares } = useReadContract({
        address: vaultAddress,
        abi: YIELD_OPTIMIZER_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: VAULT_CHAIN_ID,
        query: {
            enabled: enabled && !!address,
        },
    });

    // Convert shares to assets (on Sepolia)
    const { data: userAssets } = useReadContract({
        address: vaultAddress,
        abi: YIELD_OPTIMIZER_ABI,
        functionName: "convertToAssets",
        args: userShares ? [userShares] : undefined,
        chainId: VAULT_CHAIN_ID,
        query: {
            enabled: enabled && !!userShares,
        },
    });

    // Get vault's total assets (on Sepolia)
    const { data: totalAssets } = useReadContract({
        address: vaultAddress,
        abi: YIELD_OPTIMIZER_ABI,
        functionName: "totalAssets",
        chainId: VAULT_CHAIN_ID,
        query: {
            enabled,
        },
    });

    // Get user's USDC balance (on Sepolia)
    const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
        address: assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: VAULT_CHAIN_ID,
        query: {
            enabled: enabled && !!address && !!assetAddress,
        },
    });

    // Get USDC allowance for vault (on Sepolia)
    const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
        address: assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: address && vaultAddress ? [address, vaultAddress] : undefined,
        chainId: VAULT_CHAIN_ID,
        query: {
            enabled: enabled && !!address && !!assetAddress,
        },
    });

    // Write contract hooks
    const {
        writeContract: approveWrite,
        data: approveHash,
        isPending: isApprovePending,
    } = useWriteContract();

    const {
        writeContract: depositWrite,
        data: depositHash,
        isPending: isDepositPending,
    } = useWriteContract();

    // Wait for approve transaction
    const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Wait for deposit transaction
    const {
        isLoading: isDepositConfirming,
        isSuccess: isDepositSuccess,
        data: depositReceipt,
    } = useWaitForTransactionReceipt({
        hash: depositHash,
    });

    // Handle deposit success
    useEffect(() => {
        if (isDepositSuccess && depositStatus === "depositing") {
            setDepositStatus("success");
            // Refetch balances
            refetchShares();
            refetchUsdcBalance();
            refetchAllowance();
        }
    }, [
        isDepositSuccess,
        depositStatus,
        refetchShares,
        refetchUsdcBalance,
        refetchAllowance,
    ]);

    // Deposit function
    const deposit = useCallback(
        async (amount: string) => {
            if (!address || !assetAddress) {
                setErrorMessage("Please connect your wallet");
                setDepositStatus("error");
                return;
            }

            try {
                setDepositStatus("idle");
                setErrorMessage(null);

                const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals

                // Check balance
                if (usdcBalance && amountInWei > usdcBalance) {
                    setErrorMessage("Insufficient USDC balance");
                    setDepositStatus("error");
                    return;
                }

                // Check if approval is needed
                const needsApproval =
                    !usdcAllowance || amountInWei > usdcAllowance;

                if (needsApproval) {
                    setDepositStatus("approving");

                    // Approve USDC for vault
                    approveWrite({
                        address: assetAddress as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "approve",
                        args: [vaultAddress, amountInWei],
                    });

                    // Wait for approval confirmation
                    await new Promise<void>((resolve, reject) => {
                        const checkApproval = setInterval(async () => {
                            const newAllowance = await refetchAllowance();
                            if (
                                newAllowance.data &&
                                newAllowance.data >= amountInWei
                            ) {
                                clearInterval(checkApproval);
                                resolve();
                            }
                        }, 1000);

                        // Timeout after 60 seconds
                        setTimeout(() => {
                            clearInterval(checkApproval);
                            reject(new Error("Approval timeout"));
                        }, 60000);
                    });
                }

                // Proceed with deposit
                setDepositStatus("depositing");

                depositWrite({
                    address: vaultAddress,
                    abi: YIELD_OPTIMIZER_ABI,
                    functionName: "deposit",
                    args: [amountInWei, address],
                });
            } catch (error) {
                console.error("Deposit error:", error);
                setErrorMessage(
                    error instanceof Error ? error.message : "Deposit failed"
                );
                setDepositStatus("error");
                throw error;
            }
        },
        [
            address,
            assetAddress,
            vaultAddress,
            usdcBalance,
            usdcAllowance,
            approveWrite,
            depositWrite,
            refetchAllowance,
        ]
    );

    return {
        // Data
        userShares,
        userAssets,
        totalAssets,
        usdcBalance,
        usdcAllowance,
        assetAddress,

        // Status
        depositStatus,
        errorMessage,
        isApproving:
            depositStatus === "approving" ||
            isApprovePending ||
            isApproveConfirming,
        isDepositing:
            depositStatus === "depositing" ||
            isDepositPending ||
            isDepositConfirming,
        isSuccess: depositStatus === "success",
        isError: depositStatus === "error",

        // Actions
        deposit,
        refetchBalances: () => {
            refetchShares();
            refetchUsdcBalance();
            refetchAllowance();
        },

        // Format helpers
        formatShares: (shares: bigint | undefined) =>
            shares ? formatUnits(shares, 18) : "0", // syUSDC has 18 decimals
        formatAssets: (assets: bigint | undefined) =>
            assets ? formatUnits(assets, 6) : "0", // USDC has 6 decimals
    };
};

export default useYieldVault;
