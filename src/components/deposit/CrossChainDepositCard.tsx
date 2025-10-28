import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { useNexus } from "@/providers/NexusProvider";

// Contract addresses from deployment
const SEPOLIA_VAULT = "0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a";
const USDC_SEPOLIA = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
const BASE_SEPOLIA_AAVE_ADAPTER = "0x73951d806B2f2896e639e75c413DD09bA52f61a6";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// ABIs
const VAULT_ABI = [
    {
        inputs: [
            { name: "assets", type: "uint256" },
            { name: "receiver", type: "address" },
        ],
        name: "deposit",
        outputs: [{ name: "shares", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "user", type: "address" },
            { name: "fromProtocol", type: "uint8" },
            { name: "toProtocol", type: "uint8" },
            { name: "amount", type: "uint256" },
        ],
        name: "executeRebalance",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

const ERC20_ABI = [
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

type Step =
    | "idle"
    | "approve"
    | "deposit"
    | "rebalance"
    | "bridge"
    | "complete";

export default function CrossChainDepositCard() {
    const { address, chain } = useAccount();
    const { switchChain } = useSwitchChain();
    const { nexusSDK } = useNexus();
    const [amount, setAmount] = useState("");
    const [currentStep, setCurrentStep] = useState<Step>("idle");
    const [txHashes, setTxHashes] = useState<Record<string, string>>({});
    const [error, setError] = useState<string>("");

    // Log connection status
    useEffect(() => {
        console.log("Wallet status:", { 
            address, 
            chainId: chain?.id, 
            chainName: chain?.name,
            isConnected: !!address 
        });
    }, [address, chain]);

    const { writeContract: approveUSDC, data: approveHash, error: approveError, isPending: isApprovePending } =
        useWriteContract();
    const { writeContract: depositToVault, data: depositHash, error: depositError } =
        useWriteContract();
    const { writeContract: executeRebalance, data: rebalanceHash, error: rebalanceError } =
        useWriteContract();

    // Log errors
    useEffect(() => {
        if (approveError) {
            console.error("Approve error from wagmi:", approveError);
            setError(approveError.message);
            setCurrentStep("idle");
        }
    }, [approveError]);

    useEffect(() => {
        if (depositError) {
            console.error("Deposit error from wagmi:", depositError);
            setError(depositError.message);
            setCurrentStep("idle");
        }
    }, [depositError]);

    useEffect(() => {
        if (rebalanceError) {
            console.error("Rebalance error from wagmi:", rebalanceError);
            setError(rebalanceError.message);
            setCurrentStep("idle");
        }
    }, [rebalanceError]);

    const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });
    const { isSuccess: depositSuccess } = useWaitForTransactionReceipt({
        hash: depositHash,
    });
    const { 
        isSuccess: rebalanceSuccess, 
        isLoading: rebalanceConfirming,
        isError: rebalanceReceiptError 
    } = useWaitForTransactionReceipt({
        hash: rebalanceHash,
    });

    // Define handlers first (before useEffect hooks that use them)
    const handleDeposit = useCallback(async () => {
        if (!amount || !address) return;

        try {
            const amountWei = parseUnits(amount, 6);

            depositToVault({
                address: SEPOLIA_VAULT as `0x${string}`,
                abi: VAULT_ABI,
                functionName: "deposit",
                args: [amountWei, address],
                chainId: 11155111, // Sepolia
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Deposit failed");
            setCurrentStep("idle");
        }
    }, [amount, address, depositToVault]);

    const handleRebalance = useCallback(async () => {
        if (!amount || !address) return;

        try {
            const amountWei = parseUnits(amount, 6);

            console.log("Executing rebalance with manual gas limit...");

            // Execute cross-chain rebalance
            // fromProtocol: 0 (Aave Sepolia), toProtocol: 1 (Aave Base Sepolia)
            executeRebalance({
                address: SEPOLIA_VAULT as `0x${string}`,
                abi: VAULT_ABI,
                functionName: "executeRebalance",
                args: [address, 0, 1, amountWei],
                chainId: 11155111, // Sepolia
                gas: 500000n, // Manual gas limit to avoid exceeding cap
                maxFeePerGas: 50000000000n, // 50 gwei - higher gas price for faster confirmation
                maxPriorityFeePerGas: 2000000000n, // 2 gwei priority fee
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Rebalance failed");
            setCurrentStep("idle");
        }
    }, [amount, address, executeRebalance]);

    // Handle approve success
    useEffect(() => {
        if (approveSuccess && currentStep === "approve" && approveHash) {
            setTxHashes((prev) => ({ ...prev, approve: approveHash }));
            // Automatically move to deposit step and trigger deposit
            setCurrentStep("deposit");
            handleDeposit();
        }
    }, [approveSuccess, currentStep, approveHash, handleDeposit]);

    // Handle deposit success
    useEffect(() => {
        if (depositSuccess && currentStep === "deposit" && depositHash) {
            setTxHashes((prev) => ({ ...prev, deposit: depositHash }));
            // Skip rebalance step (Vincent-only) and go directly to bridge
            setCurrentStep("bridge");
        }
    }, [depositSuccess, currentStep, depositHash]);

    // Handle rebalance success
    useEffect(() => {
        if (rebalanceSuccess && currentStep === "rebalance" && rebalanceHash) {
            setTxHashes((prev) => ({ ...prev, rebalance: rebalanceHash }));
            // Move to bridge step (manual)
            setCurrentStep("bridge");
        }
    }, [rebalanceSuccess, currentStep, rebalanceHash]);

    const handleApprove = async () => {
        if (!amount || !address) {
            console.error("Missing amount or address", { amount, address });
            setError("Please connect wallet and enter amount");
            return;
        }

        // Check if on correct chain
        if (chain?.id !== 11155111) {
            console.log("Wrong chain, switching to Sepolia...");
            try {
                await switchChain({ chainId: 11155111 });
            } catch (err) {
                console.error("Chain switch error:", err);
                setError("Please switch to Sepolia network");
                return;
            }
        }

        try {
            setError("");
            setCurrentStep("approve");

            const amountWei = parseUnits(amount, 6);
            console.log("Approving USDC:", {
                amount,
                amountWei: amountWei.toString(),
                vault: SEPOLIA_VAULT,
                address,
                chainId: chain?.id
            });

            const result = approveUSDC({
                address: USDC_SEPOLIA as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [SEPOLIA_VAULT as `0x${string}`, amountWei],
                chainId: 11155111, // Sepolia
            });
            
            console.log("ApproveUSDC called, result:", result);
        } catch (err: unknown) {
            console.error("Approval error:", err);
            setError(err instanceof Error ? err.message : "Approval failed");
            setCurrentStep("idle");
        }
    };

    const handleBridge = () => {
        // Open Nexus Dashboard with pre-filled parameters
        alert(
            `🌉 Manual Bridge Step:\n\n` +
                `1. Go to: https://nexus.availproject.org\n` +
                `2. Bridge ${amount} USDC from Sepolia to Base Sepolia\n` +
                `3. Execute on Base Sepolia:\n` +
                `   Contract: ${BASE_SEPOLIA_AAVE_ADAPTER}\n` +
                `   Function: deposit(address,uint256)\n` +
                `   Args: ${USDC_BASE_SEPOLIA}, ${parseUnits(amount, 6)}\n\n` +
                `Your event monitor will show when complete!`
        );

        // Open Nexus in new window
        window.open("https://nexus.availproject.org", "_blank");
        setCurrentStep("complete");
    };

    const getStepStatus = (step: Step) => {
        const steps: Step[] = [
            "approve",
            "deposit",
            "rebalance",
            "bridge",
            "complete",
        ];
        const currentIndex = steps.indexOf(currentStep);
        const stepIndex = steps.indexOf(step);

        if (stepIndex < currentIndex) return "complete";
        if (stepIndex === currentIndex) return "active";
        return "pending";
    };

    const getProgressPercentage = () => {
        const steps: Step[] = [
            "idle",
            "approve",
            "deposit",
            "bridge",
            "complete",
        ];
        const index = steps.indexOf(currentStep);
        // Skip rebalance step, so recalculate based on 5 steps total
        return (index / (steps.length - 1)) * 100;
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Cross-Chain Yield Deposit</CardTitle>
                <CardDescription>
                    Deposit USDC on Sepolia → Bridge via Avail Nexus → Stake on
                    Base Sepolia Aave
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                            {Math.round(getProgressPercentage())}%
                        </span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Step Indicators */}
                <div className="flex items-center justify-between">
                    <StepIndicator
                        title="Approve"
                        status={getStepStatus("approve")}
                        hash={txHashes.approve}
                    />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <StepIndicator
                        title="Deposit"
                        status={getStepStatus("deposit")}
                        hash={txHashes.deposit}
                    />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <StepIndicator
                        title="Bridge"
                        status={getStepStatus("bridge")}
                    />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <StepIndicator
                        title="Complete"
                        status={getStepStatus("complete")}
                    />
                </div>

                {/* Amount Input */}
                {currentStep === "idle" && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (USDC)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="10"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.000001"
                            />
                            <p className="text-sm text-gray-500">
                                Deposit USDC on Sepolia, automatically bridge to
                                Base Sepolia, and stake in Aave
                            </p>
                        </div>

                        <Button
                            onClick={handleApprove}
                            disabled={
                                !amount || !address || Number(amount) <= 0
                            }
                            className="w-full"
                            size="lg"
                        >
                            Start Cross-Chain Deposit
                        </Button>
                    </div>
                )}

                {/* Approve Step */}
                {currentStep === "approve" && !approveSuccess && (
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
                        <div>
                            <p className="font-medium">Approving USDC...</p>
                            <p className="text-sm text-gray-500">
                                Please confirm the transaction in your wallet
                            </p>
                        </div>
                    </div>
                )}

                {/* Deposit Step */}
                {currentStep === "deposit" && (
                    <div className="text-center space-y-4">
                        {!depositSuccess ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
                                <div>
                                    <p className="font-medium">
                                        Depositing to Sepolia Vault...
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatUnits(parseUnits(amount, 6), 6)}{" "}
                                        USDC
                                    </p>
                                </div>
                                <Button
                                    onClick={handleDeposit}
                                    disabled
                                    className="w-full"
                                >
                                    Processing...
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleDeposit} className="w-full">
                                Confirm Deposit
                            </Button>
                        )}
                    </div>
                )}

                {/* Rebalance Step */}
                {currentStep === "rebalance" && (
                    <div className="text-center space-y-4">
                        {!rebalanceSuccess ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
                                <div>
                                    <p className="font-medium">
                                        Initiating Cross-Chain Rebalance...
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        From Aave Sepolia to Aave Base Sepolia
                                    </p>
                                    {rebalanceHash && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500">Transaction Hash:</p>
                                            <a 
                                                href={`https://sepolia.etherscan.io/tx/${rebalanceHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-teal-600 hover:underline break-all"
                                            >
                                                {rebalanceHash}
                                            </a>
                                            {rebalanceConfirming && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Waiting for confirmation... This may take a few minutes.
                                                </p>
                                            )}
                                            {rebalanceReceiptError && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    Transaction failed or timed out
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleRebalance}
                                        disabled
                                        className="w-full"
                                    >
                                        Processing...
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setCurrentStep("idle");
                                            setError("");
                                            setTxHashes({ approve: "", deposit: "", rebalance: "" });
                                        }}
                                        variant="outline"
                                        className="w-32"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <Button
                                onClick={handleRebalance}
                                className="w-full"
                            >
                                Execute Rebalance
                            </Button>
                        )}
                    </div>
                )}

                {/* Bridge Step */}
                {currentStep === "bridge" && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertDescription className="space-y-3">
                                <p className="font-medium">
                                    ✅ Deposit Complete! Now Bridge to Base Sepolia
                                </p>
                                <div className="text-sm space-y-2">
                                    <p>Your {amount} USDC is now in the Sepolia vault. To complete the cross-chain flow:</p>
                                    <ol className="list-decimal list-inside space-y-1 pl-2">
                                        <li>Withdraw USDC from the Sepolia vault</li>
                                        <li>Bridge via Avail Nexus to Base Sepolia</li>
                                        <li>Deposit into Aave on Base Sepolia</li>
                                    </ol>
                                    <p className="text-amber-600 mt-2">
                                        ℹ️ Note: The <code className="bg-gray-200 px-1 rounded">executeRebalance</code> function is restricted to Vincent (automated backend) only. For this demo, we'll bridge manually.
                                    </p>
                                </div>
                            </AlertDescription>
                        </Alert>

                        <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                            <p className="font-medium">Manual Bridge Steps:</p>
                            
                            <div className="space-y-2">
                                <p className="font-medium text-gray-700">Step 1: Withdraw from Vault</p>
                                <div className="bg-white p-2 rounded border">
                                    <p className="text-xs text-gray-600">Call on Sepolia Vault:</p>
                                    <code className="text-xs">withdraw({amount * 1000000}) to your address</code>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="font-medium text-gray-700">Step 2: Bridge via Nexus</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                                    <li>Amount: {amount} USDC</li>
                                    <li>From: Ethereum Sepolia (11155111)</li>
                                    <li>To: Base Sepolia (84532)</li>
                                    <li className="break-all">USDC: {USDC_SEPOLIA}</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <p className="font-medium text-gray-700">Step 3: Deposit on Base</p>
                                <div className="bg-white p-2 rounded border">
                                    <p className="text-xs text-gray-600">Call on Base Aave Adapter:</p>
                                    <code className="text-xs break-all">{BASE_SEPOLIA_AAVE_ADAPTER}.deposit(amount)</code>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleBridge}
                            className="w-full"
                            size="lg"
                        >
                            Open Avail Nexus Dashboard
                        </Button>

                        <p className="text-xs text-center text-gray-500">
                            Future: Vincent automation will handle this entire flow automatically
                        </p>
                    </div>
                )}

                {/* Complete Step */}
                {currentStep === "complete" && (
                    <div className="text-center space-y-4">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
                        <div>
                            <p className="text-lg font-medium">
                                Cross-Chain Deposit In Progress!
                            </p>
                            <p className="text-sm text-gray-500">
                                Complete the bridge on Avail Nexus Dashboard
                            </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-left space-y-2">
                            <p className="font-medium">Transaction Summary:</p>
                            <ul className="space-y-1">
                                {txHashes.approve && (
                                    <li className="flex items-start gap-2">
                                        <span className="font-medium">
                                            Approve:
                                        </span>
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${txHashes.approve}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-teal-600 hover:underline truncate flex-1"
                                        >
                                            {txHashes.approve.slice(0, 10)}...
                                            {txHashes.approve.slice(-8)}
                                        </a>
                                    </li>
                                )}
                                {txHashes.deposit && (
                                    <li className="flex items-start gap-2">
                                        <span className="font-medium">
                                            Deposit:
                                        </span>
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${txHashes.deposit}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-teal-600 hover:underline truncate flex-1"
                                        >
                                            {txHashes.deposit.slice(0, 10)}...
                                            {txHashes.deposit.slice(-8)}
                                        </a>
                                    </li>
                                )}
                                {txHashes.rebalance && (
                                    <li className="flex items-start gap-2">
                                        <span className="font-medium">
                                            Rebalance:
                                        </span>
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${txHashes.rebalance}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-teal-600 hover:underline truncate flex-1"
                                        >
                                            {txHashes.rebalance.slice(0, 10)}...
                                            {txHashes.rebalance.slice(-8)}
                                        </a>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <Button
                            onClick={() => {
                                setCurrentStep("idle");
                                setAmount("");
                                setTxHashes({});
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            Make Another Deposit
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function StepIndicator({
    title,
    status,
    hash,
}: {
    title: string;
    status: "complete" | "active" | "pending";
    hash?: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            {status === "complete" && (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
            )}
            {status === "active" && (
                <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
            )}
            {status === "pending" && (
                <Circle className="h-6 w-6 text-gray-300" />
            )}
            <span
                className={`text-xs font-medium ${
                    status === "complete"
                        ? "text-green-600"
                        : status === "active"
                        ? "text-teal-600"
                        : "text-gray-400"
                }`}
            >
                {title}
            </span>
        </div>
    );
}
