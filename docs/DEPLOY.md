# Deploy

The server runs on Render. The web app runs on Vercel. Local `pnpm dev` does not need these settings: leave `VITE_API_URL` and `VITE_WS_URL` unset and the Vite proxy keeps `/api` and `/ws` on the same origin.

## 1. Prisma Postgres

In Prisma Console, create the database. Open **Connect to your database**, then **Generate new connection string**. Copy both strings:

- Pooled, host `pooled.db.prisma.io`. This is `DATABASE_URL`.
- Direct, host `db.prisma.io`. This is `DIRECT_URL`.

Do not commit either string. Wrapping quotes around a connection string are fine; the server strips one pair.

## 2. Render

**New**, then **Blueprint**, then pick this repo. Render reads `render.yaml`.

Paste:

- `DATABASE_URL`: the pooled string
- `DIRECT_URL`: the direct string
- `CORS_ORIGINS`: leave blank for this first deploy

Leave the other Blueprint values as they are. Do not set `PORT`. Render injects it. Use the Starter plan. The free plan sleeps after 15 minutes and the liquidation watcher stops. The Frankfurt region should match the Prisma Postgres region.

Deploy, then open `https://<service>.onrender.com/api/health`. Wait until the JSON says `"ready": true`.

If `packageManager` install fails on a host that uses Corepack, set `ENABLE_EXPERIMENTAL_COREPACK=1`. Render uses the Dockerfile, which already pins pnpm 11.1.3, so this is for Vercel.

## 3. Vercel

**Add New**, then **Project**, then pick this repo.

- Root Directory: `web`
- `VITE_API_URL` = `https://<service>.onrender.com`
- `VITE_WS_URL` = `wss://<service>.onrender.com/ws`

Deploy. If install cannot see the repo-root `pnpm-lock.yaml`, or the `packageManager: pnpm@11.1.3` field fails, set `ENABLE_EXPERIMENTAL_COREPACK=1` and redeploy. The web build is `pnpm build` inside `web`.

## 4. Allow the Vercel origin

On Render, set `CORS_ORIGINS` to the Vercel production URL plus local dev, comma-separated:

```
https://<project>.vercel.app,http://localhost:5173
```

Redeploy the Render service. Preview deployments are already allowed when `CORS_ALLOW_VERCEL_PREVIEWS` is `1` and the hostname matches `wipeout-map` on `vercel.app`.

## 5. Check

- The Vercel site loads markets.
- The map shows zones.
- The live tape reads LIVE · REACTIVITY (or POLLING if the chain socket is down).
- DevTools has no CORS errors.

## Troubleshooting

- **CORS error in the browser.** Set `CORS_ORIGINS` to the exact Vercel origin, including `https://`, and redeploy Render.
- **The socket keeps reconnecting.** `VITE_WS_URL` must be `wss://<service>.onrender.com/ws`, not `https://` and not `ws://`.
- **"too many connections".** Lower `DB_POOL_MAX` (the Blueprint sets `5`).
- **Health check failing, or `ENOTFOUND base`.** The service crashed before it listened. `DATABASE_URL` and `DIRECT_URL` must be the Prisma strings alone (`postgres://...@pooled.db.prisma.io...` and `postgres://...@db.prisma.io...`). Do not include quotes or the `DATABASE_URL=` name. A missing `DATABASE_URL` fails startup with `DATABASE_URL is required`. `/api/health` stays HTTP 200 while the first sweep is still running; `ready` flips to `true` when the book is loaded.
