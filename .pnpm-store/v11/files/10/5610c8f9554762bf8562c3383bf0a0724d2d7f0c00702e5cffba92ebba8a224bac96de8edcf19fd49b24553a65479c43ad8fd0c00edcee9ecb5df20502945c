// Reading the indexed account history.
//
// **Why this exists at all.** Everything an application can serve from a key it already holds is
// arithmetic — `discovery.ts` computes an account's address offline and asks the chain whether it
// has code, and needs no index. What that cannot do is the inverse: given a bare address, whose
// account is it? `keccak256` does not invert and the app cannot guess candidate owners. Nor can it
// serve history: Somnia's `eth_getLogs` caps at 999 blocks against 1000 blocks per 100 seconds, so
// thirty days is 25,920 sequential requests. Those two are what the indexer is for, and this
// module is the only way to reach it.
//
// **No read takes a URL.** The indexer behind a chain is the SDK's to know, and the chains a read
// covers are configured once (`configureIndexer` in `indexer-endpoints.ts`) with `{chainIds}` as a
// per-call override. Chains that share a deployment are one request; chains on different
// deployments — mainnet and testnet — are one request each, merged. Every row carries its own
// `chainId`.
//
// **Every read that can be stale says so.** `IndexerStatus.behindBy` is on the same trip as the
// data, because a number that is quietly twelve hours old is worse than one a caller knows to
// hedge. A consumer that renders "3 of 3 owners" from a lagging index has told somebody something
// false about who can move their money.
import { getAddress } from "viem";
import { FeedRestartRequiredError, IndexerUnavailableError, InvalidInputError, RpcError, } from "./errors.js";
import { chainIdsFor, indexerUrl } from "./indexer-endpoints.js";
/**
 *  Resolves chain ids to the deployments that serve them, one entry per URL.
 *
 *  @throws {InvalidInputError} On an empty list, or a chain with no indexer.
 */
function targets(scope) {
    const ids = [...new Set(chainIdsFor(scope.chainIds))];
    if (ids.length === 0)
        throw new InvalidInputError("no chain ids given");
    const byUrl = new Map();
    for (const id of ids) {
        const url = indexerUrl(id);
        if (url === null)
            throw new InvalidInputError(`chain ${id} has no indexer`);
        byUrl.set(url, [...(byUrl.get(url) ?? []), id]);
    }
    return [...byUrl].map(([url, chainIds]) => ({ url, chainIds }));
}
/** Runs one read per deployment, in parallel, and concatenates the rows. */
async function across(scope, read) {
    return (await Promise.all(targets(scope).map(read))).flat();
}
/** The kinds, at runtime, so an inlined value can be checked before it reaches the wire. */
const ACCOUNT_EVENT_KINDS = new Set([
    "Created",
    "CreationSkipped",
    "OwnersAuthorized",
    "Setup",
    "OwnerAdded",
    "OwnerRemoved",
    "ThresholdChanged",
    "Executed",
    "ExecutionFailed",
    "ModuleExecuted",
    "ModuleExecutionFailed",
    "ModuleEnabled",
    "ModuleDisabled",
    "GuardChanged",
    "ModuleGuardChanged",
    "FallbackHandlerChanged",
    "HashApproved",
    "MessageSigned",
    "NativeReceived",
    "SingletonChanged",
    "ContractDeployed",
]);
/** How long the indexer asked to wait, from `Retry-After` or `x-ratelimit-reset` (both seconds). */
function retryAfterMs(headers) {
    const raw = headers?.get("retry-after") ?? headers?.get("x-ratelimit-reset") ?? null;
    const seconds = raw === null ? NaN : Number(raw);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : undefined;
}
/**
 *  One GraphQL round trip.
 *
 *  Errors surface as {@link RpcError} with the server's own message attached, rather than as a
 *  `data: null` a caller has to notice. A GraphQL endpoint answers 200 for a query error, so a
 *  status check alone would let one through.
 */
