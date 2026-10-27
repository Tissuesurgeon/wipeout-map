import type { Address } from "viem";
import type { Executor } from "./executor/types.js";
/**
 *  An account for a multi-chain {@link SomniaMarkets}: one address, and the
 *  executor that acts as it on each configured chain.
 *
 *  **Details**
 *
 *  Pass it as `account` in {@link SomniaMarketsConfig}. Portfolio reads
 *  (`fetchBalance`, `fetchPositions`, …) use `address` on every chain; a write
 *  for a market on chain N goes through `executors[N]`. A chain with no
 *  executor is read-only: a write there throws {@link NotConfiguredError}
 *  naming the chain.
 *
 *  **Gotchas**
 *
 *  Every executor's `actor` must equal `address`, or the SDK would read
 *  allowances for one account and send as another. The facade checks this at
 *  construction and throws {@link InvalidInputError} on a mismatch.
 *
 *  The account's `inner` executors sign locally, as in the example. An
 *  executor from `createExecutor({ sessionSeed })` sends its seed to the node
 *  on every write, so the smart-account spec refuses it as `inner`.
 *  Use one sending mode per address: local and node-side sends from the same
 *  address share one nonce space.
 *
 * **Example** (One smart account on two chains)
 *
 *  ```ts
 *  const exchange = new SomniaMarkets({
 *    chains: [l1, hideki],
 *    account: {
 *      address: ACCOUNT,
 *      executors: {
 *        [l1.chain.id]: l1Engine.createExecutor({
 *          smartAccount: ACCOUNT,
 *          inner: l1Engine.createExecutor({ privateKey: sessionKey }),
 *        }),
 *        [hideki.chain.id]: l2Engine.createExecutor({
 *          smartAccount: ACCOUNT,
 *          inner: l2Engine.createExecutor({ privateKey: sessionKey }),
 *        }),
 *      },
 *    },
 *  });
 *  ```
 *
 * @category clients
 */
export interface SomniaMarketsAccount {
    /** The account's address — the same on every chain. */
    address: Address;
    /** The executor that acts as `address` on each chain, keyed by chain id. */
    executors: Partial<Record<number, Executor>>;
}
/** True when a signer config value is a {@link SomniaMarketsAccount} rather than a viem account or address. */
export declare function isSomniaMarketsAccount(value: unknown): value is SomniaMarketsAccount;
