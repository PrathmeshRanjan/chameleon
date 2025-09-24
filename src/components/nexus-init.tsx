/**
 * Use this component to only initialize Nexus when required or with a button click
 * Remove the use effect in @NexusProvider to stop auto init process
 */

import { useAccount } from "wagmi";
import Button from "./ui/button";
import { useNexus } from "@/providers/NexusProvider";
import { ClockFading } from "lucide-react";
import { useState } from "react";

const NexusInitButton = () => {
  const { status } = useAccount();
  const { handleInit, nexusSDK } = useNexus();
  const [loading, setLoading] = useState(false);

  const handleInitWithLoading = async () => {
    setLoading(true);
    await handleInit();
    setLoading(false);
  };

  if (status === "connected" && !nexusSDK?.isInitialized()) {
    return (
      <Button onClick={handleInitWithLoading}>
        {loading ? (
          <ClockFading className="animate-spin size-5 text-primary-foreground" />
        ) : (
          "Connect Nexus"
        )}
      </Button>
    );
  }

  return null;
};

export default NexusInitButton;
