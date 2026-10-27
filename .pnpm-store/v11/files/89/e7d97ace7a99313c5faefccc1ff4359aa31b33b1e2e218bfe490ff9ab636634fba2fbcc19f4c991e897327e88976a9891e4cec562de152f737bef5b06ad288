import type { Chain } from "viem";
export * from "./bridge/index.js";
export { ChainId } from "./chainId.js";
export { somniaMainnet } from "./definitions/somniaMainnet.js";
export { somniaShannon } from "./definitions/somniaShannon.js";
export { somniaElwood } from "./definitions/somniaElwood.js";
export { hidekiTestnet } from "./definitions/hidekiTestnet.js";
export { somniaLocal } from "./definitions/somniaLocal.js";
import { type ChainId } from "./chainId.js";
/**
 *  `defineChain` and `Chain`, re-exported from viem so a consumer can extend one
 *  of these definitions (or define a network we don't ship yet) without a second
 *  import.
 *
 * **Example** (Defining a fork)
 *
 * ```ts
 * import { defineChain, somniaShannon } from "@somnia-chain/markets-sdk/chains";
 *
 * const forked = defineChain({
 *   ...somniaShannon,
 *   id: 31_337,
 *   name: "Somnia Testnet (forked)",
 *   rpcUrls: { default: { http: ["http://127.0.0.1:8545"], webSocket: ["ws://127.0.0.1:8545"] } },
 * });
 * ```
 */
export { defineChain, type Chain } from "viem";
/**
 *  Every Somnia network this module ships, keyed by chain id — the lookup table
 *  behind {@link getSomniaChain}. Iterate it to build a network switcher; index it
 *  when you already know the id is one of ours.
 *
 * @category networks
 */
export declare const somniaChains: {
    readonly 5031: {
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
    readonly 50312: {
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
    readonly 50313: {
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
        blockTime: 100;
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
        id: 50313;
        name: "Somnia Elwood Testnet";
        nativeCurrency: {
            readonly name: "STT";
            readonly symbol: "STT";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://api.elwood.infra.testnet.somnia.network"];
                readonly webSocket: readonly ["wss://api.elwood.infra.testnet.somnia.network/ws"];
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
    readonly 50383: {
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
        blockTime: 10;
        contracts: {
            readonly multicall3: {
                readonly address: "0xcA11bde05977b3631167028862bE2a173976CA11";
                readonly blockCreated: 1;
            };
        };
        ensTlds?: readonly string[] | undefined;
        id: 50383;
        name: "Hideki Testnet";
        nativeCurrency: {
            readonly name: "STT";
            readonly symbol: "STT";
            readonly decimals: 18;
        };
        experimental_preconfirmationTime?: number | undefined | undefined;
        rpcUrls: {
            readonly default: {
                readonly http: readonly ["https://api.hideki2.infra.testnet.somnia.network"];
                readonly webSocket: readonly ["wss://api.hideki2.infra.testnet.somnia.network/ws"];
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
    readonly 31337: {
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
};
/**
 *  Resolve a chain id to its definition, or `null` when it isn't a Somnia network
 *  we ship. The `chainId` a deployment manifest carries is a plain `number`, so
 *  this is the bridge from "the env told me 50312" to a viem `Chain`.
 *
 * **Details**
 *
 * - `chainId`: Chain id to look up (e.g. `50312`).
 * - Returns: The matching viem `Chain`, or `null` if it isn't one of ours.
 *
 * **Example** (Resolving a deployment chain)
 *
 * ```ts
 * import { getSomniaChain, defineChain } from "@somnia-chain/markets-sdk/chains";
 *
 * const chain =
 *   getSomniaChain(deployment.chainId) ??
 *   defineChain({
 *     id: deployment.chainId,
 *     name: "Somnia",
 *     nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
 *     rpcUrls: { default: { http: [rpcUrl] } },
 *   });
 * ```
 *
 * @category networks
 */
export declare function getSomniaChain(chainId: number): Chain | null;
/**
 *  Type guard: is this chain id one of the Somnia networks in
 *  {@link somniaChains}? Narrows a plain `number` to {@link ChainId}, so it can
 *  index `somniaChains` without a cast.
 *
 * **Details**
 *
 * - `chainId`: Chain id to test.
 *
 * @category networks
 */
export declare function isSomniaChainId(chainId: number): chainId is ChainId;
