// Finding accounts, and finding out what controls them.
//
// This module exists because of one measurement. `eth_getLogs` on Somnia caps at 999 blocks and
// the chain produces 1000 blocks per 100 seconds, so a single query window covers 1.7 minutes and
// thirty days of history would take 25,920 sequential requests. Anything phrased as *history* is
// therefore out of reach over RPC, and that includes the obvious way to find a user's accounts:
// reading `AccountCreated` events.
//
// The factory's derivation makes that unnecessary. An account's address is
// `CREATE3(factory, keccak256(abi.encode(accountId, index)))`, so you do not *search* for
// someone's accounts — you compute the addresses offline and ask the chain which ones have code.
// Discovery becomes arithmetic plus one `eth_getCode` per candidate, and needs no index at all.
//
// What genuinely cannot be answered here is the inverse: given a bare address, whose account is
// it? `keccak256` is not invertible and the app cannot guess candidate owners, so that one needs
// an index (TRAD-265). Everything below walks *from* something the caller already knows.
//
// There is no Multicall3 on Somnia mainnet, Somnia testnet or Hideki — 0 bytes at the canonical
// `0xcA11bde05977b3631167028862bE2a173976CA11` on all three — so reads here fan out with a
// concurrency limit rather than batching. Every function that spends requests counts them, so a
// caller can budget rather than discover the cost by waiting.
import { getAddress } from "viem";
import { getCode, readContract } from "viem/actions";
import { safeAbi } from "./abi/generated/index.js";
import { accountAddress } from "./factory.js";
import { InvalidInputError, present, RpcError } from "./errors.js";
/** How many reads to have in flight at once. Tuned by the caller, not by this module. */
const DEFAULT_CONCURRENCY = 8;
/**
 *  How many indices to try before concluding an accountId has no more accounts.
 *
 *  Twenty slots, which is BIP-44's address gap limit — the same number HD wallets have used for a
 *  decade to decide when to stop looking. Borrowed deliberately rather than picked: the problem is
 *  identical (an unbounded index space, no way to ask "how many are there"), and the failure mode
 *  is identical too. An account at index 900 is invisible to any scan, and Ledger Live's choice of
 *  10 for Ethereum shows the limit is a product decision rather than a constant.
 *
 *  So the number is not the interesting part — the honesty is. A caller must say "none in the
 *  first twenty" and offer a way to look further, never "none". {@link AccountScan} carries the
 *  bound it used so a UI can say which it means.
 */
const DEFAULT_MAX_INDEX = 19n;
/**
 *  Run `work` over `items` with at most `limit` in flight, preserving input order.
 *
 *  Deliberately not `Promise.all` over the whole set: a tree scan can produce hundreds of reads
 *  and an unbounded fan-out gets rate-limited, which surfaces as a read that *failed* rather than
 *  a read that was *too eager* — and a failed read is indistinguishable from "no code here", which
 *  is exactly the confusion this module exists to avoid.
 */
async function mapLimited(items, limit, work) {
    const out = new Array(items.length);
    let next = 0;
    const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        for (;;) {
            const i = next++;
            if (i >= items.length)
                return;
            const item = items[i];
            if (item === undefined)
                return;
            out[i] = await work(item, i);
        }
    });
    await Promise.all(runners);
    return out;
}
/**
 *  Whether an address has code, or `undefined` when the read did not answer.
 *
 *  **Exported because the tri-state is the point, and a consumer rebuilding it gets it wrong.**
 *  `getCode` throwing and `getCode` returning nothing are different facts: the first means the
 *  chain did not answer, the second means the address is empty. Collapsing them renders a funded,
 *  existing account as "not there" — which is what a caller writing `catch { return false }`
 *  produces, and it is a claim about somebody's money made from an RPC hiccup.
 *
 *  @param client Any viem client that can read.
 *  @param address The address to check.
 *  @returns `true` with code, `false` without, `undefined` when the read failed.
 */
