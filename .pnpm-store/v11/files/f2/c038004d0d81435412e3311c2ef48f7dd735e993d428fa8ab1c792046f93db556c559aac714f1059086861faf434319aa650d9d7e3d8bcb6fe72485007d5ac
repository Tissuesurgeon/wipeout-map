# Chains walkthrough

A hands-on tour of `@somnia-chain/markets-sdk/chains`, end to end: pick a
network, stand up clients, send a transaction, bridge STT both ways, fund a
Hideki session account from a Shannon wallet, and run the live test suite that
proves all of it against the real networks. The reference
guides are [CHAINS.md](./CHAINS.md) (the network definitions) and
[BRIDGE.md](./BRIDGE.md) (the warp-route registry and its trust model) — this
page is the "follow along in a terminal" version.

**You need:** Node + pnpm, `viem` (a peer dependency of the SDK), and an account
holding STT on the networks you target. Shannon STT comes from the Somnia
testnet faucet or a funded team key; Hideki has no public faucet — use a funded
key. Everything below runs on the two bridged testnets and costs fractions of a
(test) token.

```ts
import { somniaShannon, hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
```

The module is **pure data + pure functions** — importing it performs no RPC. The
networks it ships:

| Export          | Chain id | Blocks    | Bridged |
| --------------- | -------- | --------- | ------- |
| `somniaMainnet` | `5031`   | 100 ms    | —       |
| `somniaShannon` | `50312`  | 100 ms    | ✅      |
| `somniaElwood`  | `50313`  | 100 ms    | —       |
| `hidekiTestnet` | `50383`  | **10 ms** | ✅      |
| `somniaLocal`   | `31337`  | —         | —       |

This walkthrough sticks to the two bridged testnets: **Shannon** (`50312`, the
general-purpose testnet) and **Hideki** (`50383`, the low-latency Tokyo network).

## 1. Create a client for different chains

Every definition is a complete viem `Chain` — endpoints (HTTP _and_ WebSocket),
block cadence, and Multicall3 where one actually exists. So a client is one
call, and `http()` with no URL already means "the chain's default endpoint":

```ts
import { createPublicClient, http, webSocket } from "viem";
import { somniaShannon, hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

const shannon = createPublicClient({ chain: somniaShannon, transport: http() });
const hideki = createPublicClient({ chain: hidekiTestnet, transport: http() });

await shannon.getChainId(); // 50312
await hideki.getChainId(); // 50383

// The live tail and anything latency-sensitive should ride the WebSocket:
const hidekiWs = createPublicClient({
  chain: hidekiTestnet,
  transport: webSocket(), // hidekiTestnet.rpcUrls.default.webSocket[0]
});
```

When the chain id arrives as a plain `number` (a deployment manifest, a
`NEXT_PUBLIC_CHAIN_ID` env), resolve it instead of switching on magic numbers:

```ts
import { getSomniaChain, isSomniaChainId, somniaChains } from "@somnia-chain/markets-sdk/chains";

const chain = getSomniaChain(Number(process.env.CHAIN_ID)); // Chain | null
if (!chain) throw new Error("not a Somnia network");

// somniaChains is the same table keyed by id — iterate it for a network switcher.
// isSomniaChainId(id) narrows a number so somniaChains[id] indexes without a cast.
```

Two behaviors to know, both deliberate (details in [CHAINS.md](./CHAINS.md)):

- **Every bridged network batches, at its own address.** Shannon, Hideki and
  mainnet each carry a `contracts.multicall3` — three _different_ addresses
  (Hideki's arrived 2026-08-10, at a non-canonical address, because the
  canonical `0xcA11bde0…` deployment can never land on Somnia chains). Elwood
  and the local chain have none, and viem silently falls back to individual
  `eth_call`s there. Don't "fix" an absence by pasting the canonical multicall
  address into an extended definition — there is no code at it, and viem would
  route every batched read into a failure.
- **`blockTime` drives viem's waiting heuristics.** Hideki's `10` means
  `waitForTransactionReceipt` polls fast enough to return in tens of
  milliseconds; a hand-rolled `defineChain` without it would wait seconds.

## 2. Post a transaction

A wallet client from a private key, a send, a receipt — the only
chains-module-specific part is that the `Chain` object is the one import:

