/**
 * Fetch Morpho APY data from GraphQL API
 * This script shows how Vincent automation should fetch APY data
 */

interface MorphoVault {
    address: string;
    symbol: string;
    name: string;
    chain: {
        id: number;
        network: string;
    };
    state: {
        apy: number;
        netApy: number;
        totalAssets: string;
        totalAssetsUsd: string;
    };
}

interface MorphoAPIResponse {
    data: {
        vaults: {
            items: MorphoVault[];
        };
    };
}

/**
 * Fetch APY for a specific Morpho vault on a specific chain
 */
async function fetchMorphoVaultAPY(
    vaultAddress: string,
    chainId: number
): Promise<number> {
    const query = `
    query {
      vaultByAddress(
        address: "${vaultAddress}"
        chainId: ${chainId}
      ) {
        address
        symbol
        name
        chain {
          id
          network
        }
        state {
          apy
          netApy
          netApyWithoutRewards
          totalAssets
          totalAssetsUsd
        }
      }
    }
  `;

    try {
        const response = await fetch("https://api.morpho.org/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (data.errors) {
            console.error("GraphQL errors:", data.errors);
            throw new Error("Failed to fetch Morpho APY");
        }

        const vault = data.data.vaultByAddress;

        if (!vault) {
            throw new Error(
                `Vault ${vaultAddress} not found on chain ${chainId}`
            );
        }

        // APY is returned as a decimal (e.g., 0.05 for 5%)
        // Convert to basis points (e.g., 500 for 5%)
        const apyBps = Math.round(vault.state.apy * 10000);

        console.log(`Morpho ${vault.symbol} on ${vault.chain.network}:`);
        console.log(
            `  APY: ${(vault.state.apy * 100).toFixed(2)}% (${apyBps} bps)`
        );
        console.log(`  Net APY: ${(vault.state.netApy * 100).toFixed(2)}%`);
        console.log(
            `  TVL: $${parseFloat(vault.state.totalAssetsUsd).toLocaleString()}`
        );

        return apyBps;
    } catch (error) {
        console.error("Error fetching Morpho APY:", error);
        throw error;
    }
}

/**
 * Fetch APY for all Morpho vaults on supported chains
 */
async function fetchAllMorphoVaults(
    chainIds: number[]
): Promise<MorphoVault[]> {
    const query = `
    query {
      vaults(
        first: 1000, 
        where: { chainId_in: [${chainIds.join(", ")}] }
        orderBy: TotalAssetsUsd
        orderDirection: Desc
      ) {
        items {
          address
          symbol
          name
          whitelisted
          chain {
            id
            network
          }
          state {
            apy
            netApy
            netApyWithoutRewards
            totalAssets
            totalAssetsUsd
            totalSupply
          }
        }
      }
    }
  `;

    try {
        const response = await fetch("https://api.morpho.org/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const data: MorphoAPIResponse = await response.json();

        if (data.data?.vaults?.items) {
            return data.data.vaults.items;
        }

        return [];
    } catch (error) {
        console.error("Error fetching Morpho vaults:", error);
        throw error;
    }
}

/**
 * Find best Morpho USDC vault across multiple chains
 */
async function findBestMorphoUSDCVault(
    chainIds: number[]
): Promise<{ vault: MorphoVault; apyBps: number } | null> {
    const vaults = await fetchAllMorphoVaults(chainIds);

    // Filter for USDC vaults (symbol contains USDC)
    const usdcVaults = vaults.filter(
        (v) =>
            v.symbol.toUpperCase().includes("USDC") ||
            v.name.toUpperCase().includes("USDC")
    );

    if (usdcVaults.length === 0) {
        console.log("No USDC vaults found on specified chains");
        return null;
    }

    // Sort by APY (highest first)
    usdcVaults.sort((a, b) => b.state.apy - a.state.apy);

    console.log("\nTop USDC Vaults by APY:");
    usdcVaults.slice(0, 5).forEach((vault, idx) => {
        console.log(`${idx + 1}. ${vault.symbol} on ${vault.chain.network}`);
        console.log(`   APY: ${(vault.state.apy * 100).toFixed(2)}%`);
        console.log(
            `   TVL: $${parseFloat(
                vault.state.totalAssetsUsd
            ).toLocaleString()}`
        );
    });

    const bestVault = usdcVaults[0];
    const apyBps = Math.round(bestVault.state.apy * 10000);

    return { vault: bestVault, apyBps };
}

/**
 * Example: Integration with Vincent automation
 */
async function vincentMonitorAPYs() {
    const supportedChains = [
        1, // Ethereum Mainnet
        8453, // Base
        42161, // Arbitrum
        10, // Optimism
        11155111, // Sepolia (testnet)
    ];

    console.log("Vincent: Monitoring Morpho APYs across chains...\n");

    try {
        const result = await findBestMorphoUSDCVault(supportedChains);

        if (result) {
            console.log("\n✅ Best Morpho USDC Vault Found:");
            console.log(`   Address: ${result.vault.address}`);
            console.log(
                `   Chain: ${result.vault.chain.network} (${result.vault.chain.id})`
            );
            console.log(
                `   APY: ${(result.vault.state.apy * 100).toFixed(2)}% (${
                    result.apyBps
                } bps)`
            );
            console.log(
                `   TVL: $${parseFloat(
                    result.vault.state.totalAssetsUsd
                ).toLocaleString()}`
            );

            // Vincent would then compare this with Aave and Compound APYs
            // and trigger a rebalance if needed
            return {
                protocol: "Morpho",
                chainId: result.vault.chain.id,
                apyBps: result.apyBps,
                vaultAddress: result.vault.address,
            };
        }
    } catch (error) {
        console.error("Error in Vincent monitoring:", error);
    }

    return null;
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
    vincentMonitorAPYs()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export {
    fetchMorphoVaultAPY,
    fetchAllMorphoVaults,
    findBestMorphoUSDCVault,
    vincentMonitorAPYs,
};
