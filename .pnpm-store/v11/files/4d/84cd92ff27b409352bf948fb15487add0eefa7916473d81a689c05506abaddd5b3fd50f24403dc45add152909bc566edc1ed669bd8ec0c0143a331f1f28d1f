import type { Address } from "viem";
import type { Writer as WriterCtx } from "../writer.js";
import type { DepositVaultParams, DepositVaultNativeParams, TxResult } from "../trade.js";
/**
 *  The vault's native-token sentinel — the pseudo-address every ERC20Vault uses to
 *  key native (SOMI) balances, since native has no ERC-20 contract.
 *
 *  **Details**
 *
 *  Mirrors `NATIVE_TOKEN` in the protocol's `common/Common.sol`. Pass it to
 *  {@link SomniaMarketsClient.getVaultBalance | client.getVaultBalance} or
 *  `withdrawVault` to address a native balance — but NOT
 *  to {@link Trader.depositVault}, which reverts `UseDepositNative`; native goes in
 *  through {@link Trader.depositVaultNative}.
 *
 * @category funding
 */
export declare const NATIVE_TOKEN_SENTINEL: Address;
/**
 *  Pre-fund an ERC-20 balance in a pool's internal vault, approving the pool first
 *  when needed.
 *
 *  **When to use**
 *
 *  Auto-pull covers ordinary order placement — the pool pulls what an order needs
 *  straight from the wallet, so trading needs no deposit at all. Deposit when the
 *  funding must happen BEFORE and SEPARATELY from the order: under manual vault
 *  mode (see `setManualVaultMode`), for a callback-triggered order that runs with
 *  `msg.value == 0`, or to fund an account a bot will trade from later.
 *
 *  **Gotchas**
 *
 *  Rejects the native sentinel client-side — native deposits are
 *  {@link depositVaultNative} (the contract's own `UseDepositNative` revert is not
 *  in the generated error table, so this preflight is what produces a clear error).
 *
 * **Example** (Funding and withdrawing a vault)
 *
 *  ```ts
 *  await trader.depositVault({ vault: pool, token, amount: 1_000_000n });
 *  const bal = await client.getVaultBalance({ vault: pool, owner: owner, token });
 *  await trader.withdrawVault({ vault: pool, token, amount: bal });
 *  ```
 */
export declare function depositVault(w: WriterCtx, p: DepositVaultParams): Promise<TxResult>;
/**
 *  Pre-fund a native (SOMI) balance in a pool's internal vault — for the signer, or
 *  for another account when `owner` is set.
 *
 *  **Details**
 *
 *  The amount travels as `msg.value`, so there is no approval step. With `owner`
 *  set the value credits THAT account, not the sender — how an operator pre-funds a
 *  bot wallet it holds no key for. Read the result with
 *  `getVaultBalance({ vault, owner, token: NATIVE_TOKEN_SENTINEL })`.
 *
 *  **Gotchas**
 *
 *  ONLY works on a pool whose own tokens include native — a SpotPool with a native
 *  base or quote. Every pool whitelists what its vault accepts (SpotPool: base or
 *  quote; BinaryPool: its collateral only), so a native deposit into a tUSDC-
 *  collateral binary pool reverts `InvalidDepositOrWithdrawal` — verified on a live
 *  stack. Fund those with {@link depositVault} and their collateral token instead.
 *
 * **Example** (Funding another account)
 *
 *  ```ts
 *  await trader.depositVaultNativeFor({ vault: pool, owner, amount: 10n ** 18n });
 *  ```
 */
export declare function depositVaultNative(w: WriterCtx, p: DepositVaultNativeParams): Promise<TxResult>;