```ts
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const account = privateKeyToAccount(process.env.SOMNIA_TESTNET_PK as `0x${string}`);
const wallet = createWalletClient({ account, chain: somniaShannon, transport: http() });

const hash = await wallet.sendTransaction({
  to: "0x0000000000000000000000000000000000000001",
  value: parseEther("0.001"),
});
const receipt = await shannon.waitForTransactionReceipt({ hash });
receipt.status; // "success"
```

The same code targets Hideki by swapping the chain and the key. Gas, nonce and
fees are viem's job — the chain definitions carry everything viem needs to
estimate them correctly per network.

## 3. Bridge STT both ways

The bridge is the same import: a Hyperlane warp lane between Shannon and Hideki
carrying `STT`, `USDso`, `WBTC`, `WETH`, `HBTT`.
[`createBridgeTransfer`](./BRIDGE.md#bridging) is pure — it returns the unsigned
transactions; you sign and send them.

> ⚠️ It is a **dev/test** bridge — one validator, threshold-1 ISM. Testnet
> value only.

Shannon → Hideki, delivered and verified:

```ts
import { BridgeToken, ChainId, createBridgeTransfer, sendBridgeStep } from "@somnia-chain/markets-sdk/chains";
import { parseEther } from "viem";

const amount = parseEther("0.05");
const plan = createBridgeTransfer({
  token: BridgeToken.STT,
  from: ChainId.somniaShannon, // 50312 — the values ARE chain ids
  to: ChainId.hidekiTestnet, // 50383
  amount,
  recipient: account.address,
});

// STT is native on both sides → no approval, the amount rides in msg.value.
// A collateral route (USDso/WBTC/WETH/HBTT leaving Shannon) needs an ERC-20
// approval first — plan.approveStep is present exactly when that's the case.
//
// sendBridgeStep signs locally (fixed fees, no estimation) and broadcasts via
// eth_sendRawTransactionSync: the node blocks until the transaction
// is executed and answers with the RECEIPT — send + confirm in one round-trip,
// so each line below resolves confirmed. (No wallet client needed: the public
// client is the wire, the account is the signer.)
if (plan.approveStep) await sendBridgeStep(shannon, plan.approveStep, { account });
const receipt = await sendBridgeStep(shannon, plan.bridgeStep, { account });
receipt.status; // "success" — a reverted receipt throws instead
```

That receipt only proves **escrow + dispatch** on the origin. Delivery is
asynchronous — the relayer credits the far side seconds later (on the Hideki 2
lane, a median of 7.5 s to 8.7 s per leg, measured 2026-09-17). Watch the destination:

```ts
async function waitForDelivery(client, address, floor, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const balance = await client.getBalance({ address }); // ERC-20 routes: readContract balanceOf
    if (balance >= floor) return balance;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error("not delivered — is the relayer alive? is the destination router funded?");
}

const before = await hideki.getBalance({ address: account.address });
// ... send the plan (previous snippet) ...
await waitForDelivery(hideki, account.address, before + amount);
```

The reverse direction is the same call with `from`/`to` swapped and a
Hideki-funded wallet — but preflight it, because **native-route delivery pays
out of the destination router's own balance**:

```ts
const back = createBridgeTransfer({
  token: BridgeToken.STT,
  from: ChainId.hidekiTestnet,
  to: ChainId.somniaShannon,
  amount,
  recipient: account.address,
});

if (back.destination.requiresDestinationLiquidity) {
  const liquidity = await shannon.getBalance({ address: back.destination.router });
  if (liquidity < back.amount) {
    // Underfunded ≠ lost: the transfer would sit in escrow until the router is
    // seeded. Seeding is a plain native transfer to the router address — and
    // note the symmetry: every transfer OUT of a chain escrows on that chain's
    // router, which is exactly the balance a later reverse transfer draws on.
    throw new Error(`Shannon STT router holds ${liquidity} wei — seed it first`);
  }
}
```

At the last live run the Shannon-side router held **0 STT**, so a first
Hideki → Shannon transfer stalls until the router is seeded (or until an equal
amount has been bridged Shannon → Hideki, which self-seeds it). Hideki's router
held 100 STT.

Mind the units: amounts are **bigint base units of the origin side's
decimals** — read `plan.origin.decimals`, don't assume 18 (WBTC is 8 on both
sides). Lookups (`getBridgeToken`, `getBridgeRoute`, …) return `null` on a
miss; `createBridgeTransfer` **throws** on an unsupported triple, naming what
would work.

