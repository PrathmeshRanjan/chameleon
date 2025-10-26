import type {
    EthereumProvider,
    NexusSDK,
    OnAllowanceHookData,
    OnIntentHookData,
} from "@avail-project/nexus-core";
import { useRef, useState } from "react";

import { useAccount } from "wagmi";

const useInitNexus = (sdk: NexusSDK) => {
    const { connector } = useAccount();
    const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
    const intentRefCallback = useRef<OnIntentHookData | null>(null);
    const allowanceRefCallback = useRef<OnAllowanceHookData | null>(null);
    const [hooksAttached, setHooksAttached] = useState(false);

    const initializeNexus = async () => {
        try {
            if (sdk.isInitialized()) {
                console.log("Nexus already initialized");
                throw new Error("Nexus is already initialized");
            }

            const provider =
                (await connector?.getProvider()) as EthereumProvider;
            if (!provider) {
                console.error("No provider found for Nexus initialization");
                throw new Error("No provider found");
            }

            console.log("Getting wallet provider for Nexus...");
            console.log("Initializing Nexus SDK...");
            await sdk.initialize(provider);
            console.log("Nexus SDK initialized successfully");
            setNexusSDK(sdk);
        } catch (error) {
            console.error("Error initializing Nexus:", error);
            // Don't rethrow the error to prevent repeated initialization attempts
            setNexusSDK(null);
            throw error; // Re-throw to let the caller handle it
        }
    };

    const deinitializeNexus = async () => {
        try {
            if (!sdk.isInitialized())
                throw new Error("Nexus is not initialized");
            await sdk.deinit();
            setNexusSDK(null);
            setHooksAttached(false);
            console.log("Nexus deinitialized");
        } catch (error) {
            console.error("Error deinitializing Nexus:", error);
        }
    };

    const attachEventHooks = () => {
        // Only attach hooks if not already attached and SDK is initialized
        if (sdk.isInitialized() && !hooksAttached) {
            console.log("Attaching Nexus event hooks...");

            // Delay hook attachment to prevent immediate network operations
            setTimeout(() => {
                sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
                    console.log("Nexus allowance hook triggered:", data);
                    // Store the data but don't automatically process it
                    allowanceRefCallback.current = data;
                });

                sdk.setOnIntentHook((data: OnIntentHookData) => {
                    console.log("Nexus intent hook triggered:", data);
                    // Store the data but don't automatically process it
                    intentRefCallback.current = data;
                });

                setHooksAttached(true);
                console.log("Nexus event hooks attached");
            }, 2000); // Delay by 2 seconds to let initialization settle
        }
    };

    return {
        nexusSDK,
        initializeNexus,
        deinitializeNexus,
        attachEventHooks,
        intentRefCallback,
        allowanceRefCallback,
    };
};

export default useInitNexus;
