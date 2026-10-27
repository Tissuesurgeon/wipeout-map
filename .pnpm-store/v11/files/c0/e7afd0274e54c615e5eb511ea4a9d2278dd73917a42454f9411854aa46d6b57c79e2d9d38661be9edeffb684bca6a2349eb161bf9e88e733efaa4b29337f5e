# Fill history pages and dataset restart

`exchange.client.getUserFillsPage(account, options)` reads one bounded page from the configured Envio/Hasura indexer. `fills` retain the existing descending numeric `(timestamp, blockNumber, logIndex)` order. `nextCursor` is opaque and binds the chain, endpoint, normalized account, filters, sort position and `datasetGeneration`. A null cursor means this read observed no further row; it does not certify full historical coverage.

Set `options.marketType` (`"SPOT"`, `"PERP"` or `"BINARY"`) to read one market kind. The indexer filters on the Fill's own `marketType` column. Omit it to read every kind. The kind is part of the cursor scope: a cursor from one kind, or from no kind, is invalid input for another.

`datasetGeneration` comes from the `FillDataset/current` row in the same serving database as `Fill`. A preset block handler creates the row at the first indexed block, including on a database with no fills. The generation is a deterministic digest of the generated deployment config excluding RPC transport, entity schema, referenced ABIs, generated pool metadata, and production indexer source. Identical fresh replays keep the same generation; a fresh schema replay with changed hashed producer inputs rotates it. A code-only resume does not rewrite the row and is not a valid rollout for handler changes that affect stored fill data: those changes require a reindex. Blue and green slots have separate databases, so a same-hostname cutover can change the generation when their hashed producer inputs differ. All Hasura replicas for one slot read the same row. The SDK reads the row and page in one GraphQL request. If the row or field is absent, the page call fails with `FillHistoryUnavailableError` rather than returning an apparently valid page.

Continuing a cursor from another generation throws `FillHistoryRestartRequiredError` with `cursorGeneration` and `servingGeneration`. Discard **every** accumulated page and request page one with the same scope and no cursor. A legacy cursor without a generation also requires a restart. A cursor from another account, chain, endpoint or filter scope is invalid input, even if its generation matches. New fills above an unchanged cursor still belong to a new page-one read.

```ts
import { FillHistoryRestartRequiredError } from "@somnia-chain/markets-sdk";

try {
  const next = await exchange.client.getUserFillsPage(account, { limit: 100, cursor });
  pages.push(next.fills);
} catch (error) {
  if (!(error instanceof FillHistoryRestartRequiredError)) throw error;
  pages.length = 0;
  const first = await exchange.client.getUserFillsPage(account, { limit: 100 });
  pages.push(first.fills);
}
```

The generation is a dataset identity, not a completeness, freshness or chain-height watermark. The producer schema and SDK must be deployed together through a full standby reindex before this page API can serve that slot. Until then, absence of the generation is a closed failure; consumers must not infer a substitute from URL, block height or process startup.

## Keep a held history current

A caller that holds an account's whole fill history between reads, such as a portfolio that polls, does not need to read all of it again each time. `exchange.client.getUserFillHistory(account, options)` takes the history the last call returned and brings it up to date. It reads with `getUserFillsPage`, so it adds no GraphQL document. The SDK keeps no state between calls: store the returned `history`, as it is or after a JSON round trip, and pass it back as `options.previous`.

- **First read.** Without `previous`, the call pages back from the newest fill in pages of 999. It stops at the oldest fill or at `maxRows` (default 20,000). `truncated: true` means older fills exist that the history does not hold. The history is complete from its oldest held fill onwards. `maxRows` cuts by position, not by second, so other fills in that fill's second can be missing.
- **Refresh.** With `previous`, the call reads again only the fills from `overlapSeconds` (default 60) before the newest held fill. Every request carries that `timestamp` floor. A refresh with nothing new is one page request and one small continuation probe, and one more request for each further 999 fills in the overlap. The overlap ends at the newest held fill, not at the current time, so an account with more than 999 fills in its overlap pays the extra requests on every call, also when nothing new arrives. Fills newer than the newest held fill go on top. The rest of what the call reads is the overlap, and it must match the held rows exactly. Older held rows are kept and are not read again. So do not edit a stored history: an edit to a row older than the overlap is not detected, and stays. When nothing changed, `history` is the `previous` object itself and `changed` is false.
- **Indexer behind.** When the overlap lacks only the newest held fills, nothing newer is served, and every other held fill in the overlap still matches, the call drops those fills and does not read the whole history again. An indexer that is behind serves exactly that, for example after a cutover to a slot that is behind. The result is what the indexer serves, and `changed` is true. The dropped fills come back as new fills when the indexer catches up. A full read would differ only below the overlap, and the overlap check cannot see a reorg that deep anyway.
- **Restart.** The call drops the held rows, reads the whole history again and returns `restarted: true`. `restartReason` says why. It is `"dataset"` when the serving `datasetGeneration` differs from the held one. It is `"overlap"` when the overlap does not match: a held fill there changed, a held fill is gone while an older held fill is still served, the newest held fills are gone while newer fills are served, a fill the history does not hold appears below the newest held one, or every fill of a truncated history is gone. It is `"previous"` for unusable state, below. The call makes at most two attempts: the first read or refresh, then one full read when the first cannot stand. A dataset change during that full read throws `FillHistoryRestartRequiredError`. Call again.
- **Unusable state.** A `previous` for another account, chain, market kind or format version, or with rows out of order, repeated or without a usable position, is not an error. The call reads the whole history again and returns `restarted: true` and `restartReason: "previous"`.

```ts
let held: UserFillHistory | null = null; // or the history you stored

async function refresh(account: string): Promise<void> {
  const read = await exchange.client.getUserFillHistory(account, { previous: held });
  if (read.changed) held = read.history; // store it; it survives a JSON round trip
}
```

A refresh is correct while the serving dataset and the call keep this contract:

1. Within one dataset generation, a fill row never changes after the indexer serves it, and fills appear in block order. The indexer fills in a fill's taker fields in the same transaction, and it commits whole blocks. The one exception is a chain reorg: the indexer rolls rows back in place under the same generation, so a fill can disappear or be replaced under the same id.
2. Every refresh reads again the fills from `overlapSeconds` before the newest held fill. When a held fill in that overlap changed, or a fill the history does not hold appears below its newest fill, the call reads the whole history again. When only the newest held fills are missing, the call drops them.
3. A new dataset generation means the call drops every held row and reads again.
4. The history says whether it stopped at `maxRows` (`truncated`). It is complete from its oldest held fill onwards.

The SDK enforces rules 2 to 4. Rule 1 is the indexer's side. Because a fill never changes outside a reorg, the overlap is not there to pick up corrections. It is the reorg check. A reorg replaces the newest blocks, and the overlap always holds the newest held fill, so a reorg that reaches the account's held fills in the overlap changes what the check reads. Count the restarts with `restartReason: "overlap"`: outside a reorg, a changed fill or an unheld fill below the newest held one means the indexer broke rule 1.

Three edge cases follow:

- A reorg that forks more than `overlapSeconds` below the newest held fill is not detected when it serves the overlap again unchanged. The indexer team alerts on reorgs.
- A serving indexer that falls behind drops the newest held fills from the history until it catches up. That costs a refresh, not a full read.
- A larger `maxRows` on a truncated history does not load the older fills when the oldest held fill is below the overlap. When the oldest held fill is inside the overlap, the refresh reads past it, and the call reads the whole history again with `restartReason: "previous"`. Omit `previous` to read the older fills.
