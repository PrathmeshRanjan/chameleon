import {
    type SUPPORTED_CHAINS_IDS,
    TESTNET_CHAINS,
    MAINNET_CHAINS,
    CHAIN_METADATA,
} from "@avail-project/nexus-core";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";

const ChainSelect = ({
    selectedChain,
    handleSelect,
    chainLabel = "Destination Chain",
    isTestnet = false,
    disabled = false,
    showBothNetworks = true,
}: {
    selectedChain: SUPPORTED_CHAINS_IDS;
    handleSelect: (chainId: SUPPORTED_CHAINS_IDS) => void;
    chainLabel?: string;
    isTestnet?: boolean;
    disabled?: boolean;
    showBothNetworks?: boolean;
}) => {
    const chains = showBothNetworks
        ? [...MAINNET_CHAINS, ...TESTNET_CHAINS]
        : isTestnet
        ? TESTNET_CHAINS
        : MAINNET_CHAINS;
    const chainData = CHAIN_METADATA;
    return (
        <Select
            value={selectedChain?.toString() ?? ""}
            onValueChange={(value) => {
                if (!disabled) {
                    handleSelect(parseInt(value) as SUPPORTED_CHAINS_IDS);
                }
            }}
        >
            <div className="flex flex-col items-start gap-y-1">
                {chainLabel && (
                    <Label className="text-sm font-semibold">
                        {chainLabel}
                    </Label>
                )}
                <SelectTrigger disabled={disabled}>
                    <SelectValue>
                        {!!selectedChain && (
                            <div className="flex items-center gap-x-2">
                                <img
                                    src={CHAIN_METADATA[selectedChain]?.logo}
                                    alt={
                                        CHAIN_METADATA[selectedChain]?.name ??
                                        ""
                                    }
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                                <p className="text-primary test-sm">
                                    {CHAIN_METADATA[selectedChain]?.name}
                                </p>
                            </div>
                        )}
                    </SelectValue>
                </SelectTrigger>
            </div>

            <SelectContent>
                {showBothNetworks ? (
                    <>
                        {/* Mainnet Chains */}
                        <SelectGroup>
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                                Mainnet
                            </div>
                            {MAINNET_CHAINS.map((chainId) => {
                                return (
                                    <SelectItem
                                        key={chainId}
                                        value={chainId.toString()}
                                    >
                                        <div className="flex items-center gap-x-2 my-1">
                                            <img
                                                src={
                                                    CHAIN_METADATA[chainId]
                                                        ?.logo
                                                }
                                                alt={
                                                    chainData[chainId]?.name ??
                                                    ""
                                                }
                                                width={24}
                                                height={24}
                                                className="rounded-full"
                                            />
                                            <p className="text-primary test-sm">
                                                {chainData[chainId]?.name}
                                            </p>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectGroup>

                        {/* Separator */}
                        <div className="h-px bg-gray-200 my-1" />

                        {/* Testnet Chains */}
                        <SelectGroup>
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                                Testnet
                            </div>
                            {TESTNET_CHAINS.map((chainId) => {
                                return (
                                    <SelectItem
                                        key={chainId}
                                        value={chainId.toString()}
                                    >
                                        <div className="flex items-center gap-x-2 my-1">
                                            <img
                                                src={
                                                    CHAIN_METADATA[chainId]
                                                        ?.logo
                                                }
                                                alt={
                                                    chainData[chainId]?.name ??
                                                    ""
                                                }
                                                width={24}
                                                height={24}
                                                className="rounded-full"
                                            />
                                            <p className="text-primary test-sm">
                                                {chainData[chainId]?.name}
                                            </p>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectGroup>
                    </>
                ) : (
                    <SelectGroup>
                        {chains.map((chainId) => {
                            return (
                                <SelectItem
                                    key={chainId}
                                    value={chainId.toString()}
                                >
                                    <div className="flex items-center gap-x-2 my-1">
                                        <img
                                            src={CHAIN_METADATA[chainId]?.logo}
                                            alt={chainData[chainId]?.name ?? ""}
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                        <p className="text-primary test-sm">
                                            {chainData[chainId]?.name}
                                        </p>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );
};

export default ChainSelect;
