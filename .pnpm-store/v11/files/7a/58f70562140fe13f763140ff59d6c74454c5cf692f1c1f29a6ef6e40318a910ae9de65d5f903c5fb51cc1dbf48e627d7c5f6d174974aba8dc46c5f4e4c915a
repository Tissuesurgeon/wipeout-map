import { type Address, type Hex, type PublicClient } from "viem";
/**
 *  `MarketTypeIds.BINARY_V1` (`bytes4(keccak256("BINARY_V1"))`) — the only
 *  market type registered today. A venue is pinned to one type forever at
 *  `createVenue`.
 *
 * @category administration
 */
export declare const MARKET_TYPE_BINARY_V1: Hex;
/**
 *  Void payout policy a BINARY_V1 venue's markets are created with (mirror of
 *  the contract-side `VoidPolicy` enum; the legacy `AMM_SNAPSHOT` slot (1) is
 *  rejected on-chain and never surfaces here).
 *  - `UNIFORM` (0): a voided market pays every side 1/N — the default.
 *  - `CLOB_SNAPSHOT` (2): a voided market pays `[p, D-p]` at its closing YES
 *    price (captured or read from the lock-preserved closing book); falls back
 *    to uniform when no two-sided close exists. Frozen per market at creation
 *    after resolving against the pool's actual capability.
 *
 * @category administration
 */
export type VenueVoidPolicy = "UNIFORM" | "CLOB_SNAPSHOT";
/**
 *  Plain-bps fee rates for a BINARY_V1 venue (see BinaryMarketsModule.BinaryVenueParams).
 *  Each rate is capped at the module's `MAX_FEE_BPS` (currently 1_000 = 10%).
 *
 * @category administration
 */
export interface BinaryVenueParams {
    /** Pool protocol fee charged on maker-side fills (bps). */
    makerFeeBps: number;
    /** Pool protocol fee charged on taker-side fills (bps). */
    takerFeeBps: number;
    /** Per-order builder/routing fee ceiling the pool enforces at placeOrder (bps). */
    maxBuilderFeeBps: number;
    /**
     *  Advertised default routing fee for frontends routing through this venue
     *  (bps); must be <= `maxBuilderFeeBps`.
     */
    routingFeeBps: number;
    /**
     *  Fee skimmed from the WINNING payout on redemption of a resolved market
     *  (bps; 0 = none). Frozen into each market at creation — a later
     *  `updateVenue` only affects markets created afterward. Never charged on
     *  voided (capital-refund) redemptions.
     */
    settlementFeeBps: number;
    /**
     *  Void payout policy for markets created under this venue (v3 field).
     *  Omitted ⇒ `UNIFORM`. Like the fee rates it freezes per market at creation
     *  (resolved against the provisioned pool's capability — an old pool without
     *  the capture surface downgrades a `CLOB_SNAPSHOT` wish to `UNIFORM`).
     */
    voidPolicy?: VenueVoidPolicy;
}
/**
 *  Build a BINARY_V1 venue's `feeParams` bytes from plain-bps rates via the
 *  deployed BinaryMarketsModule's `encodeVenueFeeParams` (a `pure` on-chain
 *  helper) — avoids re-deriving the version tag / struct encoding here, so a
 *  future `FEE_PARAMS_VERSION` bump can't silently desync client vs contract.
 */
export declare function encodeBinaryVenueFeeParams(vp: BinaryVenueParams, client: PublicClient, binaryModule: Address | undefined): Promise<Hex>;
/**
 *  Decode a BINARY_V1 venue's `feeParams` bytes back into (version, rates) for
 *  display — pure/local, mirrors BinaryMarketsModule's own dual decoder:
 *  192 bytes ⇒ legacy v2 (policy implied `UNIFORM`), 224 bytes ⇒ v3 (policy
 *  word). Returns null for anything else (empty / non-BINARY_V1 venue, wrong
 *  version-for-shape, or an on-chain-unreachable policy value).
 *
 * @category administration
 */
export declare function decodeBinaryVenueFeeParams(feeParams: Hex): {
    /** The payload's schema version tag (2 legacy, 3 current). */
    version: number;
    /** The decoded plain-bps venue fee rates (+ resolved `voidPolicy`). */
    params: BinaryVenueParams;
} | null;
/**
 *  The module's protocol-level ceiling on any single venue fee rate, in plain
 *  bps (e.g. 1_000 = 10%) — read live so the UI never hardcodes a cap that
 *  could drift from the deployed module.
 */
export declare function getMaxVenueFeeBps(client: PublicClient, binaryModule: Address | undefined): Promise<number>;
