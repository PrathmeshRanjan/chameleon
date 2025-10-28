import { useState, useEffect, useCallback } from "react";
import {
    useAccount,
    useWriteContract,
    useWaitForTransactionReceipt,
    useSwitchChain,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle2,
    Circle,
    Loader2,
    ArrowRight,
    AlertCircle,
} from "lucide-react";
import { useNexus } from "@/providers/NexusProvider";

// Contract addresses - REVERSED FLOW: Base Sepolia → Sepolia
// Base Sepolia (Source - where user deposits)
const BASE_SEPOLIA_VAULT = "0x34Cc894DcF62f3A2c212Ca9275ed2D08393b0E81";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Nexus-supported USDC

// Sepolia (Destination - where funds are bridged to)
const SEPOLIA_AAVE_ADAPTER = "0xb472f5441d3A8cee6B5aca7Cda4363F371f88A81";
const USDC_SEPOLIA = "0xf08A50178dfcDe18524640EA6618a1f965821715"; // Nexus-supported USDC

// OLD FLOW (Sepolia → Base Sepolia)
// const SEPOLIA_VAULT = "0xaB1c63c782ee89913213e5e6cd15955Db0A0B366";
// const BASE_SEPOLIA_AAVE_ADAPTER = "0x73951d806B2f2896e639e75c413DD09bA52f61a6";

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
    const { nexusSDK, handleInit } = useNexus();
    const [amount, setAmount] = useState("");
    const [currentStep, setCurrentStep] = useState<Step>("idle");
    const [txHashes, setTxHashes] = useState<Record<string, string>>({});
    const [error, setError] = useState<string>("");
    const [bridging, setBridging] = useState(false);
    const [bridgeProgress, setBridgeProgress] = useState<string>("");

    // Log connection status
    useEffect(() => {
        console.log("Wallet status:", {
            address,
            chainId: chain?.id,
            chainName: chain?.name,
            isConnected: !!address,
        });
    }, [address, chain]);

    const {
        writeContract: approveUSDC,
        data: approveHash,
        error: approveError,
        isPending: _isApprovePending,
    } = useWriteContract();
    const {
        writeContract: depositToVault,
        data: depositHash,
        error: depositError,
    } = useWriteContract();
    const {
        writeContract: executeRebalance,
        data: rebalanceHash,
        error: rebalanceError,
    } = useWriteContract();

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

    // Log approval status changes
    useEffect(() => {
        console.log("Approval status changed:", {
            approveHash,
            approveSuccess,
            currentStep,
        });
    }, [approveHash, approveSuccess, currentStep]);
    const { isSuccess: depositSuccess } = useWaitForTransactionReceipt({
        hash: depositHash,
    });
    const {
        isSuccess: rebalanceSuccess,
        isLoading: rebalanceConfirming,
        isError: rebalanceReceiptError,
    } = useWaitForTransactionReceipt({
        hash: rebalanceHash,
    });

    // Define handlers first (before useEffect hooks that use them)
    const handleDeposit = useCallback(async () => {
        if (!amount || !address) return;

        try {
            const amountWei = parseUnits(amount, 6);

            depositToVault({
                address: BASE_SEPOLIA_VAULT as `0x${string}`,
                abi: VAULT_ABI,
                functionName: "deposit",
                args: [amountWei, address],
                chainId: 84532, // Base Sepolia
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
            // fromProtocol: 0 (Aave Base Sepolia), toProtocol: 1 (Aave Sepolia)
            executeRebalance({
                address: BASE_SEPOLIA_VAULT as `0x${string}`,
                abi: VAULT_ABI,
                functionName: "executeRebalance",
                args: [address, 0, 1, amountWei],
                chainId: 84532, // Base Sepolia
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
            console.log("✅ Approval confirmed! Moving to deposit step...");
            setTxHashes((prev) => ({ ...prev, approve: approveHash }));
            // Automatically move to deposit step
            setCurrentStep("deposit");
        }
    }, [approveSuccess, currentStep, approveHash]);

    // Auto-trigger deposit when step becomes "deposit" after approval
    useEffect(() => {
        if (currentStep === "deposit" && approveSuccess && !depositHash) {
            console.log("🚀 Auto-triggering deposit...");
            handleDeposit();
        }
    }, [currentStep, approveSuccess, depositHash, handleDeposit]);

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

    const handleApprove = useCallback(async () => {
        if (!amount || !address) return;

        try {
            if (chain?.id !== 84532) {
                console.log("Switching to Base Sepolia (chainId: 84532)...");
                await switchChain({ chainId: 84532 });
                return;
            }

            const amountWei = parseUnits(amount, 6);

            console.log("Approving USDC on Base Sepolia...");

            approveUSDC({
                address: USDC_BASE_SEPOLIA as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [BASE_SEPOLIA_VAULT as `0x${string}`, amountWei],
                chainId: 84532,
            });

            // Set step to approve after initiating transaction
            setCurrentStep("approve");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Approval failed");
            setCurrentStep("idle");
        }
    }, [amount, address, chain?.id, approveUSDC, switchChain]);
    const handleBridge = async () => {
        if (!nexusSDK) {
            setError("Nexus SDK not initialized. Initializing...");
            try {
                await handleInit();
                // Retry after initialization
                setTimeout(() => handleBridge(), 2000);
            } catch {
                setError(
                    "Failed to initialize Nexus SDK. Please refresh and try again."
                );
            }
            return;
        }

        if (!amount || !address) {
            setError("Missing amount or address");
            return;
        }

        setBridging(true);
        setBridgeProgress("Checking supported tokens...");
        setError("");

        try {
            const amountWei = parseUnits(amount, 6).toString();

            console.log("Nexus SDK initialized:", nexusSDK.isInitialized());
            console.log("Attempting bridge with params:", {
                token: "USDC",
                amount: amountWei,
                fromChain: 84532, // Base Sepolia
                toChain: 11155111, // Sepolia
                adapter: SEPOLIA_AAVE_ADAPTER,
            });

            setBridgeProgress("Initiating cross-chain bridge...");

            // Subscribe to ALL Nexus events for comprehensive tracking
            if (nexusSDK.nexusEvents) {
                // Expected steps
                nexusSDK.nexusEvents.on(
                    "bridgeAndExecute:expectedSteps",
                    (steps: unknown) => {
                        console.log("📋 Bridge steps:", steps);
                        const stepsArray = Array.isArray(steps) ? steps : [];
                        setBridgeProgress(
                            `Preparing bridge: ${stepsArray.length} steps total`
                        );
                    }
                );

                // Step completion
                nexusSDK.nexusEvents.on(
                    "bridgeAndExecute:stepComplete",
                    (step: {
                        stepNumber?: number;
                        totalSteps?: number;
                        type?: string;
                    }) => {
                        console.log("✅ Step complete:", step);
                        setBridgeProgress(
                            `Progress: Step ${step.stepNumber}/${
                                step.totalSteps
                            } - ${step.type || "Processing"}`
                        );
                    }
                );

                // Bridge started
                nexusSDK.nexusEvents.on(
                    "bridgeAndExecute:started",
                    (data: unknown) => {
                        console.log("🌉 Bridge started:", data);
                        setBridgeProgress("Bridge transaction initiated...");
                    }
                );

                // Transaction submitted
                nexusSDK.nexusEvents.on(
                    "bridgeAndExecute:txSubmitted",
                    (data: unknown) => {
                        console.log("📤 Transaction submitted:", data);
                        setBridgeProgress(
                            "Transaction submitted, waiting for confirmation..."
                        );
                    }
                );

                // Transaction confirmed
                nexusSDK.nexusEvents.on(
                    "bridgeAndExecute:txConfirmed",
                    (data: unknown) => {
                        console.log("✅ Transaction confirmed:", data);
                        setBridgeProgress(
                            "Transaction confirmed! Finalizing bridge..."
                        );
                    }
                );

                // Bridge completed
                nexusSDK.nexusEvents.on(
                    "bridgeAndExecute:completed",
                    (data: unknown) => {
                        console.log("🎉 Bridge completed:", data);
                        setBridgeProgress("Bridge completed successfully!");
                    }
                );

                // Transaction requests
                nexusSDK.nexusEvents.on(
                    "transactionRequest",
                    (data: unknown) => {
                        console.log("💳 Transaction request:", data);
                        setBridgeProgress("⏳ Waiting for wallet signature...");
                    }
                );

                // Errors
                nexusSDK.nexusEvents.on("error", (error: unknown) => {
                    console.error("❌ Nexus error event:", error);
                    setBridgeProgress("Error occurred, check console");
                });

                // Generic progress updates
                nexusSDK.nexusEvents.on("progress", (data: unknown) => {
                    console.log("📊 Progress update:", data);
                });
            }

            // Execute bridge (without auto-deposit, since adapter requires onlyVault)
            // The USDC will arrive in the user's wallet on Sepolia
            // User can then manually deposit into vault or we handle via Vincent automation
            const result = await nexusSDK.bridgeAndExecute({
                token: "USDC",
                amount: amountWei,
                toChainId: 11155111, // Sepolia
                sourceChains: [84532], // Base Sepolia
                recipient: address, // Send to user's wallet on Sepolia
                waitForReceipt: true,
                requiredConfirmations: 2,
            });

            console.log("🎯 Bridge result:", result);

            if (result.success) {
                console.log("✅ Bridge successful!");
                if (result.bridgeTxHash) {
                    console.log("🔗 Bridge transaction:", result.bridgeTxHash);
                    setTxHashes((prev) => ({
                        ...prev,
                        bridge: result.bridgeTxHash,
                    }));
                }
                setBridgeProgress("✅ Bridge completed successfully!");
                setCurrentStep("complete");
            } else {
                console.error("❌ Bridge failed:", result.error);
                throw new Error(result.error || "Bridge failed");
            }
        } catch (err: unknown) {
            console.error("❌ Bridge error:", err);
            const errorMessage =
                err instanceof Error ? err.message : "Unknown error";

            // Check for specific error types
            const isInsufficientBalance = errorMessage.includes(
                "Insufficient balance"
            );
            const isCorsError =
                errorMessage.includes("CORS") ||
                errorMessage.includes("fetch") ||
                errorMessage.includes("network");

            if (isInsufficientBalance) {
                setError(
                    `❌ Insufficient USDC balance on Base Sepolia.\n\n` +
                        `⚠️ Note: If you deposited into the vault, those funds are locked.\n` +
                        `You need USDC in your wallet (not vault) to bridge.\n\n` +
                        `Options:\n` +
                        `1. Skip the vault deposit step and bridge directly\n` +
                        `2. Use the Manual Bridge button below`
                );
            } else if (isCorsError) {
                setError(
                    `🌐 Network Error: CORS restriction detected.\n\n` +
                        `The Nexus SDK cannot make RPC calls from localhost due to CORS policies.\n\n` +
                        `💡 Solutions:\n` +
                        `1. Use browser extension "Allow CORS" for development\n` +
                        `2. Bridge manually using Nexus Dashboard\n` +
                        `3. Deploy to production (CORS issues are less common)\n\n` +
                        `👉 For now, please use the Manual Bridge button below.`
                );
            } else {
                setError(
                    `Bridge failed: ${errorMessage}\n\nℹ️ Please use the Nexus Dashboard manually: https://nexus.availproject.org`
                );
            }
            setBridgeProgress("");
        } finally {
            setBridging(false);
        }
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
                    Deposit USDC on Base Sepolia → Bridge via Avail Nexus to
                    Sepolia
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
                    />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <StepIndicator
                        title="Deposit"
                        status={getStepStatus("deposit")}
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
                                Deposit USDC on Base Sepolia, then bridge to
                                Ethereum Sepolia via Avail Nexus
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
                                        Depositing to Base Sepolia Vault...
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
                                            <p className="text-xs text-gray-500">
                                                Transaction Hash:
                                            </p>
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
                                                    Waiting for confirmation...
                                                    This may take a few minutes.
                                                </p>
                                            )}
                                            {rebalanceReceiptError && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    Transaction failed or timed
                                                    out
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
                                            setTxHashes({
                                                approve: "",
                                                deposit: "",
                                                rebalance: "",
                                            });
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
                                    ✅ Deposit Complete! Ready to Bridge
                                </p>
                                <div className="text-sm space-y-2">
                                    <p>
                                        Your {amount} USDC is deposited in the
                                        Base Sepolia vault. Bridge it to Sepolia
                                        to complete the cross-chain flow.
                                    </p>
                                    <div className="space-y-1">
                                        <p className="font-medium text-teal-600">
                                            🌉 Automatic Bridge:
                                        </p>
                                        <p className="text-xs">
                                            USDC will arrive in your wallet on
                                            Sepolia
                                        </p>
                                        <p className="text-xs text-amber-600">
                                            Note: Auto-deposit into Aave
                                            requires vault permissions (Vincent
                                            automation)
                                        </p>

                                        <p className="font-medium text-gray-600 mt-2">
                                            🔗 Manual Fallback:
                                        </p>
                                        <p className="text-xs">
                                            Use Nexus Dashboard if automatic
                                            bridge fails
                                        </p>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>

                        {bridgeProgress && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <p className="text-sm text-blue-700">
                                        {bridgeProgress}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                            <p className="font-medium">Bridge Parameters:</p>
                            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                                <li>Amount: {amount} USDC</li>
                                <li>From: Base Sepolia (84532)</li>
                                <li>To: Ethereum Sepolia (11155111)</li>
                                <li className="break-all">
                                    Source Token: {USDC_BASE_SEPOLIA}
                                </li>
                                <li className="break-all">
                                    Recipient: {address}
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleBridge}
                                className="flex-1"
                                size="lg"
                                disabled={bridging || !nexusSDK}
                            >
                                {bridging ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Bridging...
                                    </>
                                ) : !nexusSDK ? (
                                    "Initializing Nexus..."
                                ) : (
                                    "🌉 Auto-Bridge with Nexus"
                                )}
                            </Button>

                            <Button
                                onClick={() => {
                                    window.open(
                                        "https://nexus.availproject.org",
                                        "_blank"
                                    );
                                }}
                                variant="outline"
                                size="lg"
                                className="flex-1"
                            >
                                🔗 Manual Bridge
                            </Button>
                        </div>

                        {!nexusSDK && (
                            <p className="text-xs text-center text-amber-600">
                                Nexus SDK initializing... This may take a
                                moment.
                            </p>
                        )}

                        <div className="text-xs text-gray-500 space-y-1">
                            <p className="font-medium">
                                📝 Manual Bridge Instructions:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 pl-2">
                                <li>
                                    Click "Manual Bridge" to open Nexus
                                    Dashboard
                                </li>
                                <li>
                                    Connect your wallet and select Base Sepolia
                                    → Sepolia
                                </li>
                                <li>Bridge {amount} USDC</li>
                                <li>
                                    On Sepolia, deposit into adapter:{" "}
                                    {SEPOLIA_AAVE_ADAPTER.slice(0, 10)}...
                                </li>
                            </ol>
                        </div>

                        <p className="text-xs text-center text-gray-500">
                            💡 In production, Vincent automation handles this
                            automatically
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
                                            href={`https://base-sepolia.blockscout.com/tx/${txHashes.approve}`}
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
                                            href={`https://base-sepolia.blockscout.com/tx/${txHashes.deposit}`}
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
                                            href={`https://base-sepolia.blockscout.com/tx/${txHashes.rebalance}`}
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
}: {
    title: string;
    status: "complete" | "active" | "pending";
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