async function query(url, document, variables) {
    const doFetch = globalThis.fetch;
    if (doFetch === undefined) {
        throw new RpcError("no fetch available — the indexer reads need a runtime with a global fetch");
    }
    let res;
    try {
        res = await doFetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: document, variables }),
        });
    }
    catch (cause) {
        // Never reached it: the network, DNS, a refused connection. Worth asking again.
        throw new IndexerUnavailableError(`indexer at ${url} could not be reached`, { cause });
    }
    // Rate-limited or overloaded is "not now", not "broken" — said apart, with how long to wait
    // when the indexer says. The hosted indexers send `x-ratelimit-reset` in seconds.
    if (res.status === 429 || res.status >= 500) {
        const wait = retryAfterMs(res.headers);
        throw new IndexerUnavailableError(`indexer at ${url} is unavailable (HTTP ${res.status})`, wait === undefined ? {} : { retryAfterMs: wait });
    }
    if (!res.ok)
        throw new RpcError(`indexer returned HTTP ${res.status} from ${url}`);
    const body = (await res.json());
    if (body.errors?.length) {
        throw new RpcError(`indexer rejected the query: ${body.errors.map((e) => e.message ?? "?").join("; ")}`);
    }
    if (body.data === undefined)
        throw new RpcError("indexer returned no data");
    return body.data;
}
/**
 *  Hasura serves `numeric` and `bigint` as STRINGS, deliberately.
 *
 *  Anything above 2^53 loses precision as a JSON number — which is every 18-decimal amount — so
 *  the endpoint is configured to quote them and this is the only place that unquotes. A `Number()`
 *  anywhere in a consumer is the bug this prevents.
 */