export async function hasCode(client, address) {
    try {
        const code = await getCode(client, { address });
        return code !== undefined && code !== "0x";
    }
    catch {
        // Unknown, NOT false. A failed read must never be reported as "nothing there": the caller
        // would render an existing, funded account as empty.
        return undefined;
    }
}
/**
 *  Every account `accountId` could have, up to `maxIndex`, and which of them exist.
 *
 *  The derivation is offline, so the addresses are known before any request is made; the requests
 *  only establish which are deployed. That ordering matters for a UI: the list can render
 *  immediately with every address correct and fill in existence as the reads land.
 *
 *  `maxIndex` is a scan bound, not a property of the factory. The factory reserves nothing and
 *  counts nothing — index 7 is simply the eighth address that accountId may occupy — so a scan
 *  can always be wrong about "no more accounts" and the caller should say "none in the first N"
 *  rather than "none".
 */
export async function accountsOf(client, chainId, accountId, options = {}) {
    const maxIndex = options.maxIndex ?? DEFAULT_MAX_INDEX;
    const indices = [];
    for (let i = 0n; i <= maxIndex; i++)
        indices.push(i);
    return accountsAt(client, chainId, accountId, indices, options);
}
/**
 *  How many indices one call may ask about.
 *
 *  Each index is an `eth_getCode`, so a range is a request count with a different name. The cap is
 *  here rather than in the caller because the mistake it prevents — `accountsInRange(0n, 2n**32n)`
 *  from a typo — does not fail, it hangs, and then rate-limits everything else the app is doing.
 *
 *  Exported because a caller that pages a wide scan has to know where to cut, and the alternative
 *  is a `1000` written down a second time in the consumer.
 */
export const MAX_SCAN_WIDTH = 1000n;
/**
 *  The indices a range covers.
 *
 *  @param range The span.
 *  @returns Each index, in order.
 *  @throws {InvalidInputError} When the span is empty or wider than {@link MAX_SCAN_WIDTH}.
 */
export function rangeIndices(range) {
    if (range.count <= 0n)
        throw new InvalidInputError("A range needs at least one index.");
    if (range.count > MAX_SCAN_WIDTH) {
        throw new InvalidInputError(`A range of ${range.count} indices is ${range.count} reads; ${MAX_SCAN_WIDTH} is the cap. ` +
            "Ask for the indices you actually use, or scan in pages.");
    }
    const indices = [];
    for (let i = 0n; i < range.count; i++)
        indices.push(range.from + i);
    return indices;
}
/**
 *  Which of `accountId`'s accounts exist, at exactly the indices you name.
 *
 *  **The general form**, and the one a dapp with its own index namespace wants: an account at
 *  index 10000 is invisible to {@link accountsOf}, which walks up from zero, and no amount of
 *  scanning finds it without being told where to look. There is no way around that — the index
 *  space is `uint256` and nothing on chain enumerates it — so the API takes the answer rather than
 *  pretending to search for it.
 *
 *  Duplicates are collapsed and order is preserved, so a caller can pass a list assembled from
 *  several sources without deduplicating first.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner — a key, or an account when these are its sub-accounts.
 *  @param indices The indices to check.
 *  @param options.concurrency How many reads in flight.
 *  @param options.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns One slot per index, in the order given.
 *  @throws {InvalidInputError} When more than {@link MAX_SCAN_WIDTH} indices are asked for at once.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export async function accountsAt(client, chainId, accountId, indices, options = {}) {
    const unique = [];
    const seen = new Set();
    for (const index of indices) {
        const key = index.toString();
        if (seen.has(key))
            continue;
        seen.add(key);
        unique.push(index);
    }
    if (unique.length === 0)
        throw new InvalidInputError("A scan needs at least one index.");
    if (BigInt(unique.length) > MAX_SCAN_WIDTH) {
        throw new InvalidInputError(`${unique.length} indices is ${unique.length} reads; ${MAX_SCAN_WIDTH} is the cap.`);
    }
    const owner = getAddress(accountId);
    const candidates = unique.map((index) => ({
        index,
        address: accountAddress(chainId, owner, index, options.saltVersion),
    }));
    const deployed = await mapLimited(candidates, options.concurrency ?? DEFAULT_CONCURRENCY, ({ address }) => hasCode(client, address));
    return {
        accountId: owner,
        slots: candidates.map((c, i) => ({ ...c, deployed: deployed[i] })),
        indices: unique,
        maxIndex: unique.reduce((max, index) => (index > max ? index : max), unique[0]),
        requests: candidates.length,
    };
}
/**
 *  Which of `accountId`'s accounts exist, across a contiguous span.
 *
 *  The shape a namespace takes: a dapp that puts a user's main account at 10000 and its
 *  sub-accounts at 10001 upward asks for `{from: 10000n, count: 16n}` and gets the whole family.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner.
 *  @param range The span.
 *  @param options As {@link accountsAt}.
 *  @returns The scan.
 *  @throws {InvalidInputError} When the span is empty or wider than the cap.
 */
