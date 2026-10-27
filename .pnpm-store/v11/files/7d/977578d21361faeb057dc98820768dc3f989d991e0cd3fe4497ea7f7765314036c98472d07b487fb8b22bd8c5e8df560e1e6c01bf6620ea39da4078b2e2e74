// Chain-side helpers for the operator/venue WRITE forms (createVenue /
// updateVenue). Everything a UI READS about operators/venues comes from the
// indexer (see operatorAdmin.ts `listOperators` / `getOperator` / `listVenues` /
// `getVenue`) — the control-plane state is fully indexed, so a directory never
// fans out eth_calls. What genuinely needs the chain is fee-param encoding:
// the BINARY_V1 venue `feeParams` bytes are produced by the deployed module's
// own `encodeVenueFeeParams` (so the version tag + struct shape can never
// desync from the contract), and the protocol fee cap is a live module read.

import { decodeAbiParameters, type Address, type Hex, type PublicClient } from "viem";
import { NotConfiguredError } from "./errors.js";
import * as OperatorAbi from "./operatorAbi.js";

/**
 *  `MarketTypeIds.BINARY_V1` (`bytes4(keccak256("BINARY_V1"))`) — the only
 *  market type registered today. A venue is pinned to one type forever at
 *  `createVenue`.
 *
 * @category administration
 */
export const MARKET_TYPE_BINARY_V1: Hex = "0x06c65d9f";

/**
 *  Schema version of the `BinaryVenueParams` payload the module encodes/decodes
 *  (mirror of `BinaryMarketsModule.FEE_PARAMS_VERSION`). Bump in lockstep with
 *  the contract. v3 appends `voidPolicy`; the decoder (like the contract's)
 *  still accepts legacy v2 payloads (192 bytes, policy implied UNIFORM).
 */
const FEE_PARAMS_VERSION = 3;
const LEGACY_FEE_PARAMS_VERSION = 2;

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

const VOID_POLICY_TO_WORD: Record<VenueVoidPolicy, bigint> = {
  UNIFORM: 0n,
  CLOB_SNAPSHOT: 2n,
};

function voidPolicyFromWord(word: bigint | number): VenueVoidPolicy | null {
  const n = Number(word);
  if (n === 0) return "UNIFORM";
  if (n === 2) return "CLOB_SNAPSHOT";
  return null;
}

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
export async function encodeBinaryVenueFeeParams(
  vp: BinaryVenueParams,
  client: PublicClient,
  binaryModule: Address | undefined,
): Promise<Hex> {
  if (!binaryModule) {
    throw new NotConfiguredError("binaryModule or config.addresses.binaryModule", "this operator read");
  }
  return await client.readContract({
    address: binaryModule,
    abi: OperatorAbi.binaryModuleFeeParamsAbi,
    functionName: "encodeVenueFeeParams",
    args: [
      {
        makerFeeBps: BigInt(vp.makerFeeBps),
        takerFeeBps: BigInt(vp.takerFeeBps),
        maxBuilderFeeBps: BigInt(vp.maxBuilderFeeBps),
        routingFeeBps: BigInt(vp.routingFeeBps),
        settlementFeeBps: BigInt(vp.settlementFeeBps),
        voidPolicy: Number(VOID_POLICY_TO_WORD[vp.voidPolicy ?? "UNIFORM"]),
      },
    ],
  });
}

const _rateWords = [
  { name: "makerFeeBps", type: "uint64" },
  { name: "takerFeeBps", type: "uint64" },
  { name: "maxBuilderFeeBps", type: "uint64" },
  { name: "routingFeeBps", type: "uint64" },
  { name: "settlementFeeBps", type: "uint64" },
] as const;

const _binaryVenueParamsAbiTypeV2 = { type: "tuple", components: _rateWords } as const;
const _binaryVenueParamsAbiTypeV3 = {
  type: "tuple",
  components: [..._rateWords, { name: "voidPolicy", type: "uint8" }],
} as const;

/**
 *  Decode a BINARY_V1 venue's `feeParams` bytes back into (version, rates) for
 *  display — pure/local, mirrors BinaryMarketsModule's own dual decoder:
 *  192 bytes ⇒ legacy v2 (policy implied `UNIFORM`), 224 bytes ⇒ v3 (policy
 *  word). Returns null for anything else (empty / non-BINARY_V1 venue, wrong
 *  version-for-shape, or an on-chain-unreachable policy value).
 *
 * @category administration
 */
export function decodeBinaryVenueFeeParams(feeParams: Hex): {
  /** The payload's schema version tag (2 legacy, 3 current). */
  version: number;
  /** The decoded plain-bps venue fee rates (+ resolved `voidPolicy`). */
  params: BinaryVenueParams;
} | null {
  const byteLen = (feeParams.length - 2) / 2;
  if (byteLen !== 192 && byteLen !== 224) return null;
  try {
    const v3 = byteLen === 224;
    const [version, vp] = decodeAbiParameters(
      [{ type: "uint8" }, v3 ? _binaryVenueParamsAbiTypeV3 : _binaryVenueParamsAbiTypeV2],
      feeParams,
    ) as [
      number,
      {
        makerFeeBps: bigint;
        takerFeeBps: bigint;
        maxBuilderFeeBps: bigint;
        routingFeeBps: bigint;
        settlementFeeBps: bigint;
        voidPolicy?: number;
      },
    ];
    // Each shape pins its own version — reject a mismatch rather than trusting a
    // same-length re-layout (mirrors the contract's UnsupportedFeeParamsVersion).
    if (version !== (v3 ? FEE_PARAMS_VERSION : LEGACY_FEE_PARAMS_VERSION)) return null;
    const voidPolicy = v3 ? voidPolicyFromWord(vp.voidPolicy ?? 0) : "UNIFORM";
    if (voidPolicy === null) return null;
    return {
      version,
      params: {
        makerFeeBps: Number(vp.makerFeeBps),
        takerFeeBps: Number(vp.takerFeeBps),
        maxBuilderFeeBps: Number(vp.maxBuilderFeeBps),
        routingFeeBps: Number(vp.routingFeeBps),
        settlementFeeBps: Number(vp.settlementFeeBps),
        voidPolicy,
      },
    };
  } catch {
    return null;
  }
}

/**
 *  The module's protocol-level ceiling on any single venue fee rate, in plain
 *  bps (e.g. 1_000 = 10%) — read live so the UI never hardcodes a cap that
 *  could drift from the deployed module.
 */
export async function getMaxVenueFeeBps(client: PublicClient, binaryModule: Address | undefined): Promise<number> {
  if (!binaryModule) {
    throw new NotConfiguredError("binaryModule or config.addresses.binaryModule", "this operator read");
  }
  return Number(
    await client.readContract({
      address: binaryModule,
      abi: OperatorAbi.binaryModuleFeeParamsAbi,
      functionName: "MAX_FEE_BPS",
    }),
  );
}
