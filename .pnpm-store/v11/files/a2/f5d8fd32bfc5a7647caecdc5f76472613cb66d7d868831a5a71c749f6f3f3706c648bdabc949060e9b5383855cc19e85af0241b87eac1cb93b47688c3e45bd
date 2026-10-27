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

import type { Address, Hex } from "viem";

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
} as const;

/**
 * One of the {@link BridgeToken} symbols.
 *
 * @category bridging
 */
export type BridgeToken = (typeof BridgeToken)[keyof typeof BridgeToken];

/**
 *  How a warp route holds value on one side.
 *
 *  - `native` — the router escrows the chain's own gas coin and delivery pays out
 *    of the destination router's balance. No wrapped token exists. Needs seeded
 *    liquidity on each side (see {@link BridgeTokenDetails.requiresDestinationLiquidity}).
 *  - `collateral` — the token's home chain: the router escrows the canonical
 *    ERC-20, which the sender must `approve` first.
 *  - `synthetic` — the router *is* an ERC-20 it mints and burns 1:1 against the
 *    collateral held on the home chain. No approval needed to send back.
 *
 * @category bridging
 */
export type BridgeTokenModel = "native" | "collateral" | "synthetic";

/**
 *  One token on one network: which router moves it, what the sender actually holds,
 *  and where it can go.
 *
 * @category bridging
 */
export interface BridgeTokenDetails {
  /** The token symbol. */
  token: BridgeToken;
  /** Chain id of the network these details describe (also the Hyperlane domain id). */
  chainId: number;
  /** Hyperlane registry name of that network, e.g. `"somniatestnet"`. */
  network: string;
  /** How this side holds value — decides approvals and `msg.value`. */
  model: BridgeTokenModel;
  /** The warp router to call `transferRemote` on. */
  router: Address;
  /**
   *  The ERC-20 the sender holds on this chain: the canonical token for
   *  `collateral`, the router itself for `synthetic` (a HypERC20 *is* its token),
   *  and `null` for `native` — where the balance is the chain's gas coin.
   */
  address: Address | null;
  /** Decimals on this side. Amounts are base units of THIS number. */
  decimals: number;
  /** Human name of the token, e.g. `"Wrapped Bitcoin"`. */
  name: string;
  /** Chain ids this token can be bridged to from here. */
  destinations: number[];
  /**
   *  True when delivery is paid out of the destination router's own balance rather
   *  than by minting — the `native` model. Such a route can stall if the
   *  destination router is drained, so check its balance before sending.
   */
  requiresDestinationLiquidity: boolean;
}

/**
 * The Hyperlane core deployment on one network, plus what it carries.
 *
 * @category bridging
 */
export interface BridgeNetworkDetails {
  /** Chain id. */
  chainId: number;
  /** Hyperlane domain id — equal to the chain id on this bridge. */
  domainId: number;
  /** Hyperlane registry name, e.g. `"hideki2testnet"`. */
  network: string;
  /** Human name, e.g. `"Hideki2 Testnet"`. */
  displayName: string;
  /** Dispatches and delivers interchain messages. */
  mailbox: Address;
  /** The default ISM messages are verified against (1-of-1 multisig on this lane). */
  interchainSecurityModule: Address;
  /** Accumulates dispatched message ids into the tree validators sign. */
  merkleTreeHook: Address;
  /** Where validators announce their checkpoint storage. */
  validatorAnnounce: Address;
  /** Interchain account router (not used by token transfers). */
  interchainAccountRouter: Address;
  /** Proxy admin owning the core proxies. */
  proxyAdmin: Address;
  /**
   *  `null` — no InterchainGasPaymaster is deployed on this bridge, which is why
   *  `quoteGasPayment` is 0 and the relayer absorbs delivery gas.
   */
  interchainGasPaymaster: null;
  /** Tokens with a route on this network. */
  tokens: BridgeToken[];
}

/**
 * A token route between exactly two networks.
 *
 * @category bridging
 */
export interface BridgeRoute {
  /** Hyperlane route id, e.g. `"WBTC/somniatestnet-hideki2testnet"`. */
  id: string;
  /** The token this route carries. */
  token: BridgeToken;
  /** The two chain ids it connects. Bridging is NOT transitive. */
  chainIds: [number, number];
}

