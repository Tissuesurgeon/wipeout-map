// Operator grants on the shared OperatorPermissionsRegistry — the owner side of
// delegation.
//
// SPOT-ONLY: the registry gates SpotPool's operator entry points (placeOrderFor and
// friends). A BinaryPool escrows through the module and has no operator gate.
//
// Two scopes, and the difference matters when choosing one:
//
//   forPool  →  one pool, one operator. The tighter default.
//   global   →  every pool in the linked pool registry. What SpotRouter requires,
//               because the router is not on any pool's system-level allowlist.
//
// Both writes key off `msg.sender`: the SIGNER is the owner granting. There is no
// way to grant on another account's behalf, so these params carry no `owner` field.
//
// Revoking is the same call with `approved: false` — the registry stores a boolean
// per (owner, operator, selector) slot rather than a grant list, so there is no
// separate revoke entry point.
import { isAddress } from "viem";
import * as ReadsAbi from "../readsAbi.js";
import * as TradeAbi from "../tradeAbi.js";
import { InvalidInputError, NotConfiguredError } from "../errors.js";
import { ZERO_ADDRESS } from "../writer.js";
/**
 *  Selector for `placeOrderFor` — an operator placing an order for its owner.
 *
 *  Granting this is what admits a trading bot, and what `SpotRouter` requires
 *  globally. Asserted against the function signature in the test suite, so it cannot
 *  drift from the contract.
 *
 * @category spot markets
 */
export const PLACE_ORDER_FOR_SELECTOR = "0x80054449";
/**
 *  Selector for `cancelOrderFor` — an operator cancelling an order for its owner.
 *
 *  Grant it alongside {@link PLACE_ORDER_FOR_SELECTOR} for a bot that manages its own
 *  orders; a place-only grant leaves the owner as the only account able to cancel.
 *
 * @category spot markets
 */
export const CANCEL_ORDER_FOR_SELECTOR = "0xe37b444b";
// The registry reverts InvalidOperator() and EmptySelectors() on these two inputs
// (OperatorPermissionsRegistry.sol:81-82). Both are decidable off-chain, so refuse
// before spending gas to be told.
function requireGrantInputs(operator, selectors) {
    // Shape first, and with isAddress rather than isAddressEqual: the latter THROWS
    // viem's InvalidAddressError on a malformed string, and a third-party error should
    // not escape this boundary (see chains/bridge/transfer.ts for the same guard).
    if (!isAddress(operator, { strict: false })) {
        throw new InvalidInputError(`operator must be an address (got ${String(operator)})`);
    }
    if (operator.toLowerCase() === ZERO_ADDRESS) {
        throw new InvalidInputError("operator must not be the zero address");
    }
    if (selectors.length === 0) {
        throw new InvalidInputError("selectors must not be empty — pass at least one 4-byte selector to grant or revoke");
    }
    // viem rejects a WRONG-LENGTH hex string at encode time, but a non-hex one
    // (`"nope"`) encodes silently — its ASCII is spliced straight into the calldata
    // word, so the grant would be written against a garbage selector. Check the shape.
    const malformed = selectors.find((s) => !/^0x[0-9a-fA-F]{8}$/.test(s));
    if (malformed !== undefined) {
        throw new InvalidInputError(`selector must be 4 bytes of hex (got ${String(malformed)})`);
    }
}
/**
 *  Grant or revoke an operator across EVERY pool in the linked pool registry.
 *
 *  **When to use**
 *
 *  When the operator is a piece of infrastructure rather than a per-venue bot — most
 *  concretely `SpotRouter`, which is not on any pool's system-level allowlist and so
 *  can only be admitted this way. `SpotRouter` prescribes exactly this grant with
 *  `[PLACE_ORDER_FOR_SELECTOR]`; without it a swap reverts
 *  `RouterNotApprovedAsOperator`.
 *
 *  Prefer {@link setOperatorApprovalForPool} for a bot that trades one venue — same
 *  admission, far less blast radius.
 *
 *  **Details**
 *
 *  The grant is per `msg.sender`, so the signer is the owner granting. Pass
 *  `approved: false` to revoke.
 *
 *  A global grant only takes effect on pools the linked pool registry has
 *  registered — the registry gates it on `isRegistered(pool)` when resolving. A
 *  per-pool DENIAL still overrides it.
 *
 *  **Gotchas**
 *
 *  "Every pool" includes pools registered AFTER the grant. This is the broad
 *  instrument; scope it by passing only the selectors the operator actually needs.
 *
 * **Example** (Granting and revoking router access)
 *
 *  ```ts
 *  const trader = client.createTrader({ privateKey });
 *  const routerAddress = owner; // stand-in for the SpotRouter address
 *  await trader.setOperatorApprovalGlobal({
 *    operator: routerAddress,
 *    selectors: [PLACE_ORDER_FOR_SELECTOR],
 *    approved: true,
 *  });
 *  // ...swap...
 *  await trader.setOperatorApprovalGlobal({
 *    operator: routerAddress,
 *    selectors: [PLACE_ORDER_FOR_SELECTOR],
 *    approved: false,
 *  });
 *  ```
 */
