import ConnectWallet from "./components/blocks/connect-wallet";
import Nexus from "./components/nexus";
import NexusInitButton from "./components/nexus-init";
import { useNexus } from "./providers/NexusProvider";

function App() {
    const { nexusSDK } = useNexus();
    return (
        <div className="flex items-center justify-center flex-col gap-y-4 h-full w-full max-w-6xl mx-auto px-4">
            <div className="text-center space-y-2 z-10 mt-8">
                <h1 className="text-4xl font-bold bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Smart Yield Optimizer
                </h1>
                <p className="text-lg text-gray-600">
                    Automated cross-chain yield optimization with real-time
                    monitoring
                </p>
                <p className="text-sm text-gray-500">
                    Powered by Avail Nexus • Vincent Automation
                </p>
            </div>
            <div className="flex gap-x-4 items-center justify-center z-10">
                <ConnectWallet />
                <NexusInitButton />
            </div>
            {nexusSDK?.isInitialized() && <Nexus />}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: `
            radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #14b8a6 100%)
          `,
                    backgroundSize: "100% 100%",
                }}
            />
        </div>
    );
}

export default App;
