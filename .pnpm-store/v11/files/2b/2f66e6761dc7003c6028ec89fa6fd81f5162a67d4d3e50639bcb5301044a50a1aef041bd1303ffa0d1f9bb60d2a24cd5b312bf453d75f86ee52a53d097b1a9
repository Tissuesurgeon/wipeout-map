// The BINARY_V1 market-type plugin — the first (today only) entry in the
// MarketTypePlugin registry. It wires the existing operatorReads fee-param
// helpers (`encodeBinaryVenueFeeParams` / `decodeBinaryVenueFeeParams`) plus the
// machinery onboarding steps a binary up/down market needs: stamp a
// MarketCreator (+ policy) bound to the protocol OracleHub, fund it, then
// register a rolling series. (Oracle v2 removed the per-operator adapter step —
// there is nothing to mint or arm; the hub is the one approved adapter.)
// A future market type slots in as a sibling plugin — the registry, the admin
// surfaces, and the preflight are all keyed by `marketType`, not hardcoded to
// binary. It lives in ITS kind's directory (this one is binary/), and
// marketTypes/ stays the pure registry: index.ts aggregates NAMES at compile
// time, the registry aggregates KINDS at runtime, one line each per kind.
import * as OperatorReads from "../operatorReads.js";
/**
 *  The type-specific onboarding steps a binary venue's machinery needs, in
 *  order. A wizard renders these; the preflight validators key off their `id`.
 */
const BINARY_MACHINERY_STEPS = [
    {
        id: "market-creator",
        label: "Market creator + policy",
        description: "Stamp a MarketCreator (+ its policy) from the factory, bound to this operator/venue, the core module, and the protocol OracleHub (the one approved oracle adapter — nothing to mint or arm).",
    },
    {
        id: "funding",
        label: "Fund the creator",
        description: "Send native to the creator — each roll pays reactivity gas plus the create value getSchedulingCost(def) + resolveReserve() (the reserve is attached to the create and earmarked per-market at onBind; surplus accrues to the operator's withdrawable credit).",
    },
    {
        id: "series",
        label: "Series",
        description: "Register one or more rolling up/down series (asset + interval + settlement window) under the creator.",
    },
];
/**
 *  BINARY_V1 plugin. `encodeVenueFeeParams` / `decodeVenueFeeParams` delegate to
 *  the existing operatorReads helpers (the on-chain-backed encoder + the local
 *  decoder); `decode` is pure so it needs no client.
 *
 * @category binary markets
 */
export const binaryMarketTypePlugin = {
    marketType: OperatorReads.MARKET_TYPE_BINARY_V1,
    label: "Binary (up/down) v1",
    machinerySteps: BINARY_MACHINERY_STEPS,
    encodeVenueFeeParams: (params, client, binaryModule) => OperatorReads.encodeBinaryVenueFeeParams(params, client, binaryModule),
    decodeVenueFeeParams: (feeParams) => OperatorReads.decodeBinaryVenueFeeParams(feeParams)?.params ?? null,
};