const big = (v) => BigInt(v);
const bigOr = (v) => v === null || v === undefined ? undefined : big(v);
const addr = (v) => v === null || v === undefined ? undefined : getAddress(v);
const hex = (v) => v === null || v === undefined ? undefined : v;
/** Normalises and validates an address argument once, at the boundary. */
function normalise(value, what) {
    try {
        return getAddress(value).toLowerCase();
    }
    catch (cause) {
        throw new InvalidInputError(`${what} is not an address: ${value}`, { cause });
    }
}
// ---------------------------------------------------------------- shapes
const ACCOUNT_FIELDS = `
  id
  chainId
  firstSeenBlock
  firstSeenTimestamp
  safeSingleton
  safeVersion
  threshold
  ownerCount
  moduleCount
  fallbackHandler
  guard
  moduleGuard
  executionCount
  failedExecutionCount
  lastActivityTimestamp
  factory { accountId index deployer createdAtBlock createdAtTimestamp authorization accountIdIsOwner }
`;
const EVENT_FIELDS = `
  id chainId kind subject value digest success blockNumber timestamp logIndex txHash submitter
  content callTo callValue callOperation callData callSelector nonce
  account_id
`;
function toAccount(row) {
    // `factory` is a one-element list because the relation is modelled as a derived field; an
    // one-element list because the relation is modelled as a derived field. Collapsed here so the
    // caller reads a value rather than an array length.
    const d = row.factory?.[0];
    // **A row with no derivation cannot reach here**, because every query filters
    // `origin: {_eq: Factory}`. If one does, the index and this filter disagree about what our
    // factory made, and returning an account with a hole where its `(accountId, index)` belongs
    // would push that disagreement into every consumer. Throwing names it where it happened.
    if (d === undefined) {
        throw new RpcError(`indexed account ${String(row.id)} on chain ${String(row.chainId)} has no derivation, ` +
            `yet the query asked for accounts our factory made. The index and this SDK disagree.`);
    }
    return {
        chainId: Number(row.chainId),
        address: getAddress(row.id),
        firstSeenBlock: big(row.firstSeenBlock),
        firstSeenTimestamp: big(row.firstSeenTimestamp),
        singleton: addr(row.safeSingleton),
        version: row.safeVersion ?? undefined,
        threshold: big(row.threshold),
        ownerCount: Number(row.ownerCount),
        moduleCount: Number(row.moduleCount),
        fallbackHandler: addr(row.fallbackHandler),
        guard: addr(row.guard),
        moduleGuard: addr(row.moduleGuard),
        executionCount: big(row.executionCount),
        failedExecutionCount: big(row.failedExecutionCount),
        lastActivityTimestamp: bigOr(row.lastActivityTimestamp),
        derivation: {
            accountId: getAddress(d.accountId),
            index: big(d.index),
            deployer: getAddress(d.deployer),
            createdAtBlock: big(d.createdAtBlock),
            createdAtTimestamp: big(d.createdAtTimestamp),
            authorization: hex(d.authorization),
            accountIdIsOwner: Boolean(d.accountIdIsOwner),
        },
    };
}
function toEvent(row) {
    const content = row.content;
    return {
        chainId: Number(row.chainId),
        id: row.id,
        account: getAddress(row.account_id),
        kind: row.kind,
        subject: addr(row.subject),
        value: bigOr(row.value),
        digest: hex(row.digest),
        success: row.success ?? undefined,
        blockNumber: big(row.blockNumber),
        timestamp: big(row.timestamp),
        logIndex: Number(row.logIndex),
        txHash: row.txHash,
        submitter: addr(row.submitter),
        execution: content === null || content === undefined
            ? undefined
            : {
                content,
                to: addr(row.callTo),
                value: bigOr(row.callValue),
                operation: row.callOperation === null ? undefined : Number(row.callOperation),
                data: hex(row.callData),
                selector: hex(row.callSelector),
                nonce: bigOr(row.nonce),
            },
    };
}
// ---------------------------------------------------------------- paging
/** Validates a page size once, at the boundary. */
function pageSize(limit) {
    const n = limit ?? 50;
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
        throw new InvalidInputError(`limit must be an integer from 1 to 1000, got ${String(limit)}`);
    }
    return n;
}
// Hex rather than base64: `btoa` is a DOM global this package's `lib` does not assume, and the
// body is plain ASCII JSON. Opaque is the contract; compact is not.
function encodeCursor(body) {
    return [...JSON.stringify(body)]
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
}
function decodeCursor(cursor, scope) {
    let body;
    try {
        if (!/^(?:[0-9a-f]{2})+$/.test(cursor))
            throw new Error("not hex");
        const text = cursor.replace(/../g, (h) => String.fromCharCode(parseInt(h, 16)));
        body = JSON.parse(text);
    }
    catch (cause) {
        throw new InvalidInputError("cursor is not one this SDK issued", { cause });
    }
    if (body.scope !== scope) {
        throw new InvalidInputError("cursor belongs to a different read or filter — start that read again without a cursor");
    }
    return { ...body, gen: body.gen ?? {} };
}
/**
 *  The field every feed query also asks for: when this chain's index last became ready.
 *
 *  A rebuild replays history and sets it again, so a cursor that remembers it can tell that the
 *  rows it points at may have moved. Asked in the same request as the rows — no extra round trip.
 */
const GENERATION_FIELD = `_meta { chainId readyAt }`;
/** One chain's generation from a feed response; `null` while the index is still catching up. */
function generationOf(meta, chainId) {
    return meta?.find((m) => Number(m.chainId) === chainId)?.readyAt ?? null;
}
/**
 *  One page of a feed merged across chains, newest first.
 *
 *  **Each chain is read from its own position.** Block numbers mean nothing across chains, so a
 *  single "before block N" would skip one chain's history and repeat another's. Each chain is
 *  asked for a page after where it stood, the rows are merged by time, the newest `limit` are
 *  kept, and each chain's position moves only past the rows that made it onto the page. A chain
 *  that returned a short page and had every row used is done.
 *
 *  @param scope Everything that defines the feed, so a cursor cannot be replayed into another.
 *  @param read One chain's rows strictly after `position`, newest first, at most `limit`.
 *  @param key A row's position within its chain (`block`, then `tie`) — what the next read resumes after.
 *  @param time A row's timestamp, which orders rows across chains.
 */
