// Spot manual vault mode — the auto-pull opt-out.
//
// SPOT-ONLY: `setManualVaultMode` is declared on ISpotPool (SpotPool.sol:212).
// BinaryPool inherits the same ERC20Vault but has no mode switch — binary funding
// is always the module-routed escrow path.
//
// What the flag actually does, both directions (SpotPool.sol:1036 _shouldAutoPull,
// and the autoPullDeliver flag each order captures at placement):
//
//               auto mode (default)        manual mode
//   placing  →  pulls from the wallet      vault balance only
//   fills    →  proceeds to the wallet     proceeds stay as vault credit
//   cancel   →  refund to the wallet       refund stays as vault credit
//
// So opting in means the money stops arriving on its own: `withdrawVault` is how it
// comes back out. Pre-fund with vault/funding.ts.

import type { Address, PublicClient } from "viem";
import * as TradeAbi from "../tradeAbi.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { SetManualVaultModeParams, TxResult } from "../trade.js";

/**
 *  Turn the signer's auto-pull opt-out on or off for ONE SpotPool.
 *
 *  **When to use**
 *
 *  When funding must be explicit and pre-committed rather than pulled at placement:
 *  a bot that budgets per venue, a desk that wants a hard ceiling on what one pool
 *  can take from its wallet, or a test that needs placement to fail (not silently
 *  succeed by pulling) when the vault is short.
 *
 *  **Gotchas**
 *
 *  Scoped per user PER POOL — a bot on several venues sets it on each one; there is
 *  no global switch.
 *
 *  It also stops payouts being delivered: while enabled, fill proceeds and cancel
 *  refunds accumulate as vault credit instead of landing in the wallet. Claim them
 *  with `withdrawVault`. Disabling the mode does NOT sweep credit already parked —
 *  it only changes routing for orders placed afterwards.
 *
 * **Example** (Trading in manual vault mode)
 *
 *  ```ts
 *  await trader.depositVault({ vault: pool, token: quote, amount: 1_000_000n });
 *  await trader.setManualVaultMode({ pool, enabled: true });
 *  // ...place and trade; proceeds land as vault credit, not in the wallet...
 *  const owed = await client.getVaultBalance({ vault: pool, owner, token: quote });
 *  await trader.withdrawVault({ vault: pool, token: quote, amount: owed });
 *  // Scoped per pool: a bot on several venues repeats this on each one.
 *  await trader.setManualVaultMode({ pool, enabled: false });
 *  ```
 */
export async function setManualVaultMode(w: WriterCtx, p: SetManualVaultModeParams): Promise<TxResult> {
  return w.execute({
    address: p.pool,
    abi: TradeAbi.spotVaultModeAbi,
    functionName: "setManualVaultMode",
    args: [p.enabled],
    gas: p.gas ?? w.defaultGas,
  });
}

/**
 * Identifies one user's vault mode on one pool — see {@link SomniaMarketsClient.getManualVaultMode}.
 *
 * @category spot markets
 */
export interface GetManualVaultModeParams {
  /** The SpotPool to read. */
  pool: Address;
  /** The user whose mode to read. */
  user: Address;
}

/**
 *  Whether `user` has opted out of auto-pull on this SpotPool, at chain head.
 *
 *  True means their orders draw only on pre-deposited vault balance, and their
 *  payouts stay as vault credit — see {@link setManualVaultMode}.
 */
export async function getManualVaultMode(p: GetManualVaultModeParams, client: PublicClient): Promise<boolean> {
  return client.readContract({
    address: p.pool,
    abi: TradeAbi.spotVaultModeAbi,
    functionName: "getManualVaultMode",
    args: [p.user],
  });
}
