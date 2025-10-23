import { useState } from "react";
import { useNexus } from "@/providers/NexusProvider";
import {
    SUPPORTED_CHAINS,
    type SUPPORTED_CHAINS_IDS,
    type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Button from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import ChainSelect from "../blocks/chain-select";
import TokenSelect from "../blocks/token-select";
import { DollarSign, TrendingUp, ShieldCheck, Loader2 } from "lucide-react";

const DepositCard = () => {
    const { nexusSDK, intentRefCallback } = useNexus();
    const [depositInputs, setDepositInputs] = useState<{
        chain: SUPPORTED_CHAINS_IDS | null;
        token: SUPPORTED_TOKENS | null;
        amount: string | null;
    }>({
        chain: SUPPORTED_CHAINS.ETHEREUM,
        token: "USDC",
        amount: null,
    });
    const [isDepositing, setIsDepositing] = useState(false);
    const [depositSuccess, setDepositSuccess] = useState(false);

    const handleDeposit = async () => {
        if (
            !depositInputs.chain ||
            !depositInputs.token ||
            !depositInputs.amount
        )
            return;

        setIsDepositing(true);
        setDepositSuccess(false);

        try {
            // For now, we'll use the bridge function
            // Later, this will interact with our YieldOptimizer contract
            const result = await nexusSDK?.bridge({
                token: depositInputs.token,
                amount: depositInputs.amount,
                chainId: depositInputs.chain,
            });

            if (result?.success) {
                console.log("Deposit successful:", result.explorerUrl);
                setDepositSuccess(true);
                // Reset form after successful deposit
                setTimeout(() => {
                    setDepositInputs({
                        ...depositInputs,
                        amount: null,
                    });
                    setDepositSuccess(false);
                }, 3000);
            }
        } catch (error) {
            console.error("Error during deposit:", error);
        } finally {
            setIsDepositing(false);
            intentRefCallback.current = null;
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    <DollarSign className="size-6 text-teal-600" />
                    Deposit Stablecoins
                </CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                    Deposit from any chain to start earning optimized yields
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Chain and Token Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <ChainSelect
                        selectedChain={
                            depositInputs?.chain ?? SUPPORTED_CHAINS.ETHEREUM
                        }
                        handleSelect={(chain) => {
                            setDepositInputs({ ...depositInputs, chain });
                        }}
                        chainLabel="Source Chain"
                    />
                    <TokenSelect
                        selectedChain={(
                            depositInputs?.chain ?? SUPPORTED_CHAINS.ETHEREUM
                        ).toString()}
                        selectedToken={depositInputs?.token ?? "USDC"}
                        handleTokenSelect={(token) =>
                            setDepositInputs({ ...depositInputs, token })
                        }
                        tokenLabel="Token"
                    />
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount</Label>
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
                        !depositInputs.token ||
                        !depositInputs.amount ||
                        isDepositing
                    }
                    className="w-full h-12 text-base"
                >
                    {isDepositing ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : depositSuccess ? (
                        "✓ Deposit Successful!"
                    ) : (
                        "Deposit & Start Earning"
                    )}
                </Button>

                {/* Progress Info */}
                {intentRefCallback?.current?.intent && (
                    <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-blue-900">
                            Transaction Progress
                        </p>
                        <p className="text-xs text-blue-700">
                            Processing your cross-chain deposit...
                        </p>
                    </div>
                )}

                {depositSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-900">
                            🎉 Deposit successful!
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                            Your funds are now being optimized for the best
                            yields
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DepositCard;