export async function accountsInRange(client, chainId, accountId, range, options = {}) {
    return accountsAt(client, chainId, accountId, rangeIndices(range), options);
}
/**
 *  The lowest index in a scan with nothing at it.
 *
 *  Falls back to one past the highest index seen rather than to zero. If every slot in the scanned
 *  set exists, zero is the one index guaranteed to be taken, and suggesting it would put an
 *  already-used address in front of someone about to create an account.
 *
 *  **A slot whose existence is unknown is not free.** Suggesting an index because a read failed is
 *  how two people end up fighting over one address — and the factory is idempotent, so the second
 *  creator does not get an error, they silently get the first one's account.
 *
 *  @param scan A scan, or the slots out of one. Both are accepted because everything else in this
 *         module takes and returns an {@link AccountScan}, and being the one function that wanted
 *         `scan.slots` instead was a papercut a consumer hit rather than a distinction worth
 *         keeping. Anything carrying an index and a tri-state existence still satisfies it.
 *  @returns The index to offer.
 */
export function firstFreeIndex(scan) {
    const slots = Array.isArray(scan)
        ? scan
        : scan.slots;
    for (const slot of slots) {
        if (slot.deployed === false)
            return slot.index;
    }
    return slots.reduce((max, slot) => (slot.index > max ? slot.index : max), -1n) + 1n;
}
/**
 *  The next index with nothing at it, read from the chain.
 *
 *  What a caller almost always wants when they did not name an index: "give me another account".
 *  {@link firstFreeIndex} is the rule; this is the rule plus the read, so a consumer does not have
 *  to remember to do both — and, more importantly, does not get to skip the read and guess.
 *
 *  Starts from `from`, so an application with its own namespace asks for the next free one *in its
 *  namespace* rather than the next free one overall.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner — a key, or an account when these are its sub-accounts.
 *  @param options.from Where to start looking. Defaults to zero.
 *  @param options.width How many indices to consider. Defaults to the gap limit.
 *  @param options.concurrency How many reads in flight.
 *  @param options.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The index to create at.
 *  @throws {RpcError} When no read answered, because then nothing was learned and every index in the
 *          window is equally unknown — returning one would hand out an index that may be taken,
 *          and the factory is idempotent, so the caller would silently get somebody else's
 *          account rather than an error.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export async function nextFreeIndex(client, chainId, accountId, options = {}) {
    const from = options.from ?? 0n;
    const scan = await accountsInRange(client, chainId, accountId, { from, count: options.width ?? DEFAULT_MAX_INDEX + 1n }, options);
    if (scan.slots.every((slot) => slot.deployed === undefined)) {
        throw new RpcError(`No read answered while looking for a free index under ${scan.accountId}. ` +
            "Nothing was learned, so any index offered here could already be taken.");
    }
    return firstFreeIndex(scan.slots);
}
/**
 *  What a scan actually covered, as a sentence.
 *
 *  Exists so a UI never has to infer coverage from `maxIndex`, which reads as "0 through N" and is
 *  only that for {@link accountsOf}. Saying "none in the indices I checked" is the whole difference
 *  between an honest empty state and one that hides an account.
 *
 *  @param scan The scan.
 *  @returns A phrase like `indices 0–19` or `12 indices from 10000`.
 */
