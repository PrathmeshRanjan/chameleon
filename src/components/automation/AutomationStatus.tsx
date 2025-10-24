import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Activity, CheckCircle2, Clock, TrendingUp, Zap } from "lucide-react";
import type { VincentStatus } from "@/types/yield";

interface AutomationStatusProps {
  status: VincentStatus;
  className?: string;
}

export const AutomationStatus = ({ status, className = "" }: AutomationStatusProps) => {
  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    return date.toLocaleDateString();
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "text-green-600" : "text-gray-400";
  };

  const getStatusBgColor = (isActive: boolean) => {
    return isActive ? "bg-green-50" : "bg-gray-50";
  };

  return (
    <Card className={`bg-white/90 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className={`size-5 ${getStatusColor(status.isActive)}`} />
          Vincent Automation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusBgColor(
            status.isActive
          )}`}
        >
          {status.isActive ? (
            <>
              <CheckCircle2 className="size-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Active</span>
            </>
          ) : (
            <>
              <Activity className="size-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Inactive</span>
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Last Rebalance */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Clock className="size-4" />
              <span className="text-xs font-medium">Last Rebalance</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatTimestamp(status.lastRebalance)}
            </p>
          </div>

          {/* Total Rebalances */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Activity className="size-4" />
              <span className="text-xs font-medium">Total Rebalances</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{status.totalRebalances}</p>
          </div>

          {/* Gas Saved */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <TrendingUp className="size-4" />
              <span className="text-xs font-medium">Gas Saved</span>
            </div>
            <p className="text-sm font-semibold text-green-600">${status.totalSaved}</p>
          </div>

          {/* Yield Gained */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <TrendingUp className="size-4" />
              <span className="text-xs font-medium">Extra Yield</span>
            </div>
            <p className="text-sm font-semibold text-teal-600">${status.totalYieldGained}</p>
          </div>
        </div>

        {/* Next Scheduled Rebalance */}
        {status.nextScheduledRebalance && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Next Check</span>
              <span className="text-xs font-medium text-gray-900">
                {formatTimestamp(status.nextScheduledRebalance)}
              </span>
            </div>
          </div>
        )}

        {/* Inactive Notice */}
        {!status.isActive && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Enable auto-rebalance in settings to activate Vincent automation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutomationStatus;
