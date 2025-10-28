import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NexusUnifiedBalance from "./unified-balance";
import NexusBridge from "./bridge";
import YieldDashboard from "./dashboard/YieldDashboard";
import CrossChainDepositCard from "./deposit/CrossChainDepositCard";
import { AutomationDashboard } from "./automation";

// Deployed vault addresses
const SEPOLIA_VAULT_ADDRESS =
    "0xa36Fa2Ad2d397FC89D2e0a39C8E673AdC6127c2a" as `0x${string}`;

export default function Nexus() {
    return (
        <div className="flex items-center justify-center w-full max-w-6xl flex-col gap-6 z-10">
            <Tabs defaultValue="deposit" className="w-full items-center">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="deposit">
                        Cross-Chain Deposit
                    </TabsTrigger>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="automation">Automation</TabsTrigger>
                    <TabsTrigger value="balance">Balance</TabsTrigger>
                    <TabsTrigger value="bridge">Bridge</TabsTrigger>
                </TabsList>
                <TabsContent
                    value="deposit"
                    className="w-full flex items-center justify-center mt-6"
                >
                    <CrossChainDepositCard />
                </TabsContent>
                <TabsContent
                    value="dashboard"
                    className="w-full items-center mt-6"
                >
                    <YieldDashboard />
                </TabsContent>
                <TabsContent
                    value="automation"
                    className="w-full items-center mt-6"
                >
                    <AutomationDashboard vaultAddress={SEPOLIA_VAULT_ADDRESS} />
                </TabsContent>
                <TabsContent
                    value="balance"
                    className="w-full items-center mt-6"
                >
                    <NexusUnifiedBalance />
                </TabsContent>
                <TabsContent
                    value="bridge"
                    className="w-full items-center bg-transparent mt-6"
                >
                    <NexusBridge />
                </TabsContent>
            </Tabs>
        </div>
    );
}
