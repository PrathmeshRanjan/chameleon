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
    const { handleInit, nexusSDK, isInitializing } = useNexus();
    const [error, setError] = useState<string | null>(null);

    const handleInitWithLoading = async () => {
        if (isInitializing) return; // Prevent multiple clicks

        setError(null);

        try {
            console.log("Starting Nexus initialization...");
            await handleInit();
            console.log("Nexus initialization completed");

            // Wait a moment to check if initialization was successful
            setTimeout(() => {
                if (!nexusSDK?.isInitialized()) {
                    setError("Nexus initialization failed. Please try again.");
                }
            }, 2000);
        } catch (err) {
            console.error("Nexus initialization error:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to initialize Nexus"
            );
        }
    };

    // Don't show button if already initialized
    if (nexusSDK?.isInitialized()) {
        return null;
    }

    // Only show button when wallet is connected
    if (status !== "connected") {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <Button onClick={handleInitWithLoading} disabled={isInitializing}>
                {isInitializing ? (
                    <ClockFading className="animate-spin size-5 text-primary-foreground" />
                ) : (
                    "Connect Nexus"
                )}
            </Button>
            {error && (
                <p className="text-sm text-red-600 text-center max-w-xs">
                    {error}
                </p>
            )}
        </div>
    );
};

export default NexusInitButton;
