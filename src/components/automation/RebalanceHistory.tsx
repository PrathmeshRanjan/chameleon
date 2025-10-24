import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { History, ArrowRight, ExternalLink } from "lucide-react";
import type { RebalanceEvent } from "@/types/yield";

interface RebalanceHistoryProps {
  history: RebalanceEvent[];
  className?: string;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  42161: "Arbitrum",
  8453: "Base",
  137: "Polygon",
};

const CHAIN_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  42161: "https://arbiscan.io",
  8453: "https://basescan.org",
  137: "https://polygonscan.com",
};

export const RebalanceHistory = ({ history, className = "" }: RebalanceHistoryProps) => {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount) / 1e6; // Assuming 6 decimals for USDC
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatAPY = (bps: number) => {
    return (bps / 100).toFixed(2);
  };

  const getChainName = (chainId: number) => {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
  };

  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorer = CHAIN_EXPLORERS[chainId];
    return explorer ? `${explorer}/tx/${txHash}` : null;
  };

  if (history.length === 0) {
    return (
      <Card className={`bg-white/90 backdrop-blur-sm ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="size-5 text-gray-400" />
            Rebalance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No rebalances yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Enable auto-rebalancing to start optimizing your yields
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/90 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="size-5 text-teal-600" />
          Rebalance History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.map((event, index) => (
            <div
              key={`${event.txHash}-${index}`}
              className="p-3 rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
            >
              {/* Header: Time and Amount */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatAmount(event.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">APY Gain</p>
                  <p className="text-sm font-semibold text-green-600">
                    +{formatAPY(event.apyGain)}%
                  </p>
                </div>
              </div>

              {/* Route: From -> To */}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="font-medium">Protocol {event.fromProtocol}</span>
                <span className="text-gray-400">@{getChainName(event.srcChain)}</span>
                <ArrowRight className="size-3 text-gray-400" />
                <span className="font-medium">Protocol {event.toProtocol}</span>
                <span className="text-gray-400">@{getChainName(event.dstChain)}</span>
              </div>

              {/* Transaction Link */}
              {event.txHash && getExplorerUrl(event.srcChain, event.txHash) && (
                <a
                  href={getExplorerUrl(event.srcChain, event.txHash) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-2"
                >
                  View on Explorer
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Total Rebalances</p>
                <p className="text-lg font-semibold text-gray-900">{history.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg APY Gain</p>
                <p className="text-lg font-semibold text-green-600">
                  +
                  {(
                    history.reduce((sum, e) => sum + e.apyGain, 0) /
                    history.length /
                    100
                  ).toFixed(2)}
                  %
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RebalanceHistory;