async function mergedPage(scope, options, read, key, time) {
    const limit = pageSize(options.limit);
    const chains = [...new Set(chainIdsFor(options.chainIds))].sort((x, y) => x - y);
    const fullScope = `${scope}|${chains.join(",")}`;
    const body = options.cursor === undefined ? undefined : decodeCursor(options.cursor, fullScope);
    const at = body?.at ?? {};
    // Before any request: every chain must have an indexer, or the read fails as a whole.
    targets(options);
    const fetched = await Promise.all(chains.map(async (chainId) => {
        const position = at[chainId];
        if (position === "done") {
            return { chainId, rows: [], generation: body?.gen[chainId] ?? null };
        }
        const got = await read(indexerUrl(chainId), chainId, position, limit);
        // The index was rebuilt under this cursor: its position may now point at other rows.
        if (body !== undefined && position !== undefined && body.gen[chainId] !== got.generation) {
            throw new FeedRestartRequiredError(chainId);
        }
        return { chainId, rows: got.rows, generation: got.generation };
    }));
    const merged = fetched
        .flatMap((f) => f.rows)
        .sort((x, y) => {
        const dt = time(y) - time(x);
        if (dt !== 0n)
            return dt > 0n ? 1 : -1;
        if (x.chainId !== y.chainId)
            return y.chainId - x.chainId;
        const kx = key(x);
        const ky = key(y);
        if (kx.block !== ky.block)
            return ky.block > kx.block ? 1 : -1;
        return ky.tie > kx.tie ? 1 : ky.tie < kx.tie ? -1 : 0;
    });
    const items = merged.slice(0, limit);
    const next = {};
    const gen = {};
    let more = false;
    for (const { chainId, rows, generation } of fetched) {
        gen[chainId] = generation;
        const prior = at[chainId];
        const used = items.filter((r) => r.chainId === chainId);
        const last = used[used.length - 1];
        if (prior === "done" || (rows.length < limit && used.length === rows.length)) {
            next[chainId] = "done";
        }
        else {
            more = true;
            const k = last === undefined ? undefined : key(last);
            const position = k === undefined ? prior : { block: k.block.toString(), tie: k.tie };
            if (position !== undefined)
                next[chainId] = position;
        }
    }
    return { items, nextCursor: more ? encodeCursor({ scope: fullScope, at: next, gen }) : null };
}
/** "Strictly older than this position", for a feed ordered by (block desc, tie desc). */
function olderThan(position, block, tie, tieIsNumber) {
    if (position === undefined || position === "done")
        return "";
    // The tie is zero-padded for sorting; on the wire a number must be a plain integer.
    const t = tieIsNumber ? String(Number(position.tie)) : JSON.stringify(position.tie);
    return `, _or: [
    {${block}: {_lt: "${position.block}"}},
    {${block}: {_eq: "${position.block}"}, ${tie}: {_lt: ${t}}}
  ]`;
}
/** Validates `kinds` against the known set before anything is interpolated into a query. */
function kindFilter(kinds, known) {
    for (const kind of kinds ?? []) {
        if (!known.has(kind))
            throw new InvalidInputError(`${kind} is not a known event kind`);
    }
    // Inlined as unquoted identifiers: `kind` is a GraphQL ENUM on the wire and Hasura rejects a
    // `[String!]` variable for it. Safe only because every value was checked above.
    return kinds?.length ? `, kind: {_in: [${kinds.join(", ")}]}` : "";
}
// ---------------------------------------------------------------- accounts
/**
 *  The account at an address, on each chain that has one — the reverse lookup.
 *
 *  **This is the reason the indexer exists.** Given an address, the derivation cannot tell you
 *  whose account it is: `keccak256(accountId, index)` does not invert. Only an index that watched
 *  the creation can answer. One entry per chain that has the account, because the same address is
 *  a different Safe on each; empty when none has.
 *
 *  @param address The address to look up.
 *  @param options `chainIds` overrides the configured chains.
 */