export function describeCoverage(scan) {
    const { indices } = scan;
    const first = indices[0];
    const last = indices[indices.length - 1];
    if (first === undefined || last === undefined)
        return "no indices";
    const contiguous = BigInt(indices.length) === last - first + 1n;
    if (!contiguous)
        return `${indices.length} indices from ${first.toString()} to ${last.toString()}`;
    if (indices.length === 1)
        return `index ${first.toString()}`;
    return `indices ${first.toString()}\u2013${last.toString()}`;
}
/**
 *  Who controls `account`, and which of those are themselves accounts.
 *
 *  A Safe owned by a Safe is not a hypothetical: `createAccount` takes any address, including one
 *  of our own accounts, and the resulting child is fully operable — proven on Somnia testnet to
 *  three levels, moved by a single EOA signature. So "is this owner a key or an account" is a
 *  question the UI has to be able to answer, and it is answerable on chain.
 */
export async function ownersOf(client, account) {
    const address = getAddress(account);
    const [owners, threshold] = await Promise.all([
        readContract(client, { address, abi: safeAbi, functionName: "getOwners" }),
        readContract(client, { address, abi: safeAbi, functionName: "getThreshold" }),
    ]);
    const kinds = await mapLimited(owners, DEFAULT_CONCURRENCY, async (owner) => {
        const code = await hasCode(client, owner);
        if (code === undefined)
            return "unknown";
        if (!code)
            return "key";
        // Has code. Only an owner that answers `getOwners()` is one of ours; anything else is a
        // contract that happens to be an owner and cannot be walked further.
        try {
            await readContract(client, { address: owner, abi: safeAbi, functionName: "getOwners" });
            return "account";
        }
        catch {
            return "key";
        }
    });
    return {
        account: address,
        owners: owners.map((address, i) => ({ address, kind: kinds[i] ?? "unknown" })),
        threshold,
        // getOwners + getThreshold, then getCode and possibly getOwners per owner.
        requests: 2 + owners.length * 2,
    };
}
/**
 *  Walk owners upward until every branch ends at something with no code.
 *
 *  This answers the question no other product asks: an account owned by another account **can
 *  only act while its parent can**. If the parent's keys are lost, the child is stranded — its
 *  funds stay visible and nobody can move them. There is no recovery path in the contracts, so the
 *  chain of custody is not a detail, it is the account's most important property.
 *
 *  Cycles are possible in principle (A owns B, B owns A) and would be unusable but deployable, so
 *  visited addresses are tracked rather than assumed away.
 */
export async function custodyChain(client, account, options = {}) {
    const maxDepth = options.maxDepth ?? 8;
    const maxRequests = options.maxRequests ?? 200;
    const root = getAddress(account);
    const steps = [];
    const keys = [];
    const visited = new Set([root.toLowerCase()]);
    let frontier = [root];
    let requests = 0;
    let complete = true;
    for (let depth = 0; depth <= maxDepth && frontier.length > 0; depth++) {
        if (depth === maxDepth || requests >= maxRequests) {
            // Stopped early: say so rather than returning a chain that looks finished.
            complete = false;
            break;
        }
        const sets = await mapLimited(frontier, DEFAULT_CONCURRENCY, async (address) => {
            try {
                return await ownersOf(client, address);
            }
            catch {
                return undefined;
            }
        });
        const nextFrontier = [];
        for (const [i, set] of sets.entries()) {
            const address = frontier[i];
            if (address === undefined)
                continue;
            if (set === undefined) {
                // Could not read this account's owners. The branch is unresolved, not terminated.
                complete = false;
                continue;
            }
            requests += set.requests;
            steps.push({ account: address, owners: set.owners, threshold: set.threshold, depth });
            for (const owner of set.owners) {
                if (owner.kind === "key") {
                    if (!keys.some((k) => k.toLowerCase() === owner.address.toLowerCase())) {
                        keys.push(owner.address);
                    }
                    continue;
                }
                if (owner.kind === "unknown") {
                    complete = false;
                    continue;
                }
                const seen = owner.address.toLowerCase();
                if (visited.has(seen))
                    continue;
                visited.add(seen);
                nextFrontier.push(owner.address);
            }
        }
        frontier = nextFrontier;
    }
    return { account: root, steps, keys, complete, requests };
}
/**
 *  Every account derived from `root`, and every account derived from those, recursively.
 *
 *  `root` may be a key or an account — the derivation does not care, which is exactly why nesting
 *  works at all. Because an account can be an accountId, the set of a user's accounts is a tree
 *  rather than a list, and a user who created one by hand will have one whether or not the app
 *  offers it. So this scans downward by default rather than treating nesting as an advanced view.
 *
 *  Bounded by a request budget, not only by depth, because the cost is multiplicative: each
 *  deployed account adds another `maxIndex + 1` reads. `complete` says whether the budget held.
 */
