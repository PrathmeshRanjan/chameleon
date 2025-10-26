/* eslint-disable react-refresh/only-export-components */
import useInitNexus from "@/hooks/useInitNexus";
import {
    NexusSDK,
    type OnAllowanceHookData,
    type OnIntentHookData,
} from "@avail-project/nexus-core";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useAccount } from "wagmi";

interface NexusContextType {
    nexusSDK: NexusSDK | null;
    intentRefCallback: React.RefObject<OnIntentHookData | null>;
    allowanceRefCallback: React.RefObject<OnAllowanceHookData | null>;
    handleInit: () => Promise<void>;
    isInitializing: boolean;
}

const NexusContext = createContext<NexusContextType | null>(null);

const NexusProvider = ({ children }: { children: React.ReactNode }) => {
    const sdk = useMemo(
        () =>
            new NexusSDK({
                network: "mainnet",
                debug: true,
            }),
        []
    );
    const { status } = useAccount();
    const {
        nexusSDK,
        initializeNexus,
        deinitializeNexus,
        attachEventHooks,
        intentRefCallback,
        allowanceRefCallback,
    } = useInitNexus(sdk);

    const [isInitializing, setIsInitializing] = useState(false);

    const handleInit = useCallback(async () => {
        if (sdk.isInitialized()) {
            console.log("Nexus already initialized");
            return;
        }

        if (isInitializing) {
            console.log("Nexus initialization already in progress");
            return;
        }

        if (nexusSDK) {
            console.log("Nexus SDK already available");
            return;
        }

        // Only initialize if we have a connected wallet
        if (status !== "connected") {
            console.log("Wallet not connected, skipping Nexus initialization");
            return;
        }

        setIsInitializing(true);
        try {
            console.log("Initializing Nexus SDK...");
            await initializeNexus();
            attachEventHooks();
            console.log("Nexus SDK initialization completed");
        } catch (error) {
            console.error("Failed to initialize Nexus:", error);
        } finally {
            setIsInitializing(false);
        }
    }, [
        sdk,
        status,
        isInitializing,
        nexusSDK,
        attachEventHooks,
        initializeNexus,
    ]);
    useEffect(() => {
        /**
         * Uncomment to initialize Nexus SDK as soon as wallet is connected
         */
        // if (status === "connected") {
        //   handleInit();
        // }
        if (status === "disconnected") {
            deinitializeNexus();
        }
    }, [status, deinitializeNexus]);

    const value = useMemo(
        () => ({
            nexusSDK,
            intentRefCallback,
            allowanceRefCallback,
            handleInit,
            isInitializing,
        }),
        [
            nexusSDK,
            intentRefCallback,
            allowanceRefCallback,
            handleInit,
            isInitializing,
        ]
    );

    return (
        <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
    );
};

export function useNexus() {
    const context = useContext(NexusContext);
    if (!context) {
        throw new Error("useNexus must be used within a NexusProvider");
    }
    return context;
}

export default NexusProvider;
