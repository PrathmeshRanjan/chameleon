import { WagmiProvider, createConfig, http } from "wagmi";
import {
    mainnet,
    base,
    arbitrum,
    optimism,
    polygon,
    scroll,
    avalanche,
    sophon,
    kaia,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    polygonAmoy,
} from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NexusProvider from "./NexusProvider";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const config = createConfig(
    getDefaultConfig({
        chains: [
            mainnet,
            base,
            polygon,
            arbitrum,
            optimism,
            scroll,
            avalanche,
            sophon,
            kaia,
            sepolia,
            baseSepolia,
            arbitrumSepolia,
            optimismSepolia,
            polygonAmoy,
        ],
        transports: {
            [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
            [arbitrum.id]: http(arbitrum.rpcUrls.default.http[0]),
            [base.id]: http(base.rpcUrls.default.http[0]),
            [optimism.id]: http(optimism.rpcUrls.default.http[0]),
            [polygon.id]: http(polygon.rpcUrls.default.http[0]),
            [avalanche.id]: http(avalanche.rpcUrls.default.http[0]),
            [scroll.id]: http(scroll.rpcUrls.default.http[0]),
            [sophon.id]: http(sophon.rpcUrls.default.http[0]),
            [kaia.id]: http(kaia.rpcUrls.default.http[0]),
            [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
            [baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
            [arbitrumSepolia.id]: http(arbitrumSepolia.rpcUrls.default.http[0]),
            [optimismSepolia.id]: http(optimismSepolia.rpcUrls.default.http[0]),
            [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0]),
        },

        walletConnectProjectId: walletConnectProjectId!,

        // Required App Info
        appName: "Smart Yield Optimizer",

        // Optional App Info
        appDescription:
            "Automated cross-chain yield optimization with real-time monitoring",
        appUrl: "https://github.com/PrathmeshRanjan/chameleon",
        appIcon: "https://avatars.githubusercontent.com/u/12345678?v=4",

        // Add storage for wallet persistence
        ssr: false,
    })
);
const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ConnectKitProvider
                    theme="soft"
                    mode="light"
                    options={{
                        enforceSupportedChains: false,
                        initialChainId: base.id, // Default to Base
                        walletConnectCTA: "both",
                        hideNoWalletCTA: true,
                        hideQuestionMarkCTA: true,
                        hideBalance: false,
                        hideRecentBadge: false,
                        avoidLayoutShift: true, // Prevent layout shifts during connection
                        embedGoogleFonts: false,
                        bufferPolyfill: false, // Prevent buffer polyfill issues
                        customAvatar: null, // Disable custom avatars to prevent connection issues
                    }}
                >
                    <NexusProvider>{children}</NexusProvider>
                </ConnectKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};

export default Web3Provider;
