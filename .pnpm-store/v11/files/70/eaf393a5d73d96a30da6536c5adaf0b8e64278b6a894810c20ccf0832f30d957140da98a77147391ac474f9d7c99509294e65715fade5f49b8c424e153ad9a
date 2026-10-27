/**
 *  Somnia testnet — **Shannon** (chain id `50312`), the public testnet and the
 *  default target for Somnia Markets development. Native token is **STT**;
 *  blocks land roughly every 100 ms.
 *
 *  `https://dream-rpc.somnia.network` is a public alias for the same network and
 *  is listed as a secondary HTTP/WebSocket endpoint.
 *
 * @category networks
 */
export declare const somniaShannon: {
    blockExplorers: {
        readonly default: {
            readonly name: "Somnia Testnet Explorer";
            readonly url: "https://shannon-explorer.somnia.network";
            readonly apiUrl: "https://shannon-explorer.somnia.network/api";
        };
    };
    blockTime: 100;
    contracts: {
        readonly multicall3: {
            readonly address: "0x841b8199E6d3Db3C6f264f6C2bd8848b3cA64223";
            readonly blockCreated: 71314235;
        };
    };
    ensTlds?: readonly string[] | undefined;
    id: 50312;
    name: "Somnia Testnet";
    nativeCurrency: {
        readonly name: "STT";
        readonly symbol: "STT";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://api.infra.testnet.somnia.network", "https://dream-rpc.somnia.network"];
            readonly webSocket: readonly ["wss://api.infra.testnet.somnia.network/ws", "wss://dream-rpc.somnia.network/ws"];
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
