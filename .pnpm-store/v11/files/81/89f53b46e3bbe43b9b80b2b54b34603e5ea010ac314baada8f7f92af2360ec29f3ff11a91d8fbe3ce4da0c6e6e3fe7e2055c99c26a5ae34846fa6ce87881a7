// Bridge types + one enumeration: which tokens can cross. (Which networks they
// cross between is `ChainId`, which lives with the chain definitions in
// `../chainId` — every Somnia network has a chain id; only some are bridged.)
//
// ENUM STYLE: `const` objects paired with a same-named type, not TS `enum`s.
// That is the pattern this package uses everywhere (`BinarySide`, `MarketType`,
// `PriceCandleResolution`) and it is the one that survives `isolatedModules` +
// TS's erasable-syntax direction: a TS `enum` emits a runtime object that can't
// be erased and doesn't tree-shake. You still get enum ergonomics —
// `BridgeToken.WBTC` for the value, `BridgeToken` for the type — plus plain
// string/number literals work as arguments, which a real enum forbids.
/**
 *  The tokens with a live warp route, by symbol.
 *
 *  `BridgeToken.WBTC` is the value; `BridgeToken` is also the type of every such
 *  value. Adding a token is a registry change, not a code change.
 *
 * **Example** (Naming a bridge token)
 *
 * ```ts
 * import { BridgeToken } from "@somnia-chain/markets-sdk/chains";
 *
 * const symbol: BridgeToken = BridgeToken.WBTC;  // "WBTC"
 * ```
 *
 * @category bridging
 */
export const BridgeToken = {
    /** Native gas coin of every Somnia network. Native on BOTH sides of its route. */
    STT: "STT",
    /** Somnia USD test stable, 18 decimals. */
    USDso: "USDso",
    /** Wrapped Bitcoin — **8 decimals**, on the canonical token AND the synthetic. */
    WBTC: "WBTC",
    /** Wrapped ETH, 18 decimals. */
    WETH: "WETH",
    /** Hyperlane Bridge Test Token — a throwaway used to verify the lane. */
    HBTT: "HBTT",
};
