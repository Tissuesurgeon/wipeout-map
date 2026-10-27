import type { Address, PublicClient } from "viem";
import type { SomniaMarketsAddresses } from "./config.js";
/**
 *  On-chain state of the configured MarketCreator (part of {@link SystemInfo}).
 *  Every field is a live read: a failed read throws, so each value here is
 *  something the chain actually answered.
 *
 * @category system
 */
export interface MarketCreatorInfo {
    /** Markets this creator has minted (`marketCount()`). */
    marketCount: bigint;
    /** Creator owner (`owner()`). */
    owner: Address;
    /** Gas limit its reactivity roll callbacks run with. */
    reactivityGasLimit: bigint;
    /** Reactivity-callback fee ceiling (wei per gas). */
    reactivityMaxFeePerGas: bigint;
    /** Reactivity-callback tip (wei per gas). */
    reactivityPriorityFeePerGas: bigint;
    /** Origin operator id this creator's markets are attributed to. */
    operatorId: number;
    /** Origin venue id within the operator (bytes32 hex). */
    venueId: string;
}
/**
 *  Live snapshot of the deployed CLOB-family contract state, as read by
 *  {@link SomniaMarketsClient.getSystemInfo}. `null` means the contract is not
 *  configured or not wired. A live read that FAILS throws — this snapshot never
 *  reports a value the chain did not answer, because a dashboard cannot tell a
 *  fabricated zero from a real one.
 *
 * @category system
 */
export interface SystemInfo {
    /** BinaryMarketsModule.clobFactory() (authoritative) or the configured fallback. */
    clobFactory: Address | null;
    /**
     *  ClobFactory.binaryMarketImpl(), or null when no ClobFactory resolved (there
     *  is no configured market-impl fallback; `binaryPoolImpl` is a different
     *  contract).
     */
    binaryMarketImpl: Address | null;
    /** True when the live ClobFactory differs from the configured one. */
    factoryMismatch: boolean;
    /**
     *  The BinarySettlement singleton the module is wired to (live
     *  `BinaryMarketsModule.settlement()`, falling back to the configured
     *  `addresses.binarySettlement`). Null pre-wire, on a pre-v2 module that does
     *  not declare the view, and when neither is configured. A failed read throws.
     */
    settlement: Address | null;
    /** True when the module's live settlement differs from the configured one. */
    settlementMismatch: boolean;
    /** The configured MarketCreator's state; null when `addresses.marketCreator` is unset. */
    marketCreator: MarketCreatorInfo | null;
    /** FakeOracle wiring; null when `addresses.fakeOracle` is unset. */
    oracle: {
        /** FakeOracle owner (the resolve/void signer). */
        owner: Address;
        /** The module the oracle delivers to (its `RECEIVER`). */
        binaryModule: Address;
    } | null;
    /**
     *  Collateral ERC-20 metadata (from `addresses.collateral`, falling back to the
     *  legacy `testUsdc`); null when neither is configured.
     */
    usdc: {
        /** Token symbol. */
        symbol: string;
        /** Token decimals. */
        decimals: number;
    } | null;
}
/**
 *  Live snapshot of the deployed CLOB family (for the /system dashboard).
 *
 *  Every read propagates its failure. A dead RPC throws `RpcError` rather than
 *  resolving with `marketCount: 0n` and `operatorId: 0`, which a dashboard cannot
 *  tell apart from a freshly deployed creator that genuinely holds those zeros.
 *  The one narrowed read is `settlement()`, whose absence is a protocol version
 *  rather than a fault — see {@link readSettlementIfDeclared}.
 */
export declare function getSystemInfo(client: PublicClient, addresses: SomniaMarketsAddresses): Promise<SystemInfo>;
/** Native (gas-token) balance of an address. */
export declare function getNativeBalance(address: Address, client: PublicClient): Promise<bigint>;
/**
 *  Chain-direct summary of one transaction — sender, gas spent, fee paid,
 *  status — for enriching an order/fill view with what the tx cost. One
 *  `eth_getTransactionByHash` + one `eth_getTransactionReceipt`, in parallel.
 */
export interface TransactionSummary {
    /** Sender (the wallet that paid gas), lowercased. */
    from: string;
    /** Target contract, lowercased; null on a deployment. */
    to: string | null;
    nonce: number;
    status: "success" | "reverted";
    gasUsed: bigint;
    /** The sender's gas limit for the tx. */
    gasLimit: bigint;
    effectiveGasPrice: bigint;
    /** gasUsed × effectiveGasPrice — the fee paid, wei of the native token. */
    feeWei: bigint;
    /** Native value sent with the tx (wei). */
    value: bigint;
    /** Log records in the receipt — how much the tx did (batch orders emit many). */
    logCount: number;
}
/**
 *  {@link TransactionSummary} for `hash`, or null when the tx is unknown to the
 *  node (never landed, or pruned). Rejected inputs (not a 32-byte hash) also
 *  return null rather than throwing — callers treat this as best-effort
 *  enrichment.
 *
 *  **Gotchas**
 *
 *  `null` means the NODE answered "I do not have that": either the hash is
 *  malformed or the node reported the transaction (or its receipt) as not found.
 *  A read that never got an answer throws instead. "It never landed" and "I could
 *  not ask" are different facts, and a fill view that renders them alike hides an
 *  outage.
 */
export declare function getTransactionSummary(hash: string, client: PublicClient): Promise<TransactionSummary | null>;
