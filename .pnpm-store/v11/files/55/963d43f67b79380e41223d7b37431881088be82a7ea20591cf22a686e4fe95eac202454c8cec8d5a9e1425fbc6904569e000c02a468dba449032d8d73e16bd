// Vault funding — pre-depositing balance into a pool's internal ERC20Vault.
//
// KIND-AGNOSTIC, unlike most concept modules: every pool IS an ERC20Vault
// (SpotPool.sol:35, prediction/BinaryPool.sol:60), so the same three deposits work
// on spot and binary pools alike. The concept is FUNDING — putting balance in
// before trading — which is why this is not filed under either kind.
//
// The withdraw side lives in binary/settlement.ts, not here: it exists to claim
// `PayoutFallbackToVault` credit, a binary-settlement concept. Same contract
// function, different reason to exist. `withdrawVault` is also what takes funds
// back OUT of a manual-mode balance — see spot/vaultMode.ts.

import type { Address } from "viem";
import { InvalidInputError } from "../errors.js";
import * as ReadsAbi from "../readsAbi.js";
import * as Revert from "../revert.js";
import * as TradeAbi from "../tradeAbi.js";
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
export const NATIVE_TOKEN_SENTINEL: Address = "0x28f34DeFd2b4CB48d9eE6d89f2Be4Bc601694c00";

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
export async function depositVault(w: WriterCtx, p: DepositVaultParams): Promise<TxResult> {
  if (p.amount <= 0n) throw new InvalidInputError("amount must be > 0");
  if (p.token.toLowerCase() === NATIVE_TOKEN_SENTINEL.toLowerCase()) {
    throw new InvalidInputError(
      "deposit does not take the native sentinel — use depositVaultNative (the vault reverts UseDepositNative)",
    );
  }
  const gas = p.gas ?? w.defaultGas;
  // The approval rides in the same executor call as the deposit.
  const approval = await w.approvalIfNeeded(p.token, p.vault, p.amount, gas);
  return w.execute(
    {
      address: p.vault,
      abi: TradeAbi.erc20VaultWriteAbi,
      functionName: "deposit",
      args: [p.token, p.amount],
      gas,
    },
    approval ? [approval] : [],
  );
}

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
export async function depositVaultNative(w: WriterCtx, p: DepositVaultNativeParams): Promise<TxResult> {
  if (p.amount <= 0n) throw new InvalidInputError("amount must be > 0");
  const gas = p.gas ?? w.defaultGas;
  // A pool whitelists which token its vault accepts and rejects the rest with
  // `InvalidDepositOrWithdrawal`. That now decodes by name, but the name alone does
  // not say which token the pool DOES take. Catch the binary case here instead,
  // where the whitelist is exactly one token: unless a binary pool's collateral IS
  // native, a native deposit cannot succeed — so this answers without spending a
  // failed transaction to find out.
  //
  // `collateralToken()` exists only on BinaryPool, so a MISSING view means "not a
  // binary pool" — a SpotPool falls through to the chain, which accepts native
  // whenever it is that pool's base or quote. Any other failure (the request never
  // got through) propagates: broadcasting on an unanswered preflight would spend
  // a transaction to learn what the read was for.
  const collateral = await w.publicClient
    .readContract({ address: p.vault, abi: ReadsAbi.binaryPoolTokensAbi, functionName: "collateralToken" })
    .catch((e: unknown) => {
      if (Revert.isMissingContractView(e)) return undefined;
      throw e;
    });
  if (collateral !== undefined && collateral.toLowerCase() !== NATIVE_TOKEN_SENTINEL.toLowerCase()) {
    throw new InvalidInputError(
      `pool ${p.vault} does not accept native deposits — its vault token is ${collateral}. ` +
        "Use depositVault with that token, or a pool whose base/quote is native.",
    );
  }
  // depositNativeFor(owner) credits `owner`; depositNative() credits msg.sender.
  // Same value semantics either way — only the crediting differs.
  return w.execute({
    address: p.vault,
    abi: TradeAbi.erc20VaultWriteAbi,
    ...(p.owner
      ? { functionName: "depositNativeFor" as const, args: [p.owner] }
      : { functionName: "depositNative" as const, args: [] }),
    value: p.amount,
    gas,
  });
}