### Signing in the user's browser

Everything so far signed with a private key in Node. In a dapp the key lives in
the user's wallet extension, and the order reverses: **connect first** — the
sender (and usually the recipient) is the wallet's address, which you only know
once it answers — _then_ build the plan, _then_ let the user confirm each step.

Two distinct moments, worth keeping apart:

1. **The transaction is created** by `createBridgeTransfer` — a pure function
   that returns unsigned calldata. No RPC happens, nothing is sent, and there
   is nothing secret in the result.
2. **The transaction is signed** when a step is handed to the wallet — one
   prompt per step — and only then does anything reach the chain.

The whole flow, self-contained:

```ts
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { BridgeToken, ChainId, createBridgeTransfer, somniaShannon } from "@somnia-chain/markets-sdk/chains";

// 1. Connect — this is where the user's address comes from.
const browser = createWalletClient({ chain: somniaShannon, transport: custom(window.ethereum) });
const [account] = await browser.requestAddresses();

// 2. Create the transaction(s): pure, unsigned, not yet sent anywhere.
const plan = createBridgeTransfer({
  token: BridgeToken.STT,
  from: ChainId.somniaShannon,
  to: ChainId.hidekiTestnet,
  amount: parseEther("0.05"),
  recipient: account, // the user's own address on the destination chain
});

// 3. Sign + send — one wallet prompt per transaction; the wallet fills
//    gas/nonce/fees. The approval must land before the bridge call spends it.
//    (The sync path from §3 doesn't apply here: eth_sendRawTransactionSync
//    needs a locally-held key, and an extension won't sign raw transactions —
//    the wallet's own eth_sendTransaction is the browser's send path.)
const shannon = createPublicClient({ chain: somniaShannon, transport: http() });
if (plan.approveStep) {
  const hash = await browser.sendTransaction({ ...plan.approveStep, account });
  await shannon.waitForTransactionReceipt({ hash });
}
const hash = await browser.sendTransaction({ ...plan.bridgeStep, account });
await shannon.waitForTransactionReceipt({ hash });
```

Because step 2 is pure it can also run **server-side** (an API route, a server
action): the browser sends the connected address up, the server builds the plan
and returns the transactions. A `BridgeStep` doesn't cross that boundary as-is — its
`value` is a `bigint`, and `JSON.stringify` throws on bigints —
`toEip1193Transaction` is the JSON representation: the exact object
`eth_sendTransaction` takes, every quantity hex-encoded.

```ts
// On the server — build the plan for the address the browser sent:
import { ChainId, createBridgeTransfer, toEip1193Transaction } from "@somnia-chain/markets-sdk/chains";

const plan = createBridgeTransfer({
  token: BridgeToken.STT,
  from: ChainId.somniaShannon,
  to: ChainId.hidekiTestnet,
  amount: parseEther("0.05"),
  recipient: userAddress,
});
return Response.json({
  chainId: plan.bridgeStep.chainId, // the ORIGIN chain the wallet must be on
  approve: plan.approveStep && toEip1193Transaction(plan.approveStep, { from: userAddress }),
  bridge: toEip1193Transaction(plan.bridgeStep, { from: userAddress }),
});
// bridge: {"from":"0x…","to":"0xB043…aB35","data":"0x81b4e8b4…","value":"0xb1a2bc2ec50000"}
```

```ts
// In the browser — no SDK import needed, the transactions are ready-made requests:
import { numberToHex } from "viem";

const { chainId, approve, bridge } = await (await fetch("/api/bridge-plan")).json();

// ⚠️ eth_sendTransaction has NO chain field — an EIP-1193 wallet signs on its
// ACTIVE chain. Switch to the origin chain first, or the transfer goes out on
// whatever network the wallet happens to be on:
await window.ethereum.request({
  method: "wallet_switchEthereumChain",
  params: [{ chainId: numberToHex(chainId) }],
});
if (approve) {
  // wait for this hash (public client / wallet UI) before submitting the bridge call
  await window.ethereum.request({ method: "eth_sendTransaction", params: [approve] });
}
const hash = await window.ethereum.request({ method: "eth_sendTransaction", params: [bridge] });
```

