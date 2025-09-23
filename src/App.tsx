import ConnectWallet from "./components/connect-wallet";
import NexusUnifiedBalance from "./components/unified-balance";
import { useNexus } from "./providers/NexusProvider";

function App() {
  const { nexusSDK } = useNexus();
  return (
    <div className="flex items-center flex-col gap-y-4 justify-center h-full w-full">
      <ConnectWallet />
      {nexusSDK?.isInitialized() && <NexusUnifiedBalance />}
    </div>
  );
}

export default App;
