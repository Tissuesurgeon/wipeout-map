# Wipeout Map

See where everyone gets wiped out, before you do.

Wipeout Map shows perps traders where the biggest liquidations on dreamDEX are waiting to happen, and lets them protect or trade their positions from their own wallet.

- **Live app:** https://wipeout-map.onrender.com
- **Bounty:** dreamDEX × Somnia Perps Builder Bounty, MVP track (#SomniaHacks)
- **Network:** Somnia Hideki testnet (chain 50383), margined in USDso
- **Demo video:** [add YouTube link]

## What it does

Every leveraged position has a price where it gets force-closed. When many traders share the same price zone, reaching it can set off a chain reaction: forced closes push price further, which liquidates the next group.

Because dreamDEX positions are onchain, Wipeout Map doesn't have to guess where those zones are. It reads every open position across all 21 dreamDEX perp markets, works out each liquidation price, and ranks the zones by how much money would be wiped out. Each market shows only its top 3 zones, each described in one sentence:

> $22.9M of shorts get wiped between 91,413 and 93,633, 13.3% above price.

With Wipeout Map a trader can:

- **See the danger zones.** The top 3 wipeout zones on every market, with the dollar amount, the number of positions, and the distance from price.
- **Check their own risk.** Paste a wallet address to see how close each position is to liquidation and whether it sits inside a crowded zone.
- **Fix it in one signature.** Cut size, set a stop, or add margin, signed in their own wallet.
- **Trade the move.** Arm an entry at a big zone. A stop-loss is required and leverage is capped at 5x.
- **Watch it live.** A tape of liquidations as they happen, streamed through Somnia Reactivity.
- **Get alerts.** A Telegram bot messages them when a watched position gets close to danger.

## Who it's for

- Perps traders on dreamDEX who want to keep their stops out of zones that are about to get swept.
- Momentum traders who want to catch the big moves that happen when a large zone is hit, with protection built in.
- Anyone holding a position who wants a quick, honest answer to "how close am I to getting wiped out?"

The map changes every time price moves or positions open and close, so it's worth a check before every trade. Each zone fits in one shareable sentence, which makes it easy to post on X or in a trading group.

## Safe by design

- **Your keys stay with you.** Every order is signed in the trader's wallet. The server never holds or asks for a private key.
- **Every number is timestamped.** Each figure shows its block and age, and the map is marked stale if data is older than 30 seconds.
- **Bad price, no trade.** If a market's price feed isn't healthy, its map is hidden and its orders are disabled.
- **Honest maths.** A liquidation price assumes only that market moves. Accounts with positions in several markets get a cross badge, because shared collateral can be liquidated sooner.

## How to run it

### Requirements

- Node 22
- pnpm 11.1.3 (`corepack enable`)
- Postgres. Locally, a database named `wipeout` is enough. Hosted deploys use Prisma Postgres.
- A browser wallet (for example MetaMask) on Somnia Hideki testnet with USDso, if you want to place orders

### Local setup

```bash
git clone https://github.com/Tissuesurgeon/wipeout-map.git
cd wipeout-map
pnpm install
docker run --name wipeout-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wipeout -p 5432:5432 -d postgres:16
cp .env.example .env
pnpm dev
```

The API is on http://localhost:8787 and the app is on http://localhost:5173. `.env.example` already points `DATABASE_URL` at that local database. Never commit `.env`.

Open http://localhost:5173. The first sweep reads every open position and can take a few minutes, after which the map fills in. A later start reuses the book already in Postgres.

### Environment variables

| Variable | Required | What it is |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection the server queries. Local default is in `.env.example`. On Render, use the pooled Prisma string. |
| `DIRECT_URL` | no | Direct Postgres connection used to create tables. Falls back to `DATABASE_URL`. On Render, use the direct Prisma string. |
| `RPC_URL` | no | Hideki HTTP RPC. Defaults to `https://api.hideki2.infra.testnet.somnia.network`. |
| `WS_URL` | no | Hideki WebSocket RPC. Defaults to `wss://api.hideki2.infra.testnet.somnia.network/ws`. |
| `INDEXER_URL` | no | Hideki indexer. Defaults to `https://hideki-dev.smk.somnia.host/v1/graphql`. |
| `PORT` | no | Server port. Defaults to 8787. Render sets this itself. |
| `TELEGRAM_BOT_TOKEN` | no | Turns on Telegram alerts. |

No private key is needed to run the app. `TEST_PRIVATE_KEY` is only read by `scripts/verify/place-samples.ts` and must stay in your local, gitignored `.env`.

Deploy steps for Render and Vercel, including `CORS_ORIGINS` and the web app's `VITE_API_URL` / `VITE_WS_URL`, are in [docs/DEPLOY.md](docs/DEPLOY.md).

### Checks

```bash
pnpm test      # liquidation maths, buckets, zones, fills
pnpm smoke     # end-to-end check against the running server
pnpm verify    # chain and SDK checks against Hideki
```

### Production

```bash
pnpm build && pnpm start
```

Or one container, which builds the web app and serves it with the API:

```bash
docker build -t wipeout-map .
docker run --env-file .env -p 8787:8787 wipeout-map
```

The live app at https://wipeout-map.onrender.com runs this way. The web app can also be hosted on Vercel and call that API. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Built with

dreamDEX perps through `@somnia-chain/markets-sdk` 0.32.1, Somnia Reactivity for the live feed, Node and Fastify on the server, Postgres for the book, and React with TypeScript and Vite on the web.

## Testnet evidence

Real orders placed through Wipeout Map on Somnia Hideki testnet (chain 50383):

| Action | Market | Transaction |
| --- | --- | --- |
| Reduce position | [market] | [tx hash] |
| Protective stop | [market] | [tx hash] |
| Add margin (USDso deposit) | — | [tx hash] |
| Cascade entry with stop | [market] | [tx hash] |

## X posts

Posts about Wipeout Map, tagging @DreamDEXSomnia:

[Where does everyone get wiped out?](https://x.com/tissuesurgeon/status/2115249814590087245)

> Where does everyone get wiped out? I built Wipeout Map for the @DreamDEXSomnia Perps Builder Bounty to answer that. It reads every open position and ranks liquidation zones by dollars at risk, so you see the danger before price gets there. #SomniaHacks

[Liquidations don't happen at random.](https://x.com/tissuesurgeon/status/2115261660784902186)

> Liquidations don't happen at random. They cluster. When price hits a big cluster, the forced closes push price further and set off the next wave. So for #SomniaHacks I made Wipeout Map show only the top 3 zones per market on @DreamDEXSomnia.

## What's next

- Launch on dreamDEX mainnet and place live orders.
- Shareable zone cards for X that link back to the map.
- Alerts when a big new zone forms close to price.
- Stress scenarios showing what happens when several markets move together.

Testnet only. Nothing here is financial advice.