`toEip1193Transaction` deliberately drops `chainId` (see the warning above) and
the `kind` / `description` tags (UI metadata — some wallets reject unknown
keys), and pins `from` only when you pass it. Gas, nonce and fees stay with the
wallet, same as everywhere else in this module.

## 4. Worked example: a Hideki session funded from Shannon

Everything above, composed into the flow a trading UI actually runs: the user's
wallet lives on Shannon, a disposable **session account** trades on Hideki, and
the bridge is what moves gas and working capital between them. (Session
accounts come from the [native module](./NATIVE.md) — a 32-byte seed the node
can sign for, whose derivation is public, so the address is computable locally
before any RPC. **The seed is a private key in another shape: store it like
one.**)

```ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sessionAddress, sessionPrivateKey } from "@somnia-chain/markets-sdk/native";

const seed = generatePrivateKey(); // any 32 random bytes, persisted like a secret
const session = privateKeyToAccount(sessionPrivateKey(seed));
session.address === sessionAddress(seed); // true — the node derives the same address

// The user's wallet signs on Shannon; the session signs on Hideki.
const userAccount = privateKeyToAccount(process.env.SOMNIA_TESTNET_PK as `0x${string}`);
const userWallet = createWalletClient({ account: userAccount, chain: somniaShannon, transport: http() });
const sessionWallet = createWalletClient({ account: session, chain: hidekiTestnet, transport: http() });
```

**Fund it.** Two transfers out of the user's Shannon wallet: STT so the session
can pay Hideki gas, and HBTT as working capital. HBTT is Hyperlane's open test
token — anyone can `mint(address,uint256)` on Shannon, which is what makes this
walkthrough self-service:

```ts
import { parseAbi, parseEther, erc20Abi } from "viem";

const mintAbi = parseAbi(["function mint(address to, uint256 amount)"]);
const hbtt = getBridgeToken(BridgeToken.HBTT, ChainId.somniaShannon)!;

// Working capital exists first as the canonical ERC-20 on its home chain.
await userWallet.writeContract({
  address: hbtt.address!,
  abi: mintAbi,
  functionName: "mint",
  args: [userAccount.address, parseEther("10")],
});

// Gas money: STT to the session (native route — §3, recipient swapped).
// 1 STT, not a sliver: Somnia's mempool admits a transaction only when the
// balance covers the full fee envelope (10M gas ceiling × 60 gwei = 0.6 STT),
// even though unused gas is never charged.
const gas = createBridgeTransfer({
  token: BridgeToken.STT,
  from: ChainId.somniaShannon,
  to: ChainId.hidekiTestnet,
  amount: parseEther("1"),
  recipient: session.address,
});
// Working capital: HBTT to the session (collateral route — approve, then bridge).
const capital = createBridgeTransfer({
  token: BridgeToken.HBTT,
  from: ChainId.somniaShannon,
  to: ChainId.hidekiTestnet,
  amount: parseEther("10"),
  recipient: session.address,
});
// Each sendBridgeStep resolves once its transaction is CONFIRMED (§3), so the
// approve-before-bridge ordering holds by construction.
await sendBridgeStep(shannon, gas.bridgeStep, { account: userAccount }); // STT: native, no approval
if (capital.approveStep) await sendBridgeStep(shannon, capital.approveStep, { account: userAccount });
await sendBridgeStep(shannon, capital.bridgeStep, { account: userAccount });
```

Watch both deliveries land on Hideki — the STT with `getBalance` as in §3, the
HBTT by polling the synthetic's `balanceOf` (delivery _mints_, so no
destination liquidity is involved; remember the synthetic token **is** its
router address):

```ts
const hbttHideki = getBridgeToken(BridgeToken.HBTT, ChainId.hidekiTestnet)!;
await hideki.readContract({
  address: hbttHideki.address!,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [session.address],
}); // 10000000000000000000n once the relayer delivers
```