export async function accountTree(client, chainId, root, options = {}) {
    const maxDepth = options.maxDepth ?? 3;
    const maxRequests = options.maxRequests ?? 400;
    let requests = 0;
    let complete = true;
    const visited = new Set([getAddress(root).toLowerCase()]);
    const scan = async (owner, depth) => {
        if (depth >= maxDepth) {
            complete = false;
            return [];
        }
        if (requests >= maxRequests) {
            complete = false;
            return [];
        }
        const { slots, requests: spent } = options.indices === undefined
            ? await accountsOf(client, chainId, owner, options)
            : await accountsAt(client, chainId, owner, options.indices, options);
        requests += spent;
        const nodes = [];
        for (const slot of slots) {
            if (slot.deployed === undefined)
                complete = false;
            const seen = slot.address.toLowerCase();
            const children = slot.deployed === true && !visited.has(seen)
                ? (visited.add(seen), await scan(slot.address, depth + 1))
                : [];
            nodes.push({ address: slot.address, index: slot.index, deployed: slot.deployed, children });
        }
        return nodes;
    };
    return { root: getAddress(root), nodes: await scan(getAddress(root), 0), complete, requests };
}
/**
 *  The same address, seen from every chain the factory reaches.
 *
 *  The address is identical on all three by construction, so this is not "find the account on each
 *  chain" — it is "is it deployed there, and does it have the same owners". Those can differ:
 *  ownership is per-chain state, and an owner added on one chain is not added on the others.
 */
export async function setupsAcrossChains(clients, account) {
    const address = getAddress(account);
    return mapLimited(clients, clients.length, async ({ client, chainId }) => {
        const deployed = await hasCode(client, address);
        if (deployed !== true)
            return { chainId, deployed, owners: undefined, threshold: undefined };
        try {
            const set = await ownersOf(client, address);
            return {
                chainId,
                deployed,
                owners: set.owners.map((o) => o.address),
                threshold: set.threshold,
            };
        }
        catch {
            return { chainId, deployed, owners: undefined, threshold: undefined };
        }
    });
}
const sameOwners = (a, b) => {
    if (a.length !== b.length)
        return false;
    const left = [...a].map((x) => x.toLowerCase()).sort();
    const right = [...b].map((x) => x.toLowerCase()).sort();
    return left.every((x, i) => x === right[i]);
};
/**
 *  The owner set and threshold shared by every chain the account is deployed on, or `undefined`
 *  when they disagree.
 *
 *  Chains where the account is not deployed are excluded rather than counted as different: an
 *  address with no code has no owner set to disagree with, and treating absence as divergence
 *  would report every partially-deployed account as inconsistent.
 */
export function sharedSetup(setups) {
    const live = setups.filter((s) => s.deployed === true && s.owners !== undefined && s.threshold !== undefined);
    const first = live[0];
    if (first === undefined)
        return undefined;
    const agrees = live.every((s) => s.threshold === first.threshold && sameOwners(s.owners, first.owners));
    return agrees ? { owners: first.owners, threshold: first.threshold } : undefined;
}
/**
 *  Which chains differ from the one the caller is standing on.
 *
 *  Deliberately relative rather than an abstract diff, because that is what a user can act on: an
 *  owner change is a transaction on one chain and affects only that chain, so "these two differ
 *  from where you are" tells them what to fix and an unanchored set difference does not.
 */