export async function setOperatorApprovalGlobal(w, p) {
    requireGrantInputs(p.operator, p.selectors);
    const registry = w.resolveOperatorRegistry(p.operatorRegistry);
    return w.execute({
        address: registry,
        abi: TradeAbi.operatorRegistryWriteAbi,
        functionName: "setOperatorApprovalGlobal",
        args: [p.operator, [...p.selectors], p.approved],
        gas: p.gas ?? w.defaultGas,
    });
}
/**
 *  Grant or revoke an operator on ONE SpotPool.
 *
 *  **When to use**
 *
 *  The tighter default, and the right shape for a trading bot: it can act for the
 *  owner on the venue it was hired for and nowhere else. Grant
 *  {@link PLACE_ORDER_FOR_SELECTOR} and {@link CANCEL_ORDER_FOR_SELECTOR} together
 *  for a bot that manages its own orders.
 *
 *  **Details**
 *
 *  The grant is per `msg.sender`, so the signer is the owner granting. Pass
 *  `approved: false` to revoke.
 *
 *  Read the result back with {@link SomniaMarketsClient.isApprovedForPool} (the raw
 *  slot this call writes) or with
 *  {@link SomniaMarketsClient.isOperatorAuthorized} (the pool's resolved answer,
 *  which also accounts for a global grant and for denials).
 *
 * **Example** (Granting pool access)
 *
 *  The signer IS the granting owner: the registry keys grants off msg.sender, so
 *  there is no `owner` parameter to pass.
 *
 *  ```ts
 *  const trader = client.createTrader({ privateKey });
 *  const bot = owner; // stand-in for the operator's address
 *  const selectors = [PLACE_ORDER_FOR_SELECTOR, CANCEL_ORDER_FOR_SELECTOR];
 *  await trader.setOperatorApprovalForPool({ pool, operator: bot, selectors, approved: true });
 *
 *  await client.isApprovedForPool({ pool, owner, operator: bot, selector: PLACE_ORDER_FOR_SELECTOR });
 *  // → true
 *
 *  await trader.setOperatorApprovalForPool({ pool, operator: bot, selectors, approved: false });
 *  await client.isApprovedForPool({ pool, owner, operator: bot, selector: PLACE_ORDER_FOR_SELECTOR });
 *  // → false
 *  ```
 */
export async function setOperatorApprovalForPool(w, p) {
    requireGrantInputs(p.operator, p.selectors);
    const registry = w.resolveOperatorRegistry(p.operatorRegistry);
    return w.execute({
        address: registry,
        abi: TradeAbi.operatorRegistryWriteAbi,
        functionName: "setOperatorApprovalForPool",
        args: [p.pool, p.operator, [...p.selectors], p.approved],
        gas: p.gas ?? w.defaultGas,
    });
}
// The reads take the registry positionally (createClient supplies it from config —
// the same shape as OperatorReads.encodeBinaryVenueFeeParams). Writes go through
// w.resolveOperatorRegistry instead, which also rejects a configured zero address.
// Reads deliberately do NOT shape-guard owner/operator the way the writes guard
// `operator`: a read costs no gas, so viem's own address error is already actionable
// and a second guard would only add surface. The registry address IS guarded, because
// reading address(0) returns a plausible `false` rather than failing.
function requireReadRegistry(registry) {
    // Lowercased before comparing. The digits carry no case, but the `0x` PREFIX does:
    // a strict `=== ZERO_ADDRESS` (what writer.ts's siblings use) lets "0X0000…0000"
    // through. viem emits lowercase, so this is belt-and-braces rather than a live bug.
    if (!registry || registry.toLowerCase() === ZERO_ADDRESS) {
        throw new NotConfiguredError("addresses.operatorPermissionsRegistry", "an operator grant read");
    }
    return registry;
}
/**
 *  Whether `owner` has a GLOBAL grant on record for this operator and selector, at
 *  chain head.
 *
 *  **Details**
 *
 *  The raw global slot — it answers "did my global grant land?", nothing more. It is
 *  deliberately independent of pool registration and of denials, so a `true` here
 *  does NOT mean the operator can act on a given pool.
 *
 *  For "can this operator actually act on this pool right now?" use
 *  {@link SomniaMarketsClient.isOperatorAuthorized}, which is the resolved decision
 *  the pool's own gate enforces.
 */