**Spend as the session.** On Hideki it is just an account with a key — the
bridged STT pays its gas, the synthetic HBTT is a plain ERC-20:

```ts
await sessionWallet.writeContract({
  address: hbttHideki.address!,
  abi: erc20Abi,
  functionName: "transfer",
  args: [friend, parseEther("4")],
});
```

**Send what's left home.** Synthetic → collateral needs **no approval** — the
router burns the session's balance, and the Shannon router releases the
collateral it escrowed on the way out:

```ts
const home = createBridgeTransfer({
  token: BridgeToken.HBTT,
  from: ChainId.hidekiTestnet,
  to: ChainId.somniaShannon,
  amount: parseEther("6"),
  recipient: userAccount.address,
});
home.approveStep; // undefined — the bridge call alone, signed by the session
await sendBridgeStep(hideki, home.bridgeStep, { account: session });
// Poll the canonical HBTT on Shannon for userAccount — it comes back +6.
```

The runnable version of this exact flow (delivery polling, shortfall-only
minting, delta assertions) is the session round-trip test in
`test/chains.live.e2e.test.ts` — see the next section.

## 5. Run the live test suites

Two opt-in suites under `packages/sdk/test/` prove everything above against the
real networks. Both skip silently unless their env var is set, so plain
`pnpm test` / CI never touch the network.

**Read-only** — verifies the registry against the live deployment and simulates
the planner's calldata via `eth_call` state overrides. No key, no funds,
nothing signed:

```sh
cd packages/sdk
SOMNIA_E2E_BRIDGE=1 pnpm test test/bridge.e2e.test.ts
```

**Live + signed** — `test/chains.live.e2e.test.ts` checks every chain
definition against its endpoints (HTTP + WS chain ids, Multicall3, block
cadence, explorer), then **spends**: it bridges ~0.05 STT in each direction
with real keys, waits for the relayer to deliver, signs + revokes a real
collateral-route approval, and runs the §4 session round-trip for real —
derives a session, bridges STT and 10 freshly-minted HBTT to it, pays 4 HBTT to
another Hideki wallet as the session, and bridges the remaining 6 home. Needs a
funded key per network:

```sh
cd packages/sdk
SOMNIA_E2E_CHAINS_LIVE=1 \
SOMNIA_TESTNET_PK=<funded key on Shannon 50312> \
HIDEKI_TESTNET_PK=<funded key on Hideki 50383> \
pnpm test test/chains.live.e2e.test.ts
```

Keys are accepted with or without the `0x` prefix and are read from the
environment only — never hardcode them. Budget ≥3 STT on Shannon and ≥1 STT on
Hideki. Per run: the two accounts trade ~0.1 STT of bridged value (plus gas),
1 STT of gas money parks with the session account on Hideki (the seed is
deterministic, so reruns reuse it), the Hideki account gains 4 HBTT, and the
Shannon account nets +6 of the 10 HBTT it mints. If a
delivery toward Shannon times out, check the STT router's balance on Shannon —
a drained router is the expected failure mode, not a bug in the suite.

## 6. One exchange over both chains

Everything above drives the two chains by hand: one client per chain, a plan,
a sender. The exchange does the same as one object — configure both chains,
and reads merge, writes route to the market's chain, and
`exchange.bridge` / `exchange.ensureFunds` move collateral between them
through the account's executors. See [EXCHANGE.md § One exchange, several
chains](./EXCHANGE.md#one-exchange-several-chains) and
[BRIDGE.md § Bridging through the exchange](./BRIDGE.md#bridging-through-the-exchange).

## 7. Where to go next

- [CHAINS.md](./CHAINS.md) — the definitions in full: why absences are
  deliberate, parity with `viem/chains`, extending a definition with
  `defineChain`.
- [BRIDGE.md](./BRIDGE.md) — route models (native/collateral/synthetic), the
  relayer as a liveness dependency, how every registry value was verified.
- Generated API reference: `pnpm docs` in `packages/sdk` writes it to
  `docs/api/` (gitignored).
- The deployment record behind the registry:
  [hyperlane-bridge-infra](https://github.com/somnia-chain/hyperlane-bridge-infra/blob/main/docs/deployments/somnia-testnet-hideki2-testnet.md).
