/**
 *  Somnia mainnet (chain id `5031`) — the production network. Native token is
 *  **SOMI**; blocks land roughly every 100 ms.
 *
 *  Same content as viem's `somnia`, under the name the runbooks use.
 *
 * @category networks
 */
export declare const somniaMainnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "Somnia Explorer";
            readonly url: "https://explorer.somnia.network";
            readonly apiUrl: "https://explorer.somnia.network/api";
        };
    };
    blockTime: 100;
    contracts: {
        readonly multicall3: {
            readonly address: "0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11";
            readonly blockCreated: 38516341;
        };
    };
    ensTlds?: readonly string[] | undefined;
    id: 5031;
    name: "Somnia";
    nativeCurrency: {
        readonly name: "Somnia";
        readonly symbol: "SOMI";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://api.infra.mainnet.somnia.network"];
            readonly webSocket: readonly ["wss://api.infra.mainnet.somnia.network/ws"];
        };
    };
    sourceId?: number | undefined | undefined;
    supportsTransactionReplacementDetection?: boolean | undefined | undefined;
    testnet: false;
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
