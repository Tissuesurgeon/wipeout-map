# Hideki indexer fetch is flaky

`curl` to `https://hideki-dev.smk.somnia.host/v1/graphql` failed TLS: the certificate subject did not include that host. The first `listPerpMarkets` call in this environment threw `IndexerError: fetch failed`. A later run listed 21 markets and `listLiquidations` returned rows, so the indexer is not uniformly down.

Discovery catches that error and reads `listPerpPoolStatuses` plus `readPerpMarketFromChain` from the Hideki perp factory. Liquidation backfill is best-effort. The mark and liquidation poller uses `eth_getLogs` and does not need the indexer.
