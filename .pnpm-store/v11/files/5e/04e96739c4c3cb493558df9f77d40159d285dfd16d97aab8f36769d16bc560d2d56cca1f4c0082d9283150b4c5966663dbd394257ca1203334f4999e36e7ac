/**
 *  The local Somnia dev chain (chain id `31337`) — an Anvil node, as brought up by
 *  `demo-clob.sh up` / `DEPLOY_ENV=local`. Anvil is a first-class environment for
 *  this protocol: the deploy scripts, the indexer, the deployments hub and the
 *  explorer all run against it, so it gets a definition here instead of borrowing
 *  viem's `foundry`.
 *
 *  Deliberately presented as **Somnia** with **STT** rather than "Foundry"/"Ether":
 *  the agent-facing docs read the chain name and native symbol straight out of this
 *  object, and a local stack should still read as Somnia there.
 *
 *  Two things a local chain does *not* have: the Somnia reactivity precompile at
 *  `0x…0100` (`isLocalPrecompileUnavailable` returns true here — anything that
 *  pings it, such as `enableReactivity` or `triggerRoll`, is testnet/mainnet only)
 *  and a Multicall3 deployment, unless you deployed one yourself.
 *
 * @category networks
 */
export declare const somniaLocal: {
    blockExplorers?: {
        [key: string]: {
            name: string;
            url: string;
            apiUrl?: string | undefined;
        };
        default: {
            name: string;
            url: string;
            apiUrl?: string | undefined;
        };
    } | undefined | undefined;
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: import("viem").ChainContract | {
            [sourceId: number]: import("viem").ChainContract | undefined;
        } | undefined;
        ensRegistry?: import("viem").ChainContract | undefined;
        ensUniversalResolver?: import("viem").ChainContract | undefined;
        multicall3?: import("viem").ChainContract | undefined;
        erc6492Verifier?: import("viem").ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 31337;
    name: "Somnia Local";
    nativeCurrency: {
        readonly name: "STT";
        readonly symbol: "STT";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["http://127.0.0.1:8545"];
            readonly webSocket: readonly ["ws://127.0.0.1:8545"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: import("viem").ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: import("viem").PrepareTransactionRequestParameters, options: {
        client: import("viem").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("viem").PrepareTransactionRequestParameters>) | [fn: ((args: import("viem").PrepareTransactionRequestParameters, options: {
        client: import("viem").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("viem").PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
    verifyHash?: ((client: import("viem").Client, parameters: import("viem").VerifyHashActionParameters) => Promise<import("viem").VerifyHashActionReturnType>) | undefined;
};
