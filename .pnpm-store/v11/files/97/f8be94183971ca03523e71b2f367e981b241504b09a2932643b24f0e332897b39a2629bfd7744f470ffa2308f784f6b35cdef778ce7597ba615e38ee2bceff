# Chains

Every Somnia network as a viem `Chain`, from one import — so nothing has to
hand-roll a `defineChain({...})` or reach for `viem/chains` again.

```ts
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
```

`chain` is a required field of every exchange/client config (it signs writes and
sizes viem's waiting heuristics), and `wsRpcUrl` is the transport the live tail
runs on — both come straight off these objects.

Moving tokens _between_ these networks is the [bridge](./BRIDGE.md) — same module,
same import.

## The networks

| Export          | Chain id | Native | Blocks    | Multicall3 | Explorer                                                                   |
| --------------- | -------- | ------ | --------- | ---------- | -------------------------------------------------------------------------- |
| `somniaMainnet` | `5031`   | SOMI   | 100 ms    | ✅         | [explorer.somnia.network](https://explorer.somnia.network)                 |
| `somniaShannon` | `50312`  | STT    | 100 ms    | ✅         | [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network) |
| `somniaElwood`  | `50313`  | STT    | 100 ms    | —          | —                                                                          |
| `hidekiTestnet` | `50383`  | STT    | **10 ms** | ✅         | —                                                                          |
| `somniaLocal`   | `31337`  | STT    | —         | —          | —                                                                          |

- **Shannon** (`somniaShannon`) is the public testnet and the default target for
  development. `https://dream-rpc.somnia.network` is an alias for the same
  network and is listed as a secondary endpoint.
- **Elwood** is the testnet's regenesis: its own cluster, DNS zone and genesis,
  otherwise identical to Shannon.
- **Hideki** is the low-latency Tokyo network — ~100 blocks/s. If you are
  measuring latency, measure here.
- **`somniaLocal`** is the anvil stack (`demo-clob.sh up`, `DEPLOY_ENV=local`).
  It deliberately presents as _Somnia_/_STT_ rather than _Foundry_/_Ether_: the
  agent-facing docs read the chain name and native symbol out of this object, and
  a local stack should still read as Somnia there.

Every definition carries **both** transports — `rpcUrls.default.http` and
`rpcUrls.default.webSocket` — so an exchange can be built from the chain alone:

```ts
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet as chain } from "@somnia-chain/markets-sdk/chains";

const exchange = new SomniaMarkets({
  chain,
  wsRpcUrl: chain.rpcUrls.default.webSocket[0],
  indexerUrl: "/v1/graphql",
});
```

## Absences are deliberate

Elwood and the local chain carry **no `contracts.multicall3`** and no
`blockExplorers` — nothing is deployed there to point at. That is not an
oversight to be filled in with the canonical
`0xcA11bde05977b3631167028862bE2a173976CA11`: viem routes batched reads at
whatever address it finds, so a Multicall3 entry with no code behind it turns
every batched read into a failure. An absent field just makes viem fall back to
individual `eth_call`s.

Mainnet, Shannon and Hideki each have their **own** Multicall3 deployment at
_different_ addresses (`0x5e44…5a11`, `0x841b…4223` and `0x540B…D131`) — don't
copy one to another. Hideki's (deployed 2026-08-10 by the bridge infra) is the
canonical runtime bytes at a **non-canonical** address: the presigned
"Nick's method" deployment can never land on Somnia chains — contract creation
costs ~4,928 gas per deployed byte here, far over that transaction's fixed
500k limit — and its nonce-0 deployer has already been burned on these
networks, so `0xcA11bde0…` is unreachable for good.

The values here — ids, cadence, Multicall3 addresses — were verified against the
live networks (`eth_chainId`, block-timestamp deltas over 10k blocks, and a real
`getBlockNumber()` call on each Multicall3 candidate), not copied from a chain
list.

## Resolving a chain id you were handed

Deployment manifests (and `NEXT_PUBLIC_CHAIN_ID`-style env) carry a plain
`number`. `getSomniaChain` bridges that to a `Chain`, returning `null` when the
id isn't one of ours:

```ts
import { getSomniaChain, defineChain } from "@somnia-chain/markets-sdk/chains";

const chain =
  getSomniaChain(deployment.chainId) ??
  defineChain({
    id: deployment.chainId,
    name: "Somnia",
    nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
```

`somniaChains` is the same table, keyed by id — iterate it to build a network
switcher. `isSomniaChainId(id)` is the type guard that narrows a `number` to
`ChainId`, enough to index it without a cast. When the id flows the other way —
your code names the network — **`ChainId`** is the constant to reach for:
`ChainId.somniaShannon` is `50312`, keyed by the same export names as the
definitions (`ChainId.somniaShannon === somniaShannon.id` by construction).

## Extending one

`defineChain` and the `Chain` type are re-exported here, so overriding an
endpoint (a private node, a fork) needs no second import:

```ts
import { defineChain, somniaShannon } from "@somnia-chain/markets-sdk/chains";

const forked = defineChain({
  ...somniaShannon,
  id: 31_337,
  name: "Somnia Testnet (forked)",
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"], webSocket: ["ws://127.0.0.1:8545"] } },
});
```

## Relationship to `viem/chains`

viem ships two of these networks as `somnia` and `somniaTestnet`; our
`somniaMainnet` and `somniaShannon` carry the same content under the names the
runbooks use (a test asserts field-for-field parity), and the module adds the
three networks viem cannot ship — Elwood, Hideki and the local stack are ours,
on our cadence. One import covers every target, and a new network lands when we
bring it up rather than when viem next cuts a release.

Each definition lives in its own file under `src/chains/definitions/`, written the
way viem writes its own, so the two stay diffable. `src/chains/bridge/` sits
alongside them with the warp-route registry — see the [bridge guide](./BRIDGE.md).