/**
 * The bridge as a whole: what it connects, what it carries, and how far to trust it.
 *
 * @category bridging
 */
export interface BridgeDetails {
  /** Lane id, e.g. `"somniatestnet-hideki2testnet"`. */
  id: string;
  /** Human name of the lane. */
  displayName: string;
  /** Chain ids the bridge connects. */
  chainIds: number[];
  /** Tokens with at least one route. */
  tokens: BridgeToken[];
  /** Every token route on the lane. */
  routes: BridgeRoute[];
  /**
   *  `"dev-test"` — a single validator, a threshold-1 ISM and EOA owners. One key
   *  is the entire bridge. **Do not put real funds behind it.**
   */
  status: "dev-test";
  /** Validators in the multisig ISM, and how many signatures it requires. */
  security: { validators: Address[]; threshold: number };
  /**
   *  True when the relayer pays destination gas unmetered — so a sender attaches
   *  nothing for delivery, and delivery depends on the relayer staying funded.
   */
  relayerPaysDestinationGas: boolean;
  /** Where the deployment record lives. */
  docs: string;
}

/**
 *  One unsigned transaction of a bridge transfer, ready for any signer: spread
 *  into viem's `sendTransaction`, hand to {@link sendBridgeStep} for Somnia's
 *  one-round-trip sync path, or convert with {@link toEip1193Transaction}
 *  for a browser wallet. Its ROLE is the field it hangs off — `approveStep` or
 *  `bridgeStep` — so it carries no tag; `description` is the human label.
 *
 *  Deliberately minimal and chain-tagged: no nonce, no fees, no gas — the
 *  signer's job. (No viem type requires exactly these fields, which is why
 *  this one exists; it is assignable to viem's `TransactionRequest`.)
 *
 * @category bridging
 */
export interface BridgeTransaction {
  /** Chain this must be sent on — always the ORIGIN chain. */
  chainId: number;
  /** Contract to call. */
  to: Address;
  /** ABI-encoded calldata. */
  data: Hex;
  /** Native value to attach, in wei. `0n` unless the route is native. */
  value: bigint;
  /** What this transaction does, for a UI to label a confirmation with. */
  description: string;
}

/**
 *  A bridge transfer, expanded into the transactions it actually takes.
 *
 *  Two or one: a `collateral` transfer needs an ERC-20 `approve` before the
 *  bridge call; `native` and `synthetic` transfers do not. `approveStep` is
 *  simply absent when there is nothing to approve — branching on it narrows:
 *
 * **Example** (Sending an approval before a transfer)
 *
 * ```ts
 * if (plan.approveStep) {
 *   await sendBridgeStep(client, plan.approveStep, { account }); // confirmed before the next line
 * }
 * await sendBridgeStep(client, plan.bridgeStep, { account });
 * ```
 *
 *  Everything protocol-derived lives on the transactions themselves or on
 *  `origin`/`destination` — e.g. a native route's destination-liquidity caveat
 *  is {@link BridgeTokenDetails.requiresDestinationLiquidity} on `destination`,
 *  and an interchain gas payment is already folded into `bridgeStep.value`.
 *
 * @category bridging
 */
export interface BridgeTransfer {
  /** The origin-side token being sent. */
  origin: BridgeTokenDetails;
  /** The destination-side token that will be received. */
  destination: BridgeTokenDetails;
  /** Amount in base units of `origin.decimals`. */
  amount: bigint;
  /** Who receives it on the destination chain. */
  recipient: Address;
  /**
   *  The ERC-20 approval a **collateral** route needs first — absent on native
   *  and synthetic routes. Confirm it before sending `bridgeStep`, which spends
   *  the allowance.
   */
  approveStep?: BridgeTransaction;
  /**
   *  The `transferRemote` call on the origin router — the transaction that
   *  bridges. Always present, always sent last: it escrows or burns on the
   *  origin and dispatches the interchain message. Its `value` carries the
   *  amount on a native route (plus any `gasPayment` passed in), `0n` otherwise.
   */
  bridgeStep: BridgeTransaction;
}
