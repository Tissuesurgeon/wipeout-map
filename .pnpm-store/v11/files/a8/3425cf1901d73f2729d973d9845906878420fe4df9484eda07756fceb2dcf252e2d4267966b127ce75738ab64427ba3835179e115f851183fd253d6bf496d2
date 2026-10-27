import type { Address, Hex, PublicClient } from "viem";
/**
 *  One type-specific machinery onboarding step (rendered by a wizard; the
 *  preflight validators key off `id`). Descriptive only — no logic here.
 *
 * @category market types
 */
export interface MachineryStep {
    /** Stable step id (e.g. "market-creator", "funding", "series"). */
    id: string;
    /** Short human label. */
    label: string;
    /** One-line description of what the operator does in this step. */
    description: string;
}
/**
 * A market-type plugin: the fee-param codec + machinery descriptor for one
 * bytes4 `marketType`. `TParams` is the type's plain fee-param shape (e.g.
 * {@link BinaryVenueParams} for BINARY_V1).
 *
 * @category market types
 */
export interface MarketTypePlugin<TParams = unknown> {
    /** The bytes4 market-type id (e.g. `MARKET_TYPE_BINARY_V1`). */
    marketType: Hex;
    /** Human label for the type. */
    label: string;
    /** The type-specific machinery onboarding steps, in order. */
    machinerySteps: readonly MachineryStep[];
    /**
     *  Encode plain fee params into a venue's opaque `feeParams` bytes — for
     *  binary this defers to the module's on-chain encoder (needs a client +
     *  the module address), so it is async.
     */
    encodeVenueFeeParams(params: TParams, client: PublicClient, moduleAddress: Address | undefined): Promise<Hex>;
    /**
     *  Decode a venue's `feeParams` bytes back into plain params for display, or
     *  null if the bytes aren't this type's shape. Pure/local.
     */
    decodeVenueFeeParams(feeParams: Hex): TParams | null;
}