export function deviatingSetups(setups, chainId) {
    const here = setups.find((s) => s.chainId === chainId);
    // Nothing to compare against: the caller's own chain has no owner set, either because the
    // account is not deployed there or because the read did not answer. Reporting every other chain
    // as deviating would be worse than reporting none -- it would name the wrong side as the odd
    // one out.
    if (here === undefined)
        return [];
    const hereOwners = here.owners;
    const hereThreshold = here.threshold;
    if (hereOwners === undefined || hereThreshold === undefined)
        return [];
    return setups.filter((s) => {
        if (s.chainId === chainId || s.deployed !== true)
            return false;
        if (s.owners === undefined || s.threshold === undefined)
            return false;
        return !(s.threshold === hereThreshold && sameOwners(s.owners, hereOwners));
    });
}
/**
 *  Scan one owner's accounts on several chains at once.
 *
 *  **The sibling of {@link setupsAcrossChains}, for the step before it.** `setupsAcrossChains`
 *  answers "who owns this account, per chain" for an address you already have; this answers "which
 *  of this owner's accounts exist, anywhere" and hands back the union. Every wallet-shaped consumer
 *  was writing that loop — scan n chains, union the deployed indices, take the address out of
 *  whichever slot answered — and the union is the part that is easy to get subtly wrong.
 *
 *  **Why the address is one field and not one per chain.** An account's address is derived from
 *  the factory's address and `(accountId, index)` alone, and the factory sits at the same address
 *  on every chain it is deployed to, so the derivation is chain-independent by construction. This
 *  asserts it rather than assuming it: a chain running a factory at a different address would make
 *  a cross-chain union meaningless, and that is worth a loud failure rather than a quiet one.
 *
 *  Every chain is scanned for the SAME indices, so the slots line up and the union is exact.
 *
 *  @param clients One viem client per chain, each with the chain id it is connected to.
 *  @param accountId The owner the addresses derive from.
 *  @param options `maxIndex` bounds the scan the way {@link accountsOf} does; `indices` names them
 *         explicitly instead, the way {@link accountsAt} does. `concurrency` and `saltVersion` are
 *         passed through to each chain's scan.
 *  @returns The union, and each chain's own scan.
 *  @throws {InvalidInputError} When `clients` is empty, when the index list is empty or too wide,
 *          or when two chains derive different addresses for one index.
 *  @throws {UnsupportedChainError} When a chain has no committed deployment.
 */
export async function scanAcrossChains(clients, accountId, options = {}) {
    if (clients.length === 0) {
        throw new InvalidInputError("A cross-chain scan needs at least one chain to scan.");
    }
    const address = getAddress(accountId);
    // Resolved once, here, so every chain is asked the same question and the slots line up. Letting
    // each chain pick its own range would make the union an intersection of whatever each happened
    // to cover.
    const indices = options.indices ??
        (() => {
            const max = options.maxIndex ?? DEFAULT_MAX_INDEX;
            const list = [];
            for (let i = 0n; i <= max; i++)
                list.push(i);
            return list;
        })();
    const perChain = await mapLimited(clients, clients.length, async ({ client, chainId }) => ({
        chainId,
        scan: await accountsAt(client, chainId, address, indices, options),
    }));
    const slots = [];
    for (let position = 0; position < indices.length; position++) {
        const index = present(indices[position], "a scan's index list has no holes");
        const deployedOn = [];
        const emptyOn = [];
        const inconclusiveOn = [];
        let derived;
        for (const { chainId, scan } of perChain) {
            const slot = present(scan.slots[position], "each chain scanned the same index list");
            if (derived === undefined) {
                derived = slot.address;
            }
            else if (derived !== slot.address) {
                throw new InvalidInputError(`Index ${index} derives to ${derived} on one chain and ${slot.address} on ${chainId}. ` +
                    "These chains run factories at different addresses, so there is no cross-chain view " +
                    "of this owner's accounts.");
            }
            if (slot.deployed === true)
                deployedOn.push(chainId);
            else if (slot.deployed === false)
                emptyOn.push(chainId);
            else
                inconclusiveOn.push(chainId);
        }
        slots.push({
            index,
            address: present(derived, "at least one chain was scanned"),
            deployedOn,
            emptyOn,
            inconclusiveOn,
        });
    }
    return {
        accountId: address,
        slots,
        indices,
        chainIds: clients.map((c) => c.chainId),
        perChain,
    };
}
//# sourceMappingURL=discovery.js.map