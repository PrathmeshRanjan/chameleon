import { useState, useEffect } from "react";
import { useYieldVault } from "@/hooks/useYieldVault";
import {
    SUPPORTED_CHAINS,
    type SUPPORTED_CHAINS_IDS,
} from "@avail-project/nexus-core";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Button from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import ChainSelect from "../blocks/chain-select";
import {
    DollarSign,
    TrendingUp,
    ShieldCheck,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Wallet,
} from "lucide-react";

// TODO: Replace with actual deployed vault address from environment variable
const VAULT_ADDRESS_BASE = (import.meta.env.VITE_VAULT_ADDRESS_BASE ||
    "0xd9a8d0c0cfcb7ce6d70a9d2674bea338e7c5223f") as `0x${string}`;

const DepositCard = () => {
    const {
        deposit: depositToVault,
        errorMessage,
        isApproving,
        isDepositing,
        isSuccess,
        isError,
        usdcBalance,
        userAssets,
        formatAssets,
    } = useYieldVault({
        vaultAddress: VAULT_ADDRESS_BASE,
        chainId: 8453, // Base mainnet
    });

    const [depositInputs, setDepositInputs] = useState<{
        chain: SUPPORTED_CHAINS_IDS | null;
        amount: string | null;
    }>({
        chain: SUPPORTED_CHAINS.BASE, // Default to Base where vault is deployed
        amount: null,
    });

    const handleDeposit = async () => {
        if (!depositInputs.amount || parseFloat(depositInputs.amount) <= 0)
            return;

        try {
            // Deposit directly to vault
            await depositToVault(depositInputs.amount);

            // Reset form after successful deposit
            setTimeout(() => {
                setDepositInputs((prev) => ({
                    ...prev,
                    amount: null,
                }));
            }, 3000);
        } catch (error) {
            console.error("Error during deposit:", error);
        }
    };

    // Auto-reset success state
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => {
                setDepositInputs((prev) => ({
                    ...prev,
                    amount: null,
                }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess]);

    return (
        <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    <DollarSign className="size-6 text-teal-600" />
                    Deposit Stablecoins
                </CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                    Deposit USDC on Base to start earning optimized yields
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Chain Selection (USDC only) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <ChainSelect
                            selectedChain={
                                depositInputs?.chain ?? SUPPORTED_CHAINS.BASE
                            }
                            handleSelect={(chain) => {
                                setDepositInputs({ ...depositInputs, chain });
                            }}
                            chainLabel="Source Chain"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Token</Label>
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50 cursor-not-allowed">
                            <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center">
                                <DollarSign className="size-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-700">
                                USDC
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                                Only
                            </span>
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="deposit-amount">Amount</Label>
                        {usdcBalance !== undefined && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Wallet className="size-3" />
                                Balance: {formatAssets(usdcBalance)} USDC
                            </span>
                        )}
                    </div>
                    <Input
                        id="deposit-amount"
                        type="number"
                        placeholder="0.00"
                        value={depositInputs?.amount ?? ""}
                        onChange={(e) =>
                            setDepositInputs({
                                ...depositInputs,
                                amount: e.target.value,
                            })
                        }
                        className="text-lg"
                    />
                    {userAssets !== undefined && userAssets > 0n && (
                        <p className="text-xs text-gray-500">
                            Your position: {formatAssets(userAssets)} USDC
                        </p>
                    )}
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-teal-50 rounded-lg">
                    <div className="flex items-start gap-2">
                        <TrendingUp className="size-4 text-teal-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium">
                                Auto-Optimization
                            </p>
                            <p className="text-xs text-gray-500">
                                Rebalances to best APY
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="size-4 text-teal-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium">Safety First</p>
                            <p className="text-xs text-gray-500">
                                Audited protocols only
                            </p>
                        </div>
                    </div>
                </div>

                {/* Deposit Button */}
                <Button
                    onClick={handleDeposit}
                    disabled={
                        !depositInputs.chain ||
                        !depositInputs.amount ||
                        isApproving ||
                        isDepositing
                    }
                    className="w-full h-12 text-base"
                >
                    {isApproving ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Approving USDC...
                        </>
                    ) : isDepositing ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Depositing...
                        </>
                    ) : isSuccess ? (
                        <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Deposited Successfully!
                        </>
                    ) : (
                        "Deposit & Start Earning"
                    )}
                </Button>

                {/* Error Message */}
                {isError && errorMessage && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-900">
                                Transaction Failed
                            </p>
                            <p className="text-xs text-red-700 mt-1">
                                {errorMessage}
                            </p>
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {isSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                        <CheckCircle2 className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-green-900">
                                🎉 Deposit successful!
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                                Your funds are now being optimized for the best
                                yields
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DepositCard;