export async function listAccountsAt(address, options = {}) {
    const id = normalise(address, "address");
    return across(options, async (t) => {
        const data = await query(t.url, `query AccountAt($id: String!, $chainIds: [Int!]!, $limit: Int!) {
         Account(where: {id: {_eq: $id}, chainId: {_in: $chainIds}, origin: {_eq: Factory}}, limit: $limit) { ${ACCOUNT_FIELDS} }
       }`, { id, chainIds: t.chainIds, limit: t.chainIds.length });
        return data.Account.map(toAccount);
    });
}
/**
 *  Accounts, newest first — every one our factory made, those derived from one key or account, or
 *  those an address can act on.
 *
 *  - **Neither filter:** the factory's whole output, newest first — what a front page lists.
 *  - **`derivedFrom`:** everything created under that key **or account**. The sub-account tree is
 *    the same column, so an account's address lists its children, at any number — the answer a
 *    scan from zero can never give: the index space is `uint256` and nothing on chain enumerates it.
 *  - **`controlledBy`:** every account the address is an owner of, newest arrival first. **Not the
 *    same question as `derivedFrom`:** the salt names `accountId` alone, so an owner added after
 *    creation is invisible to every derivation — and an `accountId` since removed is still in the
 *    address forever. Current owners only, unless `includeFormer`.
 *
 *  @throws {InvalidInputError} When both filters are given — they are different questions.
 */
