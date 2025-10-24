import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AutomationStatus } from "./AutomationStatus";
import { VincentSettings } from "./VincentSettings";
import { RebalanceHistory } from "./RebalanceHistory";
import { useVincent } from "@/hooks/useVincent";
import { Skeleton } from "../ui/skeleton";
import { AlertCircle } from "lucide-react";

interface AutomationDashboardProps {
  vaultAddress: `0x${string}`;
  className?: string;
}

export const AutomationDashboard = ({
  vaultAddress,
  className = "",
}: AutomationDashboardProps) => {
  const {
    userGuardrails,
    vincentAddress,
    rebalanceHistory,
    vincentStatus,
    isLoadingGuardrails,
    isUpdatingGuardrails,
    updateGuardrails,
  } = useVincent({ vaultAddress });

  if (isLoadingGuardrails) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Vincent Not Configured Warning */}
      {!vincentAddress && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-900">
              Vincent Automation Not Configured
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              The vault owner needs to set the Vincent automation address before you can use
              automated rebalancing features.
            </p>
          </div>
        </div>
      )}

      {/* Status Widget (Always Visible) */}
      <AutomationStatus status={vincentStatus} />

      {/* Tabs for Settings and History */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <VincentSettings
            currentGuardrails={userGuardrails}
            isLoading={isLoadingGuardrails}
            isUpdating={isUpdatingGuardrails}
            onUpdate={updateGuardrails}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RebalanceHistory history={rebalanceHistory} />
        </TabsContent>
      </Tabs>

      {/* Vincent Info Footer */}
      {vincentAddress && (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Vincent Automation Address</p>
          <code className="text-xs font-mono text-gray-700">{vincentAddress}</code>
        </div>
      )}
    </div>
  );
};

export default AutomationDashboard;
