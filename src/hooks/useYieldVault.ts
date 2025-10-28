import { useState, useCallback } from "react";
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { parseAbi, parseUnits, formatUnits } from "viem";
import { erc20Abi } from "viem";
import { sepolia, base } from "wagmi/chains";

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
    chainId?: number;
    enabled?: boolean;
}

// USDC addresses by chain
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
    [sepolia.id]: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // Sepolia
    [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet
};

// Default to Base mainnet
const DEFAULT_CHAIN_ID = base.id;

export const useYieldVault = ({
    vaultAddress,
    chainId = DEFAULT_CHAIN_ID,
    enabled = true,
}: UseYieldVaultProps) => {
    const { address } = useAccount();
    const [depositStatus, setDepositStatus] = useState<
        "idle" | "approving" | "depositing" | "success" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Get USDC address for the specified chain
    const assetAddress = USDC_ADDRESSES[chainId];

    // Get user's syUSDC balance
    const { data: userShares, refetch: refetchShares } = useReadContract({
        address: vaultAddress,
        abi: YIELD_OPTIMIZER_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: chainId,
        query: {
            enabled: enabled && !!address,
        },
    });

    // Convert shares to assets
    const { data: userAssets } = useReadContract({
        address: vaultAddress,
        abi: YIELD_OPTIMIZER_ABI,
        functionName: "convertToAssets",
        args: userShares ? [userShares] : undefined,
        chainId: chainId,
        query: {
            enabled: enabled && !!userShares,
        },
    });

    // Get vault's total assets
    const { data: totalAssets } = useReadContract({
        address: vaultAddress,
        abi: YIELD_OPTIMIZER_ABI,
        functionName: "totalAssets",
        chainId: chainId,
        query: {
            enabled,
        },
    });

    // Get user's USDC balance
    const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
        address: assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: chainId,
        query: {
            enabled: enabled && !!address && !!assetAddress,
        },
    });

    // Get USDC allowance for vault
    const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
        address: assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: address && vaultAddress ? [address, vaultAddress] : undefined,
        chainId: chainId,
        query: {
            enabled: enabled && !!address && !!assetAddress,
            refetchInterval: 10000, // Refetch every 10 seconds instead of on every change
        },
    });

    // Write contract hooks (must be declared before being used)
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
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
        useWaitForTransactionReceipt({
            hash: approveHash,
        });

    // Wait for deposit transaction
    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
        useWaitForTransactionReceipt({
            hash: depositHash,
        });

    // Debug wallet connection state
    console.log("useYieldVault state:", {
        address,
        chainId,
        isConnected: !!address,
        assetAddress,
        vaultAddress,
        usdcBalance: usdcBalance?.toString(),
        usdcAllowance: usdcAllowance?.toString(),
        isApproving: isApprovePending || isApproveConfirming,
        isDepositing: isDepositPending || isDepositConfirming,
        approveHash,
        depositHash,
        isApproveSuccess,
        isDepositSuccess,
    });

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

                // Check if approval is needed (add buffer for gas efficiency)
                const currentAllowance = usdcAllowance || 0n;
                const needsApproval = currentAllowance < amountInWei;

                console.log("Deposit check:", {
                    amount: amount,
                    amountInWei: amountInWei.toString(),
                    currentAllowance: currentAllowance.toString(),
                    needsApproval,
                    usdcBalance: usdcBalance?.toString(),
                });

                if (needsApproval) {
                    console.log("Requesting USDC approval...");
                    setDepositStatus("approving");

                    try {
                        // Approve a large amount to avoid repeated approvals
                        const approvalAmount = parseUnits("1000000", 6); // Approve 1M USDC

                        console.log("Sending approval transaction...");
                        approveWrite({
                            address: assetAddress as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [vaultAddress, approvalAmount],
                        });

                        // Wait for the transaction hash to be available
                        let hash = approveHash;
                        if (!hash) {
                            // Wait up to 5 seconds for the hash to be set
                            for (let i = 0; i < 50; i++) {
                                await new Promise((resolve) =>
                                    setTimeout(resolve, 100)
                                );
                                if (approveHash) {
                                    hash = approveHash;
                                    break;
                                }
                            }
                        }

                        if (!hash) {
                            throw new Error(
                                "Failed to send approval transaction"
                            );
                        }

                        console.log("Waiting for approval confirmation...");
                        // Wait for approval to complete
                        await new Promise<void>((resolve, reject) => {
                            const checkConfirmation = setInterval(() => {
                                if (isApproveSuccess) {
                                    console.log("Approval confirmed!");
                                    clearInterval(checkConfirmation);
                                    resolve();
                                }
                            }, 2000);

                            setTimeout(() => {
                                clearInterval(checkConfirmation);
                                reject(
                                    new Error(
                                        "Approval timeout - please try again"
                                    )
                                );
                            }, 60000);
                        });

                        // Refetch allowance after approval
                        console.log("Refetching allowance...");
                        await refetchAllowance();
                    } catch (approvalError) {
                        console.error("Approval failed:", approvalError);
                        setErrorMessage(
                            approvalError instanceof Error
                                ? approvalError.message
                                : "Failed to approve USDC spending"
                        );
                        setDepositStatus("error");
                        return;
                    }
                }

                // Proceed with deposit
                console.log("Proceeding with deposit...");
                setDepositStatus("depositing");

                depositWrite({
                    address: vaultAddress,
                    abi: YIELD_OPTIMIZER_ABI,
                    functionName: "deposit",
                    args: [amountInWei, address],
                });

                // Wait for the deposit transaction hash to be available
                let depositTxHash = depositHash;
                if (!depositTxHash) {
                    // Wait up to 5 seconds for the hash to be set
                    for (let i = 0; i < 50; i++) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100)
                        );
                        if (depositHash) {
                            depositTxHash = depositHash;
                            break;
                        }
                    }
                }

                if (!depositTxHash) {
                    throw new Error("Failed to send deposit transaction");
                }

                console.log("Deposit transaction sent:", depositTxHash);
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
            approveHash,
            isApproveSuccess,
            depositHash,
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