export async function getAccountsPage(options = {}) {
    if (options.derivedFrom !== undefined && options.controlledBy !== undefined) {
        throw new InvalidInputError("derivedFrom and controlledBy are different questions — ask one");
    }
    if (options.controlledBy !== undefined)
        return controlledPage(options);
    const from = options.derivedFrom === undefined ? undefined : normalise(options.derivedFrom, "derivedFrom");
    return mergedPage(`accounts|${from ?? "*"}`, options, async (url, chainId, position, limit) => {
        const data = await query(url, `query AccountsPage($chainId: Int!, $limit: Int!${from === undefined ? "" : ", $from: String!"}) {
           FactoryAccount(
             where: {chainId: {_eq: $chainId}${from === undefined ? "" : ", accountId: {_eq: $from}"}${olderThan(position, "createdAtBlock", "id", false)}}
             order_by: [{createdAtBlock: desc}, {id: desc}]
             limit: $limit
           ) { account { ${ACCOUNT_FIELDS} } }
           ${GENERATION_FIELD}
         }`, { chainId, limit, ...(from === undefined ? {} : { from }) });
        return {
            rows: data.FactoryAccount.map((r) => toAccount(r.account)),
            generation: generationOf(data._meta, chainId),
        };
    }, (a) => ({ block: a.derivation.createdAtBlock, tie: a.address.toLowerCase() }), (a) => a.derivation.createdAtTimestamp);
}
/** `getAccountsPage({controlledBy})`: ordered by when the address became an owner. */
async function controlledPage(options) {
    const owner = normalise(options.controlledBy, "controlledBy");
    const active = options.includeFormer === true ? [true, false] : [true];
    const page = await mergedPage(`controlled|${owner}|${active.join(",")}`, options, async (url, chainId, position, limit) => {
        const data = await query(url, `query ControlledPage($id: String!, $active: [Boolean!]!, $chainId: Int!, $limit: Int!) {
           AccountOwner(
             where: {owner: {_eq: $id}, active: {_in: $active}, chainId: {_eq: $chainId}, account: {origin: {_eq: Factory}}${olderThan(position, "addedAtBlock", "id", false)}}
             order_by: [{addedAtBlock: desc}, {id: desc}]
             limit: $limit
           ) { id addedAtBlock addedAtTimestamp account { ${ACCOUNT_FIELDS} } }
           ${GENERATION_FIELD}
         }`, { id: owner, active, chainId, limit });
        return {
            rows: data.AccountOwner.map((r) => ({
                ...toAccount(r.account),
                ownedSince: big(r.addedAtBlock),
                ownedSinceTime: big(r.addedAtTimestamp),
                rowId: r.id,
            })),
            generation: generationOf(data._meta, chainId),
        };
    }, (r) => ({ block: r.ownedSince, tie: r.rowId }), (r) => r.ownedSinceTime);
    // The sort keys are this read's business, not the caller's: hand back plain accounts.
    return {
        items: page.items.map(({ ownedSince: _s, ownedSinceTime: _t, rowId: _r, ...account }) => account),
        nextCursor: page.nextCursor,
    };
}
/** Every owner of an account, oldest arrival first. Former owners with `includeFormer`. */
export async function listOwners(account, options = {}) {
    const id = normalise(account, "account");
    const active = options.includeFormer === true ? [true, false] : [true];
    return across(options, async (t) => {
        const data = await query(t.url, `query OwnersOf($id: String!, $active: [Boolean!]!, $chainIds: [Int!]!) {
         AccountOwner(where: {account_id: {_eq: $id}, active: {_in: $active}, chainId: {_in: $chainIds}, account: {origin: {_eq: Factory}}}, order_by: {addedAtBlock: asc}) {
           chainId account_id owner active addedAtBlock addedAtTimestamp removedAtBlock
         }
       }`, { id, active, chainIds: t.chainIds });
        return data.AccountOwner.map((r) => ({
            chainId: Number(r.chainId),
            account: getAddress(r.account_id),
            owner: getAddress(r.owner),
            active: Boolean(r.active),
            addedAtBlock: big(r.addedAtBlock),
            addedAtTimestamp: big(r.addedAtTimestamp),
            removedAtBlock: bigOr(r.removedAtBlock),
        }));
    });
}
/**
 *  Every module an account has enabled, oldest first. Former ones with `includeFormer`.
 *
 *  A module acts without any owner signature, so this list is part of who controls the account —
 *  and a module enabled and later disabled is history a reader auditing it needs to see.
 */
export async function listModules(account, options = {}) {
    const id = normalise(account, "account");
    const enabled = options.includeFormer === true ? [true, false] : [true];
    return across(options, async (t) => {
        const data = await query(t.url, `query Modules($id: String!, $enabled: [Boolean!]!, $chainIds: [Int!]!) {
         AccountModule(where: {account_id: {_eq: $id}, enabled: {_in: $enabled}, chainId: {_in: $chainIds}, account: {origin: {_eq: Factory}}}, order_by: {enabledAtBlock: asc}) {
           chainId account_id module enabled enabledAtBlock enabledAtTimestamp disabledAtBlock
         }
       }`, { id, enabled, chainIds: t.chainIds });
        return data.AccountModule.map((r) => ({
            chainId: Number(r.chainId),
            account: getAddress(r.account_id),
            module: getAddress(r.module),
            enabled: Boolean(r.enabled),
            enabledAtBlock: big(r.enabledAtBlock),
            enabledAtTimestamp: big(r.enabledAtTimestamp),
            disabledAtBlock: bigOr(r.disabledAtBlock),
        }));
    });
}
/**
 *  The signed authorization an account was created from, per chain — empty when it was created by
 *  a plain `createAccount`, which leaves nothing signed behind.
 */
