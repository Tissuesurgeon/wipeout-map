# Bridge

Moving tokens between Somnia networks. A specialised chain is only useful if value
can reach it — Hideki is a ~10 ms-block network built for traders, and this is how
balances get there from the general-purpose testnet.

```ts
import { BridgeToken, ChainId, createBridgeTransfer, sendBridgeStep } from "@somnia-chain/markets-sdk/chains";
```

It lives in the [chains](./CHAINS.md) module because that is what it is: verified
static addresses, alongside the chain definitions and their Multicall3 entries. The
registry and `createBridgeTransfer` are **pure** — no RPC, no client, no signer:
`createBridgeTransfer` returns transaction data and you send it. `sendBridgeStep`
is the one opt-in sender.

> ⚠️ **This is a dev/test bridge.** One validator, a threshold-1 ISM, EOA owners —
> one key is the entire bridge. `SOMNIA_BRIDGE.status` is `"dev-test"` and it means
> it: **do not put real funds behind it.**

## What's live

One lane — `somniatestnet-hideki2testnet` — with five routes. [Full deployment
record](https://github.com/somnia-chain/hyperlane-bridge-infra/blob/main/docs/deployments/somnia-testnet-hideki2-testnet.md):

| Token   | Somnia Testnet (50312) | Hideki2 Testnet (50383) | Decimals |
| ------- | ---------------------- | ----------------------- | -------- |
| `STT`   | native                 | native                  | 18       |
| `USDso` | collateral             | synthetic               | 18       |
| `WBTC`  | collateral             | synthetic               | **8**    |
| `WETH`  | collateral             | synthetic               | 18       |
| `HBTT`  | collateral             | synthetic               | 18       |

### Which Hideki this is

This section explains which chain the lane above reaches. Read it before you reconcile any
address against the bridge-infra repo.

`ChainId.hidekiTestnet` (50383) is **Hideki 2**. Hideki 2 is the 2026-09-17 regenesis of
Hideki. The lane above is Hideki 2's lane. Hideki 1 still runs. It has its own lane. This
SDK does not ship that lane.

Both chains use chain id 50383. Both use Hyperlane domain 50383. They differ only in
network id: 50000258 for Hideki 1, and 50000259 for Hideki 2. No signature, wallet or
Hyperlane message tells them apart.

Each lane has its own core contracts on Somnia Testnet. Each warp router binds to one
mailbox when it is deployed. This binding keeps the two lanes apart.

Two consequences follow.

- **Every Hideki-side address on this lane equals Hideki 1's.** The same deployer replayed
  its nonce sequence onto Hideki 2. That chain restarted its nonces at genesis. A matching
  Hideki address therefore does not identify the lane.
- **Each Somnia-side address belongs to one lane only.** These addresses identify the lane.
  In the bridge-infra repo, this lane is `registry-hideki2/`. It is not `registry/`.

Mainnet, Elwood and the local chain are **not** bridged — `getBridgeNetwork` returns
`null` for them, and `createBridgeTransfer` throws rather than inventing a route.
Bridging is also **not transitive**: a chain has to be a member of the token's own
route.

## The enumerations

```ts
BridgeToken.WBTC; // "WBTC" — the bridge's own enum
ChainId.hidekiTestnet; // 50383 — from the chains module: the chain id IS the value
```

Both are `const` objects with a matching type, not TS `enum`s — the pattern the rest
of this SDK uses. You get `BridgeToken.WBTC` for the value and `BridgeToken` for the
type, plain literals still assign, and nothing non-erasable is emitted.

Networks are named by **`ChainId`**, which lives with the [chain
definitions](./CHAINS.md) rather than here — every Somnia network has a chain
id; only some are bridged. Its keys are the definition export names, so
`ChainId.hidekiTestnet === hidekiTestnet.id` by construction, and the id is the
value because that is what wallets, manifests and viem speak — on this bridge
the Hyperlane **domain id equals the chain id**, so one number identifies a
network everywhere.

## Bridging

```ts
const plan = createBridgeTransfer({
  token: BridgeToken.WBTC,
  from: ChainId.somniaShannon,
  to: ChainId.hidekiTestnet,
  amount: 100_000_000n, // 1 WBTC — 8 decimals, not 18
  recipient: account.address,
});

if (plan.approveStep) await sendBridgeStep(client, plan.approveStep, { account });
const receipt = await sendBridgeStep(client, plan.bridgeStep, { account });
```

Two fields are the whole plan: **`bridgeStep`** — the `transferRemote` call,
always present — and **`approveStep`**, the ERC-20 approval a collateral route
needs first, simply **absent** on native and synthetic routes. Branching on
`plan.approveStep` narrows it, so no `!` is ever needed; its role is the field
name, and `description` is the human label.

**`sendBridgeStep(client, step, { account })`** is the sender: it signs locally
(fixed fees, fixed gas ceiling, never estimated) and broadcasts via Somnia's
`eth_sendRawTransactionSync`, which blocks server-side and returns the
**receipt in the same call** — send + confirm in one round-trip, so the
approve-then-bridge ordering above is safe by construction. It throws on a
reverted receipt, and on a node without the method (anvil, stock geth) it falls
back to `eth_sendRawTransaction` + a receipt wait. It needs a **local** signer
(viem `privateKeyToAccount`, a session account); with a browser wallet, spread
the step into `walletClient.sendTransaction({ ...plan.bridgeStep, account })`
instead — extensions don't sign raw transactions. One consequence of fixed
ceilings worth knowing: Somnia's mempool admits a transaction only when the
balance covers `gas × maxFeePerGas` (0.6 STT at the defaults) on top of its
`value`, even though unused gas is never charged — fund small accounts for the
envelope, not the expected fee.

Each transaction is `{ chainId, to, data, value, description }` — everything you must
send, nothing you must fill in. No `gas`, no `nonce`, no fees: those belong to the
signer, and a builder guessing gas for a contract on another chain would be inventing
numbers. `value` **is** ours, because it is protocol-semantic:

| Route model  | `value`                                        | Approval                             |
| ------------ | ---------------------------------------------- | ------------------------------------ |
| `native`     | **the amount** — the coin rides in `msg.value` | none                                 |
| `collateral` | `0n`                                           | ERC-20 `approve` to the router       |
| `synthetic`  | `0n`                                           | none — the router burns your balance |

Amounts are **bigint base units of the origin side's decimals**. Read them from
`plan.origin.decimals` rather than assuming 18 — WBTC is 8 on both sides.

**Browser wallets and JSON boundaries.** A viem wallet client takes a step
as-is — including one on `custom(window.ethereum)`. For the raw
`eth_sendTransaction` path, or to move a server-built plan across a JSON
boundary (a step's `value` is a `bigint`, and `JSON.stringify` throws on
bigints), `toEip1193Transaction(step, { from? })` returns the hex-quantified,
JSON-safe request object — typed as viem's own `RpcTransactionRequest`. It deliberately drops `chainId`: an EIP-1193 wallet
signs on its **active** chain, so switch with `wallet_switchEthereumChain`
first. The [walkthrough](./CHAINS_WALKTHROUGH.md) shows both paths end to end.

## Bridging through the exchange

A multi-chain `SomniaMarkets` exposes the same planner as `exchange.bridge`,
bound to its own chains and executors. Both ends must be configured chains,
the origin legs go through the origin chain's executor (a
[smart account](./ACCOUNTS.md) packs the approval and the bridge call into one
transaction, funded from the account itself), and delivery is observed
on the destination engine's socket rather than polled.

