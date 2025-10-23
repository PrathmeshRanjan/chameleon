import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TrendingUp, Activity, DollarSign } from "lucide-react";
import type { YieldOpportunity } from "@/types/yield";

// Mock data - will be replaced with real Pyth price feed data
const mockYieldOpportunities: YieldOpportunity[] = [
    {
        protocolName: "Aave V3",
        protocolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        chainId: 42161, // Arbitrum
        chainName: "Arbitrum",
        asset: "USDC",
        apy: 5.23,
        tvl: "$1.2B",
        lastUpdated: Date.now(),
        riskScore: 9,
    },
    {
        protocolName: "Compound V3",
        protocolAddress: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
        chainId: 1, // Ethereum
        chainName: "Ethereum",
        asset: "USDC",
        apy: 4.87,
        tvl: "$890M",
        lastUpdated: Date.now(),
        riskScore: 9,
    },
    {
        protocolName: "Yearn Finance",
        protocolAddress: "0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE",
        chainId: 1,
        chainName: "Ethereum",
        asset: "USDC",
        apy: 4.12,
        tvl: "$456M",
        lastUpdated: Date.now(),
        riskScore: 8,
    },
    {
        protocolName: "Aave V3",
        protocolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        chainId: 10, // Optimism
        chainName: "Optimism",
        asset: "USDC",
        apy: 3.98,
        tvl: "$234M",
        lastUpdated: Date.now(),
        riskScore: 9,
    },
];

const YieldDashboard = () => {
    const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([]);
    const [topApy, setTopApy] = useState<number>(0);

    useEffect(() => {
        // Initialize with mock data
        setOpportunities(mockYieldOpportunities);
        const highest = Math.max(...mockYieldOpportunities.map((o) => o.apy));
        setTopApy(highest);

        // TODO: Replace with real Pyth price feed integration
        // const interval = setInterval(() => {
        //   fetchYieldData();
        // }, 60000); // Update every minute

        // return () => clearInterval(interval);
    }, []);

    const getRiskColor = (score: number) => {
        if (score >= 8) return "text-green-600";
        if (score >= 6) return "text-yellow-600";
        return "text-red-600";
    };

    const getRiskBgColor = (score: number) => {
        if (score >= 8) return "bg-green-50";
        if (score >= 6) return "bg-yellow-50";
        return "bg-red-50";
    };

    return (
        <Card className="w-full max-w-6xl mx-auto bg-white/90 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Activity className="size-6 text-teal-600" />
                            Live Yield Opportunities
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-2">
                            Real-time APY tracking across multiple protocols and
                            chains
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Best APY</p>
                        <p className="text-3xl font-bold text-teal-600">
                            {topApy.toFixed(2)}%
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {opportunities
                        .sort((a, b) => b.apy - a.apy)
                        .map((opp, index) => (
                            <div
                                key={`${opp.protocolAddress}-${opp.chainId}`}
                                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                                    index === 0
                                        ? "border-teal-200 bg-teal-50/50"
                                        : "border-gray-200 hover:border-teal-200"
                                }`}
                            >
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    {/* Protocol Info */}
                                    <div className="col-span-4">
                                        <div className="flex items-center gap-3">
                                            {index === 0 && (
                                                <TrendingUp className="size-5 text-teal-600" />
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {opp.protocolName}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {opp.chainName} •{" "}
                                                    {opp.asset}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* APY */}
                                    <div className="col-span-2 text-center">
                                        <p className="text-2xl font-bold text-teal-600">
                                            {opp.apy}%
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            APY
                                        </p>
                                    </div>

                                    {/* TVL */}
                                    <div className="col-span-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <DollarSign className="size-4 text-gray-400" />
                                            <p className="text-sm font-medium text-gray-700">
                                                {opp.tvl}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            TVL
                                        </p>
                                    </div>

                                    {/* Risk Score */}
                                    <div className="col-span-2 text-center">
                                        <div
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getRiskBgColor(
                                                opp.riskScore
                                            )}`}
                                        >
                                            <span
                                                className={`text-sm font-semibold ${getRiskColor(
                                                    opp.riskScore
                                                )}`}
                                            >
                                                {opp.riskScore}/10
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Risk Score
                                        </p>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2 text-right">
                                        {index === 0 ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                                                <span className="size-2 bg-teal-600 rounded-full animate-pulse"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">
                                                Available
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                {/* Footer Note */}
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-900">
                        <span className="font-semibold">
                            Powered by Pyth Network:
                        </span>{" "}
                        Real-time price feeds updated every 30 seconds. Gas
                        costs and slippage estimates included.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default YieldDashboard;
