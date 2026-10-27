// Chain-side helpers for the operator/venue WRITE forms (createVenue /
// updateVenue). Everything a UI READS about operators/venues comes from the
// indexer (see operatorAdmin.ts `listOperators` / `getOperator` / `listVenues` /
// `getVenue`) — the control-plane state is fully indexed, so a directory never
// fans out eth_calls. What genuinely needs the chain is fee-param encoding:
// the BINARY_V1 venue `feeParams` bytes are produced by the deployed module's
// own `encodeVenueFeeParams` (so the version tag + struct shape can never
// desync from the contract), and the protocol fee cap is a live module read.
import { decodeAbiParameters } from "viem";
import { NotConfiguredError } from "./errors.js";
import * as OperatorAbi from "./operatorAbi.js";
/**
 *  `MarketTypeIds.BINARY_V1` (`bytes4(keccak256("BINARY_V1"))`) — the only
 *  market type registered today. A venue is pinned to one type forever at
 *  `createVenue`.
 *
 * @category administration
 */
export const MARKET_TYPE_BINARY_V1 = "0x06c65d9f";
/**
 *  Schema version of the `BinaryVenueParams` payload the module encodes/decodes
 *  (mirror of `BinaryMarketsModule.FEE_PARAMS_VERSION`). Bump in lockstep with
 *  the contract. v3 appends `voidPolicy`; the decoder (like the contract's)
 *  still accepts legacy v2 payloads (192 bytes, policy implied UNIFORM).
 */
const FEE_PARAMS_VERSION = 3;
const LEGACY_FEE_PARAMS_VERSION = 2;
const VOID_POLICY_TO_WORD = {
    UNIFORM: 0n,
    CLOB_SNAPSHOT: 2n,
};
function voidPolicyFromWord(word) {
    const n = Number(word);
    if (n === 0)
        return "UNIFORM";
    if (n === 2)
        return "CLOB_SNAPSHOT";
    return null;
}
/**
 *  Build a BINARY_V1 venue's `feeParams` bytes from plain-bps rates via the
 *  deployed BinaryMarketsModule's `encodeVenueFeeParams` (a `pure` on-chain
 *  helper) — avoids re-deriving the version tag / struct encoding here, so a
 *  future `FEE_PARAMS_VERSION` bump can't silently desync client vs contract.
 */
export async function encodeBinaryVenueFeeParams(vp, client, binaryModule) {
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
];
const _binaryVenueParamsAbiTypeV2 = { type: "tuple", components: _rateWords };
const _binaryVenueParamsAbiTypeV3 = {
    type: "tuple",
    components: [..._rateWords, { name: "voidPolicy", type: "uint8" }],
};
/**
 *  Decode a BINARY_V1 venue's `feeParams` bytes back into (version, rates) for
 *  display — pure/local, mirrors BinaryMarketsModule's own dual decoder:
 *  192 bytes ⇒ legacy v2 (policy implied `UNIFORM`), 224 bytes ⇒ v3 (policy
 *  word). Returns null for anything else (empty / non-BINARY_V1 venue, wrong
 *  version-for-shape, or an on-chain-unreachable policy value).
 *
 * @category administration
 */
export function decodeBinaryVenueFeeParams(feeParams) {
    const byteLen = (feeParams.length - 2) / 2;
    if (byteLen !== 192 && byteLen !== 224)
        return null;
    try {
        const v3 = byteLen === 224;
        const [version, vp] = decodeAbiParameters([{ type: "uint8" }, v3 ? _binaryVenueParamsAbiTypeV3 : _binaryVenueParamsAbiTypeV2], feeParams);
        // Each shape pins its own version — reject a mismatch rather than trusting a
        // same-length re-layout (mirrors the contract's UnsupportedFeeParamsVersion).
        if (version !== (v3 ? FEE_PARAMS_VERSION : LEGACY_FEE_PARAMS_VERSION))
            return null;
        const voidPolicy = v3 ? voidPolicyFromWord(vp.voidPolicy ?? 0) : "UNIFORM";
        if (voidPolicy === null)
            return null;
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
    }
    catch {
        return null;
    }
}
/**
 *  The module's protocol-level ceiling on any single venue fee rate, in plain
 *  bps (e.g. 1_000 = 10%) — read live so the UI never hardcodes a cap that
 *  could drift from the deployed module.
 */
export async function getMaxVenueFeeBps(client, binaryModule) {
    if (!binaryModule) {
        throw new NotConfiguredError("binaryModule or config.addresses.binaryModule", "this operator read");
    }
    return Number(await client.readContract({
        address: binaryModule,
        abi: OperatorAbi.binaryModuleFeeParamsAbi,
        functionName: "MAX_FEE_BPS",
    }));
}