```ts
const plan = exchange.bridge.plan({ token: "USDso", from: L1, to: HIDEKI, amount: 100n * 10n ** 18n });

const result = await exchange.bridge.transfer(
  { token: "USDso", from: L1, to: HIDEKI, amount: 100n * 10n ** 18n },
  { onStep: (s) => console.log(s.kind, s.status, s.hash) },
);
result.messageId; // the Hyperlane message id, from the origin receipt
result.delivered; // true once the destination Mailbox processed that message
```

The SDK tracks one Hyperlane message per transfer. It reads the message id
from the origin receipt: the origin Mailbox's `Dispatch` whose sender is the
origin router, paired with the `DispatchId` after it. It then waits for the
destination Mailbox's `ProcessId` for that id only. A delivery to the same
recipient from another transfer does not end the wait. The wait first asks
the destination Mailbox `delivered(messageId)`, so a message that landed
before the wait started still counts.

The wait times out 180 s after the origin transaction is mined by default
(`deliveryTimeoutMs`). On a timeout, `exchange.bridge.transfer` resolves with
`delivered: false` and the `messageId`. The transfer is not undone and can
still land. Before you send again, call `delivered(messageId)` on the
destination chain's Mailbox (`getBridgeNetwork(to).mailbox`). It is a view,
`function delivered(bytes32 messageId) view returns (bool)`, that you can read
with the engine's `getViemClient()`. A second transfer while the first is in
flight moves the funds twice.

