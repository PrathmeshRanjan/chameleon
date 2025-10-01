import { useNexus } from "@/providers/NexusProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import Button from "../ui/button";
import {
  CHAIN_METADATA,
  type OnIntentHookData,
} from "@avail-project/nexus-core";
import { useState } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

const IntentModal = ({ intent }: { intent: OnIntentHookData }) => {
  const { intentRefCallback } = useNexus();
  const { intent: intentData, refresh, allow, deny } = intent;
  const [open, setOpen] = useState(!!intent);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatCost = (cost: string) => {
    const numCost = parseFloat(cost);
    if (numCost === 0) return "Free";
    if (numCost < 0.001) return "< 0.001";
    return numCost.toFixed(6);
  };

  const handleAllow = () => {
    if (isRefreshing) return;
    allow();
    setOpen(false);
  };

  const handleDeny = () => {
    console.log("deny called", intentRefCallback.current);
    deny();
    intentRefCallback.current = null;
    setOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh([intentData?.allSources?.length]);
    setIsRefreshing(false);
  };

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     handleRefresh();
  //   }, 15000);
  //   return () => clearInterval(interval);
  // }, []);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDeny()}>
      <DialogContent className="gap-y-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Confirm Transaction
          </DialogTitle>
          <DialogDescription>
            Please review the details of this transaction carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {/* Transaction Route */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-1 text-xs">
              {/* Multiple Source Chains */}
              <div className="flex flex-col gap-y-2 flex-1">
                {intentData.sources &&
                  intentData.sources.map((source, index) => (
                    <div
                      key={`${source.chainID}-${index}`}
                      className="flex flex-col justify-center items-center gap-y-1 px-3 py-2"
                    >
                      <img
                        src={CHAIN_METADATA[source.chainID]?.logo ?? ""}
                        alt={source.chainName ?? ""}
                        width={24}
                        height={24}
                        className="rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="flex items-center gap-x-2">
                        <div className="text-foreground font-bold text-center text-sm">
                          {source.amount} {intentData.token?.symbol}
                        </div>
                      </div>
                    </div>
                  ))}
                {/* Show total if multiple sources */}
                {intentData.sources &&
                  intentData.sources.length > 1 &&
                  intentData.sourcesTotal && (
                    <div className="text-xs text-center text-muted-foreground font-bold border-t border-muted pt-2">
                      Total: {intentData.sourcesTotal}{" "}
                      {intentData.token?.symbol}
                    </div>
                  )}
              </div>

              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

              {intentData.token && intentData.token.logo && (
                <img
                  src={intentData.token.logo}
                  alt={intentData.token.symbol}
                  className="rounded-full"
                  width={24}
                  height={24}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

              {/* Destination Chain */}
              <div className="flex flex-col justify-center items-center gap-y-1 px-3 py-2 flex-1">
                {intentData.destination && (
                  <>
                    <img
                      src={
                        CHAIN_METADATA[intentData.destination.chainID]?.logo ??
                        ""
                      }
                      alt={intentData.destination.chainName ?? ""}
                      width={24}
                      height={24}
                      className="rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="text-foreground font-bold text-center text-sm">
                      {intentData.destination.amount} {intentData.token?.symbol}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fees Section */}
          {intentData.fees && (
            <div className="space-y-3 mt-6">
              <div className="p-4 space-y-3">
                {/* Individual Fees */}
                <div className="space-y-2 font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Network Gas
                    </span>
                    <span className="text-sm">
                      {formatCost(intentData.fees.caGas ?? "0")}{" "}
                      {intentData.token?.symbol}
                    </span>
                  </div>

                  {intentData.fees.solver &&
                    parseFloat(intentData.fees.solver) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Solver Fee
                        </span>
                        <span className="text-sm">
                          {formatCost(intentData.fees.solver)}{" "}
                          {intentData.token?.symbol}
                        </span>
                      </div>
                    )}

                  {intentData.fees.protocol &&
                    parseFloat(intentData.fees.protocol) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Protocol Fee
                        </span>
                        <span className="text-sm font-medium">
                          {formatCost(intentData.fees.protocol)}{" "}
                          {intentData.token?.symbol}
                        </span>
                      </div>
                    )}

                  {intentData.fees.gasSupplied &&
                    parseFloat(intentData.fees.gasSupplied) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Additional Gas
                        </span>
                        <span className="text-sm font-medium">
                          {formatCost(intentData.fees.gasSupplied)}{" "}
                          {intentData.token?.symbol}
                        </span>
                      </div>
                    )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      Total Gas Cost
                    </span>
                    <span className="text-sm font-bold">
                      {formatCost(intentData.fees.total ?? "0")}{" "}
                      {intentData.token?.symbol}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Total Cost */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-primary">
                    Total Cost
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {formatCost(intentData.sourcesTotal ?? "0")}{" "}
                    {intentData.token?.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="w-11/12 pt-4 mx-auto">
          <div className="flex w-full justify-center items-center gap-4">
            <Button
              variant={"destructive"}
              onClick={handleDeny}
              className="bg-destructive/50 font-semibold w-1/2"
            >
              Deny
            </Button>
            <Button
              onClick={handleAllow}
              disabled={isRefreshing}
              className={cn(
                "font-semibold w-1/2",
                isRefreshing && "bg-gray-500 cursor-not-allowed",
              )}
            >
              {isRefreshing ? "Refreshing..." : "Allow"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntentModal;
