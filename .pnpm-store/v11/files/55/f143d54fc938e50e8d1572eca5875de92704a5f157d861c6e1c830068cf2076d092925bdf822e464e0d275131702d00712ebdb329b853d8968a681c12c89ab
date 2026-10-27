# How to debug what the SDK is doing

This guide shows you how to see every trader call, the sign-and-send pipeline, and live-tail hydration as structured events, and how to capture them in tests. It assumes a working `SomniaMarkets` configuration.

The SDK is silent by default. A `debug` sink in the configuration receives `DebugEvent` values: log lines, and span start, annotate, and end events with ids, parent ids, and durations. The sink owns filtering and formatting.

## Print an indented span tree

`consoleDebugSink()` renders the stream to the console as a tree reconstructed from `parentId`.

```ts
import { SomniaMarkets, consoleDebugSink } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets({ ...config, debug: consoleDebugSink() });
```

A `createOrder` on a spot market printed these lines on the testnet:

```text
[sdk] ▶ trader.placeSpotOrder { params: { pool: '0x259f…fff4', isBid: false, price: 459600000000000000n, … } }
[sdk] ▶ trade.execute { functionName: 'placeOrder', address: '0x259f…fff4' }
[sdk]   ▶ trade.signCall
[sdk]   ◀ trade.signCall 224.2ms
[sdk]   ▶ trade.broadcast
[sdk]   ◀ trade.broadcast 948.4ms
[sdk]   · trade.execute { hash: '0xc164…b18a17' }
[sdk] ◀ trade.execute 1173.2ms
[sdk] ◀ trader.placeSpotOrder 1174.5ms
```

The trader span and the `trade.execute` span are both roots: a parent is only recorded where the SDK sets one explicitly, and `trade.signCall`, `trade.broadcast`, and `trade.confirm` are the spans that carry one. Pass `{ prefix }` to change the `[sdk]` label. A span that ended with an error prints through `console.warn`.

## Toggle it from your app

The toggle belongs to the app, not the SDK. Two common shapes:

```ts
// Browser: flip on from devtools with localStorage.setItem("sdk-debug", "1") and reload.
const exchange = new SomniaMarkets({
  ...config,
  debug: localStorage.getItem("sdk-debug") ? consoleDebugSink() : undefined,
});
```

```ts
// Node bot: JSON lines behind an environment variable.
const exchange = new SomniaMarkets({
  ...config,
  debug: process.env.SDK_DEBUG
    ? (e) => console.log(JSON.stringify(e, (_, v) => (typeof v === "bigint" ? v.toString() : v)))
    : undefined,
});
```

Events carry `bigint` values, so a plain `JSON.stringify` throws without the replacer.

## Capture events in a test

`debugCollector()` returns a sink and typed filters over what it received. Each collector is independent, so parallel tests can each have their own.

```ts
import { SomniaMarkets, debugCollector } from "@somnia-chain/markets-sdk";

const c = debugCollector();
const exchange = new SomniaMarkets({ ...config, debug: c.sink });

await exchange.trader.placeOrder(params);

expect(c.starts("trade.execute").length).toBeGreaterThan(0); // 2 when a first order also sent an approve
expect(c.ends("trade.execute").every((e) => e.error === undefined)).toBe(true);
```

`c.starts(name?)`, `c.ends(name?)`, `c.annotations(name?)`, and `c.logs(scope?)` filter `c.events`.

## Send spans to a tracer

The span events map onto OpenTelemetry (`name`, `data` as attributes, `error` as status, `parentId` as parent). A sink that keeps a `Map` from span id to tracer span calls `startSpan` on `phase: "start"` and `end()` on `phase: "end"`; the tracer dependency stays in your app.

## What to look for

| Symptom                                | Where it shows                                                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A write is slow                        | `trade.execute` duration, split into `trade.signCall` and `trade.broadcast`; `trade.confirm` appears only on the external-wallet path, where the receipt is read separately |
| A watch never goes live                | The `liveTail.hydrate:<scope>` span ends with `error` set. In React, a `hooks` log line at level `warn` reads `watch failed for …`                                          |
| A first write does an extra round-trip | An `approve` transaction before the order: the allowance is cached per token and spender afterwards                                                                         |

The SDK swallows a sink that throws. A broken sink never breaks trading.
