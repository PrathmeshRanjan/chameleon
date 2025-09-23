/**
 * Use this component to only initialize Nexus when required or with a button click
 * Remove the use effect in @NexusProvider to stop auto init process
 */

import { Button } from "./ui/button";
import { useNexus } from "@/providers/NexusProvider";

const NexusInitButton = () => {
  const { handleInit } = useNexus();
  return <Button onClick={handleInit}>Init Nexus</Button>;
};

export default NexusInitButton;