export async function isGloballyApproved(p, client, registry) {
    return client.readContract({
        address: requireReadRegistry(registry),
        abi: TradeAbi.operatorRegistryWriteAbi,
        functionName: "isGloballyApproved",
        args: [p.owner, p.operator, p.selector],
    });
}
/**
 *  Whether `owner` has a PER-POOL grant on record for this operator and selector, at
 *  chain head.
 *
 *  **Details**
 *
 *  The raw per-pool slot — the read-back for {@link setOperatorApprovalForPool}. It
 *  ignores any global grant and any denial.
 *
 *  For "can this operator actually act on this pool right now?" use
 *  {@link SomniaMarketsClient.isOperatorAuthorized}, which is the resolved decision
 *  the pool's own gate enforces.
 */
export async function isApprovedForPool(p, client, registry) {
    return client.readContract({
        address: requireReadRegistry(registry),
        abi: TradeAbi.operatorRegistryWriteAbi,
        functionName: "isApprovedForPool",
        args: [p.pool, p.owner, p.operator, p.selector],
    });
}
/**
 *  The OperatorPermissionsRegistry a SpotPool gates its operator calls through, or
 *  `null` when the pool is UNWIRED.
 *
 *  **When to use**
 *
 *  To discover the registry address instead of configuring it. Every grant write and
 *  grant read needs that address, and `addresses.operatorPermissionsRegistry`
 *  (`config.ts`) is the only other way to supply it — no deployment manifest carries
 *  the key yet, so a caller who has not set it by hand is refused with
 *  {@link NotConfiguredError}. Ask the pool, then pass the answer as
 *  `operatorRegistry` on a grant write.
 *
 *  **Details**
 *
 *  The POOL is the authority on which registry is binding: the gate inside
 *  `placeOrderFor` / `cancelOrderFor` / `reduceOrderFor` consults this address and no
 *  other, so a grant written anywhere else is inert. Chain tier, one read at chain
 *  head.
 *
 *  This is a discovery path, not a redirection. A caller who HAS configured
 *  `addresses.operatorPermissionsRegistry` keeps using it — the writes and the grant
 *  reads still resolve the configured value, and this read never overrides it.
 *
 *  **Gotchas**
 *
 *  `null` means the pool holds `address(0)` — "legacy mode", in which the pool denies
 *  every operator call. It is a live answer about the pool, not a failed read, and
 *  substituting the zero address for it would produce grant reads that plausibly
 *  answer `false` forever.
 *
 *  Two pools on one deployment may name different registries. Read per pool rather
 *  than caching one answer for all of them.
 *
 *  Failures are the decorated read client's two: `ContractRevertError` when the pool
 *  rejects the call, `RpcError` when the read gets no answer — which is also how an
 *  address that is not a SpotPool at all surfaces, because an empty return is not
 *  classified as a revert. This function needs no configuration of its own, so it does
 *  not itself throw {@link NotConfiguredError} as the grant reads above do; the client
 *  method that wraps it can, because it resolves its chain clients lazily.
 */
export async function getOperatorPermissionsRegistry(pool, client) {
    const registry = await client.readContract({
        address: pool,
        abi: ReadsAbi.spotPoolOperatorRegistryReadAbi,
        functionName: "getOperatorPermissionsRegistry",
    });
    return registry.toLowerCase() === ZERO_ADDRESS ? null : registry;
}
