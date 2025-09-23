import { useNexus } from "@/providers/NexusProvider";
import type { UserAsset } from "@avail-project/nexus";
import { useEffect, useState } from "react";

const NexusUnifiedBalance = () => {
  const [unifiedBalance, setUnifiedBalance] = useState<UserAsset[] | undefined>(
    undefined,
  );
  const { nexusSDK } = useNexus();
  const fetchUnifiedBalance = async () => {
    try {
      const balance = await nexusSDK?.getUnifiedBalances();
      console.log("Unified Balance:", balance);
      setUnifiedBalance(balance);
    } catch (error) {
      console.error("Error fetching unified balance:", error);
    }
  };

  useEffect(() => {
    fetchUnifiedBalance();
  }, []);

  return (
    <div>
      <p>Balance</p>
      {unifiedBalance?.map((asset) => (
        <div key={asset.symbol}>
          {asset.symbol}: {asset.balanceInFiat}
        </div>
      ))}
    </div>
  );
};

export default NexusUnifiedBalance;