A few `RpcError` operations also mean the origin leg was sent and the funds
may be in flight: `bridge message id` (the receipt holds no single dispatch to
decode) and `watch bridge delivery` (the destination watch failed). Look up
the origin transaction before you retry.

`exchange.ensureFunds({ code, chainId, amount })` builds on it: check the
account's balance of a currency on one chain and bridge the shortfall from the
richest other configured chain. `createOrder(…, { funding: "auto" })` bridges
the same way for the order's collateral token. By default an order whose
collateral is elsewhere throws `CollateralOnWrongChainError` carrying the plan
instead.
The route follows the collateral token's address in the bridge registry, not its
symbol. A token the registry does not list gets no plan, even when its symbol is
`USDso`.
When the bridged message is not delivered in time, `ensureFunds` and
`createOrder(…, { funding: "auto" })` throw `BridgeDeliveryTimeoutError` with
`messageId`, `bridgeHash`, `from`, `to`, `token` and `amount`, and place no order.

On one exchange, these calls run one at a time per account, chain and
currency. The exchange keeps a leg that timed out as pending. When the next
`ensureFunds` or auto-funded order for the same key finds a shortfall, it
waits for that message first and sends no new leg for it. The pending leg
lives in memory only. A new exchange instance, or another process, must check
`delivered(messageId)` before it bridges again. A direct
`exchange.bridge.transfer`, and an order with `funding: "explicit"` or
`"skip"`, does not join this queue and does not check pending legs.

## Two failure modes worth preflighting

**Native-route liquidity.** An `STT` transfer is native on both sides, so delivery is
paid out of the _destination router's own balance_ rather than by minting. If that
balance is short, `process()` reverts and the transfer sits in escrow until someone
refunds the router — not lost, but stuck. The destination side's
`requiresDestinationLiquidity` flags it.

`exchange.bridge.transfer`, `exchange.ensureFunds`, and
`createOrder(…, { funding: "auto" })` read the destination router's balance before
they send. When it is below the amount, they throw `BridgeLiquidityError` and send
nothing. The check is a read, not a reservation: another transfer can still drain
the router before delivery. When you send the planner's transactions yourself,
check the balance before you offer the transfer:

```ts
if (plan.destination.requiresDestinationLiquidity) {
  const liquidity = await destinationClient.getBalance({ address: plan.destination.router });
  if (liquidity < plan.amount) throw new Error("destination router is short — transfer would stall");
}
```

At the last verification the Somnia-side router held **0 STT** and Hideki's held 100,
so a _first_ Hideki → Somnia transfer stalls until seeded. Seeding is a plain native
transfer to the router.

