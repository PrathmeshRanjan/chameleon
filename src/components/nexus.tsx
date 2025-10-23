import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NexusUnifiedBalance from "./unified-balance";
import NexusBridge from "./bridge";
import YieldDashboard from "./dashboard/YieldDashboard";
import DepositCard from "./deposit/DepositCard";

export default function Nexus() {
    return (
        <div className="flex items-center justify-center w-full max-w-6xl flex-col gap-6 z-10">
            <Tabs defaultValue="dashboard" className="w-full items-center">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="balance">Balance</TabsTrigger>
                    <TabsTrigger value="bridge">Bridge</TabsTrigger>
                </TabsList>
                <TabsContent
                    value="dashboard"
                    className="w-full items-center mt-6"
                >
                    <YieldDashboard />
                </TabsContent>
                <TabsContent
                    value="deposit"
                    className="w-full items-center mt-6"
                >
                    <DepositCard />
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