export async function listAuthorizations(account, options = {}) {
    const id = normalise(account, "account");
    return across(options, async (t) => {
        const data = await query(t.url, `query Authorizations($id: String!, $chainIds: [Int!]!) {
         Authorization(where: {account_id: {_eq: $id}, chainId: {_in: $chainIds}}) {
           chainId account_id digest accountId additionalOwners threshold deadline blockNumber timestamp txHash
         }
       }`, { id, chainIds: t.chainIds });
        return data.Authorization.map((r) => ({
            chainId: Number(r.chainId),
            account: getAddress(r.account_id),
            digest: r.digest,
            accountId: getAddress(r.accountId),
            additionalOwners: r.additionalOwners.map((o) => getAddress(o)),
            threshold: big(r.threshold),
            deadline: big(r.deadline),
            blockNumber: big(r.blockNumber),
            timestamp: big(r.timestamp),
            txHash: r.txHash,
        }));
    });
}
// ---------------------------------------------------------------- activity
/**
 *  One page of history, newest first — one account's, or every account's.
 *
 *  With `account`, what happened to it. Without, everything that happened to any account our
 *  factory made: the network's activity, for a front page. Across chains the pages merge by time,
 *  and each chain resumes from its own position (see `Page.nextCursor`).
 *
 *  Within a chain the order is `(blockNumber, logIndex)`. **Not timestamp**, which ties — creation
 *  and setup always share a block — and not `id`, a string that sorts block 9,999,999 after
 *  10,000,000.
 */
export async function getActivityPage(options = {}) {
    const id = options.account === undefined ? undefined : normalise(options.account, "account");
    const kinds = kindFilter(options.kinds, ACCOUNT_EVENT_KINDS);
    return mergedPage(`activity|${id ?? "*"}|${[...(options.kinds ?? [])].sort().join(",")}`, options, async (url, chainId, position, limit) => {
        const data = await query(url, `query Activity($chainId: Int!, $limit: Int!${id === undefined ? "" : ", $id: String!"}) {
           AccountEvent(
             where: {chainId: {_eq: $chainId}, account: {origin: {_eq: Factory}}${id === undefined ? "" : ", account_id: {_eq: $id}"}${kinds}${olderThan(position, "blockNumber", "logIndex", true)}}
             order_by: [{blockNumber: desc}, {logIndex: desc}]
             limit: $limit
           ) { ${EVENT_FIELDS} }
           ${GENERATION_FIELD}
         }`, { chainId, limit, ...(id === undefined ? {} : { id }) });
        return { rows: data.AccountEvent.map(toEvent), generation: generationOf(data._meta, chainId) };
    }, (e) => ({ block: e.blockNumber, tie: String(e.logIndex).padStart(10, "0") }), (e) => e.timestamp);
}
// ---------------------------------------------------------------- the factory
const FACTORY_EVENT_KINDS = new Set([
    "Initialized",
    "ImplementationSet",
    "Upgraded",
    "OwnershipTransferred",
    "DomainChanged",
]);
/**
 *  The factory on each chain: who administers it, what new accounts get, and how many it made.
 *
 *  `accountCount` is exact — a counter the index maintains on every creation — so a front page can
 *  say "N accounts" without scanning anything.
 */
export async function listFactories(options = {}) {
    return across(options, async (t) => {
        const data = await query(t.url, `query Factories($chainIds: [Int!]!) {
         Factory(where: {chainId: {_in: $chainIds}}) {
           chainId id owner implementation safeSingleton fallbackHandler accountCount creationSkipCount updatedAtBlock updatedAtTimestamp
         }
       }`, { chainIds: t.chainIds });
        return data.Factory.map((r) => ({
            chainId: Number(r.chainId),
            address: getAddress(r.id),
            owner: addr(r.owner),
            implementation: addr(r.implementation),
            safeSingleton: addr(r.safeSingleton),
            fallbackHandler: addr(r.fallbackHandler),
            accountCount: big(r.accountCount),
            creationSkipCount: big(r.creationSkipCount),
            updatedAtBlock: big(r.updatedAtBlock),
            updatedAtTimestamp: big(r.updatedAtTimestamp),
        }));
    });
}
/**
 *  The factory's own lifecycle, newest first: initialisation, upgrades, admin changes, and the
 *  moments new accounts started getting a different Safe — or every unspent authorization stopped
 *  verifying (`DomainChanged`).
 */