**The relayer is a liveness dependency.** No InterchainGasPaymaster is deployed, so
`quoteGasPayment` is 0 on every router and the relayer pays delivery gas unmetered
(`SOMNIA_BRIDGE.relayerPaysDestinationGas`). A sender attaches nothing for delivery —
but if the relayer runs dry, transfers keep being accepted on the origin and stop
being delivered. Should a gas quote ever be introduced, read it and pass it as
`gasPayment`; it lands in `bridgeStep.value`.

Delivery is asynchronous either way: `transferRemote` escrows and dispatches, and the
far side is credited seconds later. The transaction you send does not wait for it.
On the Hideki 2 lane, a 9-leg measurement on 2026-09-17 gave a median of 7.5 s in
one direction and 8.7 s in the other. Most legs included a 5.1 s relayer retry.
A single leg on 2026-09-23 took 3.0 s. The SDK's 180 s default delivery timeout is
about 20 times the median.

**A drained router shows up as a timeout.** The SDK refuses a native transfer when
the destination router holds less than the amount. The check is a read, so another
transfer can still drain the router before delivery. Then `process()` reverts on
the destination, the message stays undelivered, and the wait ends with
`delivered: false` (or `BridgeDeliveryTimeoutError` from `ensureFunds`). The message
is delivered after someone seeds the router and the relayer retries. Check
`delivered(messageId)` instead of sending again.

## Looking things up

```ts
getBridgeToken(BridgeToken.USDso, ChainId.hidekiTestnet); // one side of one route, or null
listBridgeTokens(ChainId.somniaShannon); // everything bridgeable from a network
getBridgeNetwork(ChainId.somniaShannon); // mailbox / ISM / hooks, or null
listBridgeNetworks(); // the bridged networks
getBridgeRoute(BridgeToken.WBTC, 50312, 50383); // the lane, either order, or null
getBridgeRouter(BridgeToken.STT, ChainId.somniaShannon); // just the router address
SOMNIA_BRIDGE; // the lane: routes, trust model, docs
```

Lookups return `null` on a miss (the `get*` contract: a `get*` read answers with
`null` for a real absence); `createBridgeTransfer` **throws**, because an
unsupported triple is a programming error and its message names what would work.

`warpRouterAbi` is exported too, for reading a router directly —
`quoteGasPayment`, `routers`, `destinationGas`, `token`.

## How the values got here

Every address, decimal and model in the registry was read off the **live chains**, not
transcribed: all ten routers have code, are owned by one account, are wired to their
chain's mailbox and ISM, and are mutually enrolled in both directions; the collateral
routers' `token()` matches the canonical ERC-20; the synthetics' `decimals()` match;
`quoteGasPayment` is exactly 0 everywhere. The `transferRemote` encoding was
_simulated_ with `eth_call` — `value = amount` on the native route returns a real
message id, while dropping the value, skipping the approval, or naming an unenrolled
destination each revert.

`test/bridge.test.ts` pins the calldata offline. `test/bridge.e2e.test.ts` re-runs the
whole verification against both chains on demand — nothing signed, nothing sent:

```sh
SOMNIA_E2E_BRIDGE=1 pnpm test
```

A note on one client-side trap the registry exists to avoid: a **native** router
answers `token()` with the _zero address_ rather than reverting, so code that probes
`token()` to decide "collateral or native" silently gets `0x0…0`. Use
`plan.origin.model` / `BridgeTokenDetails.model` instead.

## Adding a token or a lane

Both are data. `hyperlane-bridge-infra` is the source of truth — a new route there
becomes a new entry in `src/chains/bridge/registry.ts`, and the types already carry
it: `destinations` is a list, `SOMNIA_BRIDGE.routes` is a list, and every lookup is a
filter. Adding a route needs no agent restart and no new core contracts; the validator
and relayer are token-agnostic.
