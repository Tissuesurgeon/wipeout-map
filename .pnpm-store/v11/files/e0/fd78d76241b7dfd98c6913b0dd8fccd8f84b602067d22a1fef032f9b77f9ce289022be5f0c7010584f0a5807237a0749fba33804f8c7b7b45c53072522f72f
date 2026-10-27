# How to sign with a browser wallet

This guide shows you how to let a user trade through an injected wallet such as MetaMask instead of a private key held by your code. It assumes a React app with wagmi or another source of a viem `WalletClient`. For a Node process, use `privateKey` instead; see [Configure the SDK](./configure-for-a-network.md).

## Construct without a signer, bind on connect

A browser app has no signer at boot. Construct the exchange for public reads, then bind the wallet when it connects and unbind it when it disconnects.

```tsx
import { useEffect } from "react";
import { useWalletClient } from "wagmi";
import { exchange } from "./exchange.js"; // the module-scope SomniaMarkets instance

export function SignerBinding() {
  const { data: walletClient } = useWalletClient();
  useEffect(() => {
    exchange.setSigner(walletClient ? { walletClient } : {});
  }, [walletClient]);
  return null;
}
```

`setSigner` replaces the trader that every authenticated verb uses and updates `exchange.walletAddress`. Live watches and market data are unaffected.

After binding, the exchange verbs work as they do with a private key:

```ts
const order = await exchange.createOrder("SOMI/USDso", "limit", "buy", 10, 0.11);
```

## What differs from a local key

The wallet signs after a user prompt, sends through `eth_sendTransaction`, and the SDK reads the receipt on the next block heads instead of in one round-trip. The first order per token also prompts for an approval. Both paths resolve to the same result shape once the transaction is mined. The [Configuration reference](../reference/configuration.md#signer-paths) tabulates the differences.

## Make sure the wallet is on the right chain

The SDK does not switch chains. Check `walletClient.chain?.id` against `exchange.client.config.chain.id` before a write, and ask the wallet to switch with wagmi's `useSwitchChain` when they differ. A write from the wrong chain is rejected by the wallet or the node, not by the SDK.

## Use the owner-derived trader with a wallet

After `setSigner` binds the wallet, use the trader owned by the same exchange. It inherits the exchange's chain, read client, addresses, and lifecycle.

```ts
await exchange.trader.faucet();
```

## Show the connected account's data

`fetchBalance`, `fetchOpenOrders`, `watchOrders`, and `watchMyTrades` answer for `exchange.walletAddress`. In React, prefer the hooks with the account from wagmi's `useAccount`: `useWatchUser(address)` plus `useLiveUserOrders(pool, address)`. See [Use the React hooks](./use-the-react-hooks.md).

## Handle a rejected prompt

A user who dismisses the wallet prompt produces an error from the wallet, not from the SDK. It does not extend `SomniaMarketsError`, so keep a final `throw` or a wallet-specific branch in your handler. See [Handle errors and reverts](./handle-errors.md).