export async function getFactoryHistoryPage(options = {}) {
    const kinds = kindFilter(options.kinds, FACTORY_EVENT_KINDS);
    return mergedPage(`factory|${[...(options.kinds ?? [])].sort().join(",")}`, options, async (url, chainId, position, limit) => {
        const data = await query(url, `query FactoryHistory($chainId: Int!, $limit: Int!) {
           FactoryEvent(
             where: {chainId: {_eq: $chainId}${kinds}${olderThan(position, "blockNumber", "logIndex", true)}}
             order_by: [{blockNumber: desc}, {logIndex: desc}]
             limit: $limit
           ) { chainId id kind subject secondary value blockNumber timestamp logIndex txHash submitter }
           ${GENERATION_FIELD}
         }`, { chainId, limit });
        const rows = data.FactoryEvent.map((r) => ({
            chainId: Number(r.chainId),
            id: r.id,
            kind: r.kind,
            subject: addr(r.subject),
            secondary: addr(r.secondary),
            value: bigOr(r.value),
            blockNumber: big(r.blockNumber),
            timestamp: big(r.timestamp),
            logIndex: Number(r.logIndex),
            txHash: r.txHash,
            submitter: addr(r.submitter),
        }));
        return { rows, generation: generationOf(data._meta, chainId) };
    }, (e) => ({ block: e.blockNumber, tie: String(e.logIndex).padStart(10, "0") }), (e) => e.timestamp);
}
// ---------------------------------------------------------------- freshness
/**
 *  How far behind the index is on each chain, in the order asked.
 *
 *  **Ask before rendering anything that can go stale.** An owner set drawn from a lagging index is
 *  a claim about who can move somebody's money, made from data that was true hours ago.
 */
export async function getIndexerStatus(options = {}) {
    const asked = [...new Set(chainIdsFor(options.chainIds))];
    const statuses = await across(options, async (t) => {
        const data = await query(t.url, `query IndexerStatus { _meta { chainId progressBlock sourceBlock progressBlockTime isReady } }`, {});
        const observedAt = BigInt(Math.floor(Date.now() / 1000));
        const served = new Map(data._meta.map((r) => [Number(r.chainId), r]));
        // A configured chain the deployment does not serve throws rather than being left out: a short
        // list read as "everything is healthy" is how a whole missing chain goes unnoticed.
        const missing = t.chainIds.filter((id) => !served.has(id));
        if (missing.length > 0) {
            throw new RpcError(`indexer at ${t.url} serves no chain ${missing.join(", ")} — it reported ` +
                `[${[...served.keys()].join(", ") || "nothing"}].`);
        }
        return t.chainIds.map((chainId) => {
            const row = served.get(chainId);
            const indexedBlock = big(row.progressBlock);
            const chainHead = big(row.sourceBlock);
            const time = row.progressBlockTime == null ? NaN : Date.parse(row.progressBlockTime);
            const indexedBlockTime = Number.isFinite(time) ? BigInt(Math.floor(time / 1000)) : undefined;
            return {
                chainId,
                indexedBlock,
                chainHead,
                behindBy: chainHead > indexedBlock ? chainHead - indexedBlock : 0n,
                indexedBlockTime,
                lagSeconds: indexedBlockTime === undefined
                    ? undefined
                    : observedAt > indexedBlockTime
                        ? observedAt - indexedBlockTime
                        : 0n,
                observedAt,
                ready: Boolean(row.isReady),
            };
        });
    });
    return asked.map((id) => statuses.find((s) => s.chainId === id));
}
//# sourceMappingURL=indexer.js.map