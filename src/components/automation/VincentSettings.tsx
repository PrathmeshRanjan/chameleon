import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Settings, Shield, AlertCircle, Zap, Save } from "lucide-react";
import type { UserGuardrails } from "@/types/yield";

interface VincentSettingsProps {
  currentGuardrails: UserGuardrails | null;
  isLoading: boolean;
  isUpdating: boolean;
  onUpdate: (guardrails: Omit<UserGuardrails, "lastUpdated">) => Promise<void>;
  className?: string;
}

export const VincentSettings = ({
  currentGuardrails,
  isLoading,
  isUpdating,
  onUpdate,
  className = "",
}: VincentSettingsProps) => {
  // Form state
  const [maxSlippageBps, setMaxSlippageBps] = useState(100);
  const [gasCeilingUSD, setGasCeilingUSD] = useState(5);
  const [minAPYDiffBps, setMinAPYDiffBps] = useState(50);
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current guardrails into form
  useEffect(() => {
    if (currentGuardrails) {
      setMaxSlippageBps(currentGuardrails.maxSlippageBps);
      setGasCeilingUSD(currentGuardrails.gasCeilingUSD);
      setMinAPYDiffBps(currentGuardrails.minAPYDiffBps);
      setAutoRebalanceEnabled(currentGuardrails.autoRebalanceEnabled);
      setHasChanges(false);
    }
  }, [currentGuardrails]);

  // Track changes
  useEffect(() => {
    if (currentGuardrails) {
      const changed =
        maxSlippageBps !== currentGuardrails.maxSlippageBps ||
        gasCeilingUSD !== currentGuardrails.gasCeilingUSD ||
        minAPYDiffBps !== currentGuardrails.minAPYDiffBps ||
        autoRebalanceEnabled !== currentGuardrails.autoRebalanceEnabled;
      setHasChanges(changed);
    }
  }, [maxSlippageBps, gasCeilingUSD, minAPYDiffBps, autoRebalanceEnabled, currentGuardrails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onUpdate({
        maxSlippageBps,
        gasCeilingUSD,
        minAPYDiffBps,
        autoRebalanceEnabled,
      });
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update guardrails");
    }
  };

  const bpsToPercent = (bps: number) => (bps / 100).toFixed(2);
  const percentToBps = (percent: string) => Math.round(parseFloat(percent) * 100);

  return (
    <Card className={`bg-white/90 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Settings className="size-5 text-teal-600" />
          Vincent Automation Settings
        </CardTitle>
        <CardDescription>
          Configure safety guardrails and automation preferences for Vincent-managed rebalancing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auto-Rebalance Toggle */}
          <div className="flex items-start justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100">
            <div className="flex items-start gap-3">
              <Zap className="size-5 text-teal-600 mt-0.5" />
              <div>
                <label htmlFor="auto-rebalance" className="font-semibold text-gray-900 cursor-pointer">
                  Auto-Rebalancing
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Allow Vincent to automatically rebalance your funds to maximize yield
                </p>
              </div>
            </div>
            <button
              id="auto-rebalance"
              type="button"
              onClick={() => setAutoRebalanceEnabled(!autoRebalanceEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                autoRebalanceEnabled ? "bg-teal-600" : "bg-gray-200"
              }`}
              role="switch"
              aria-checked={autoRebalanceEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoRebalanceEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <Separator />

          {/* Guardrails Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="size-4" />
              <h3 className="font-semibold">Safety Guardrails</h3>
            </div>

            {/* Max Slippage */}
            <div className="space-y-2">
              <Label htmlFor="slippage" className="text-sm font-medium">
                Maximum Slippage Tolerance
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="slippage"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  value={bpsToPercent(maxSlippageBps)}
                  onChange={(e) => setMaxSlippageBps(percentToBps(e.target.value))}
                  className="flex-1"
                  disabled={isUpdating}
                />
                <span className="text-sm text-gray-600 min-w-[60px]">
                  {bpsToPercent(maxSlippageBps)}%
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Maximum allowed slippage during rebalancing (max 10%)
              </p>
            </div>

            {/* Gas Ceiling */}
            <div className="space-y-2">
              <Label htmlFor="gas" className="text-sm font-medium">
                Gas Cost Ceiling
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="gas"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={gasCeilingUSD}
                  onChange={(e) => setGasCeilingUSD(parseInt(e.target.value) || 1)}
                  className="flex-1"
                  disabled={isUpdating}
                />
                <span className="text-sm text-gray-600 min-w-[60px]">${gasCeilingUSD}</span>
              </div>
              <p className="text-xs text-gray-500">
                Maximum gas cost you're willing to pay for a rebalance (max $100)
              </p>
            </div>

            {/* Min APY Difference */}
            <div className="space-y-2">
              <Label htmlFor="apy-diff" className="text-sm font-medium">
                Minimum APY Differential
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="apy-diff"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bpsToPercent(minAPYDiffBps)}
                  onChange={(e) => setMinAPYDiffBps(percentToBps(e.target.value))}
                  className="flex-1"
                  disabled={isUpdating}
                />
                <span className="text-sm text-gray-600 min-w-[60px]">
                  {bpsToPercent(minAPYDiffBps)}%
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Minimum APY improvement required to trigger a rebalance
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="size-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Last Updated */}
          {currentGuardrails && (
            <div className="text-xs text-gray-500">
              Last updated:{" "}
              {new Date(currentGuardrails.lastUpdated * 1000).toLocaleString()}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            disabled={!hasChanges || isUpdating || isLoading}
          >
            {isUpdating ? (
              <>
                <span className="animate-pulse">Updating...</span>
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>

          {!hasChanges && currentGuardrails && (
            <p className="text-xs text-center text-gray-500">No changes to save</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default VincentSettings;
