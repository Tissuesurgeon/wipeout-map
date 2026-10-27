// The smart-accounts capability — the interface `client.accounts` returns and
// the factory that binds it to a markets client's chain transport. Products
// consume ONE SDK: everything the accounts factory model offers (derivation,
// discovery, creation, owner management, funds, health) is reachable here,
// with `@somnia-chain/accounts-sdk` as the engine room underneath.
//
// The division of labour is the accounts SDK's own doctrine: it produces pure
// data — addresses, plans, calls — and this SDK owns the transport. Reads go
// through the owning client's decorated chain client; writes come back as
// `UnsignedCall`s for an executor to send, the same shape every `build*` verb
// in this package returns. Nothing here signs and nothing here broadcasts.
//
// Lives here (not in index.ts) so the barrel stays a pure sink —
// createClient.ts deep-imports this module, and `client.accounts` is the only
// door to the bound capability.
import * as Accounts from "@somnia-chain/accounts-sdk";
import { AccountFeedRestartRequiredError, AccountsIndexerUnavailableError, IndexerError, InvalidInputError, NotConfiguredError, RpcError, } from "./errors.js";
/** An accounts-SDK failure crossing the boundary as this SDK's own classes. */
function normalized(caught, operation) {
    if (caught instanceof Accounts.InvalidInputError ||
        caught instanceof Accounts.UnsupportedChainError ||
        caught instanceof Accounts.AmbiguousDeploymentError ||
        caught instanceof Accounts.MissingContractError ||
        caught instanceof Accounts.NotAnOwnerError) {
        return new InvalidInputError(caught.message, { cause: caught });
    }
    if (caught instanceof InvalidInputError || caught instanceof RpcError)
        return caught;
    const detail = caught instanceof Error ? caught.message : String(caught);
    return new RpcError(operation, detail, { cause: caught });
}
/**
 *  The paging fields the accounts SDK takes, from markets' options — copied
 *  field by field, so a markets option never reaches the accounts SDK by name.
 *
 * @internal
 */
export function pageArgs(options) {
    return {
        ...(options.limit === undefined ? {} : { limit: options.limit }),
        ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    };
}
/**
 *  An accounts-SDK page as markets' own page shape. Built field by field: if
 *  the accounts SDK renames its page, this stops compiling instead of the
 *  rename reaching markets' callers.
 *
 * @internal
 */
export function toPage(page) {
    return { items: [...page.items], nextCursor: page.nextCursor };
}
/** Page size for the `list*` reads that drain a feed: the accounts SDK's maximum, so the fewest trips. */
const DRAIN_PAGE = 1000;
/**
 *  Every item of an accounts-SDK feed, following `nextCursor` until it is
 *  drained — so a `list*` read never stops at a page boundary and hands back a
 *  silently shortened answer.
 *
 * @internal
 */
export async function everyPage(read) {
    const all = [];
    let cursor;
    do {
        const page = await read({ limit: DRAIN_PAGE, ...(cursor === undefined ? {} : { cursor }) });
        all.push(...page.items);
        const next = page.nextCursor ?? undefined;
        // A page that hands back the cursor it was read with would be read again forever. The accounts
        // SDK never does — a drained chain is marked done — so this is a broken indexer, and it is
        // said rather than looped on. Thrown inside `indexedRead`, which reports it as an IndexerError.
        if (next !== undefined && next === cursor) {
            throw new Error("the indexer returned the same page cursor twice; stopped instead of looping");
        }
        cursor = next;
    } while (cursor !== undefined);
    return all;
}
/**
 *  An accounts-SDK indexer status as markets' own shape, field by field.
 *
 * @internal
 */
export function toStatus(status) {
    return {
        chainId: status.chainId,
        indexedBlock: status.indexedBlock,
        chainHead: status.chainHead,
        behindBy: status.behindBy,
        indexedBlockTime: status.indexedBlockTime,
        lagSeconds: status.lagSeconds,
        observedAt: status.observedAt,
        ready: status.ready,
    };
}
/**
 *  Run accounts-indexer reads over `chainIds`, boundary-normalized.
 *
 *  **Details**
 *
 *  The accounts SDK owns its indexer URLs; nothing here passes one. The
 *  chains are ALWAYS passed explicitly — the accounts SDK's process-wide
 *  default is never relied on, so the chains a read covers belong to the
 *  owner that made it. A chain whose indexer was turned off with the accounts
 *  SDK's `configureIndexer` is refused before any request.
 *
 * @internal
 */
export async function indexedRead(operation, chainIds, run) {
    const missing = chainIds.filter((id) => Accounts.indexerUrl(id) === null);
    if (missing.length > 0) {
        throw new NotConfiguredError("an accounts indexer", `${operation} reads the accounts indexer, which chain ${missing.join(", ")} does not have`);
    }
    try {
        return await run({ chainIds });
    }
    catch (caught) {
        if (caught instanceof Accounts.InvalidInputError) {
            throw new InvalidInputError(caught.message, { cause: caught });
        }
        if (caught instanceof Accounts.FeedRestartRequiredError) {
            throw new AccountFeedRestartRequiredError(caught.chainId, { cause: caught });
        }
        const detail = caught instanceof Error ? caught.message : String(caught);
        const [only] = chainIds;
        const chain = chainIds.length === 1 && only !== undefined ? { chainId: only } : {};
        // Checked before the generic case: the accounts SDK's "not now" is a subclass of its RpcError,
        // and the right reaction to it — wait and ask again — differs from a broken read.
        if (caught instanceof Accounts.IndexerUnavailableError) {
            throw new AccountsIndexerUnavailableError(operation, detail, caught.retryAfterMs, { cause: caught, ...chain });
        }
        throw new IndexerError(operation, detail, { cause: caught, ...chain });
    }
}
/**
 *  Bind the smart-accounts capability to a markets client's chain transport.
 *
 *  **Gotchas**
 *
 *  NOT exported: `client.accounts` is the only door, built lazily. The chain
 *  gate runs per member rather than at construction, so a client on an
 *  uncovered chain (a local anvil) still constructs and every other
 *  capability keeps working.
 *
 * @internal
 */
export function createSmartAccountsWithDeps(deps) {
    const { getConfig, getClient } = deps;
    const chainId = () => getConfig().chain.id;
    const covered = () => {
        const id = chainId();
        if (!Accounts.SUPPORTED_CHAIN_IDS.includes(id)) {
            throw new InvalidInputError(`the accounts SDK has no deployment on chain ${id} — smart accounts exist on: ${Accounts.SUPPORTED_CHAIN_IDS.join(", ")}`);
        }
        return id;
    };
    /** One read, boundary-normalized. */
    const read = async (operation, run) => {
        const id = covered();
        try {
            return await run(id);
        }
        catch (caught) {
            throw normalized(caught, operation);
        }
    };
    /** One pure build, boundary-normalized. */
    const build = (run) => {
        const id = covered();
        try {
            return run(id);
        }
        catch (caught) {
            throw normalized(caught, "build");
        }
    };
    const asUnsigned = (call, description, functionName) => ({
        chainId: chainId(),
        to: call.to,
        data: call.data,
        value: call.value,
        description,
        ...(functionName === undefined ? {} : { functionName }),
    });
    const signedBy = (id, authorization, signature) => ({
        factory: Accounts.factoryAddress(id),
        authorization,
        signature,
    });
    const creation = (call, description, functionName) => ({
        call: asUnsigned(call, description, functionName),
        gas: call.gas,
    });
    return {
        addressOf: (accountId, index) => build((id) => Accounts.accountAddress(id, accountId, index)),
        find: (accountId, options = {}) => read("find", (id) => Accounts.accountsOf(getClient(), id, accountId, options.maxIndex === undefined ? {} : { maxIndex: options.maxIndex })),
        nextFreeIndex: (accountId, options = {}) => read("nextFreeIndex", (id) => Accounts.nextFreeIndex(getClient(), id, accountId, options.from === undefined ? {} : { from: options.from })),
        ownersOf: (account) => read("ownersOf", () => Accounts.ownersOf(getClient(), account)),
        custodyChain: (account, options = {}) => read("custodyChain", () => Accounts.custodyChain(getClient(), account, options)),
        authorityPath: (account, signer, options = {}) => read("authorityPath", () => Accounts.authorityPath(getClient(), account, signer, options)),
        tree: (root, options = {}) => read("tree", (id) => Accounts.accountTree(getClient(), id, root, options)),
        holdings: (account, tokens = []) => read("holdings", () => Accounts.readHoldings(getClient(), account, tokens)),
        health: (account) => read("health", async (id) => Accounts.evaluateHealth(await Accounts.readHealthFacts(getClient(), { account, chainId: id }))),
        buildExecution: async (args) => {
            const id = covered();
            const [first] = args.calls;
            if (first === undefined)
                throw new InvalidInputError("an execution needs at least one call");
            for (const c of args.calls) {
                if (c.chainId !== id) {
                    throw new InvalidInputError(`"${c.description}" belongs on chain ${c.chainId}, but this client is chain ${id}`);
                }
            }
            const description = args.calls.length === 1
                ? `${first.description} (via account ${args.account})`
                : `${args.calls.length} calls (via account ${args.account})`;
            try {
                const planArgs = {
                    chainId: id,
                    account: args.account,
                    calls: args.calls.map((c) => ({ to: c.to, value: c.value, data: c.data })),
                    ...(args.through === undefined ? {} : { through: args.through }),
                };
                const plan = args.nonce !== undefined
                    ? Accounts.planExecution({ ...planArgs, nonce: args.nonce })
                    : await Accounts.readExecutionPlan(getClient(), planArgs);
                const prepared = Accounts.prepareExecution(plan, args.signer);
                return {
                    // The accounts SDK types the payload `unknown` (it may be the Safe
                    // transaction or a parent's SafeMessage envelope); both are typed
                    // data, narrowed once at this boundary.
                    typedData: prepared.typedData,
                    digest: prepared.digest,
                    signer: prepared.signer,
                    gasFloor: prepared.gasFloor ?? Accounts.EXECUTION_GAS_FLOOR,
                    toCall: (signature) => asUnsigned(prepared.toCall(signature), description, "execTransaction"),
                };
            }
            catch (caught) {
                throw normalized(caught, "buildExecution");
            }
        },
        buildCreateAccount: (accountId, index) => build((id) => creation(Accounts.createAccountCall(id, accountId, index), `create account ${index} of ${accountId}`, "createAccount")),
        buildAccountAuthorization: (args) => build((id) => {
            const authorization = Accounts.buildAccountAuthorization({
                chainId: id,
                accountId: args.accountId,
                indices: args.indices,
                additionalOwners: args.additionalOwners ?? [],
                now: args.now ?? BigInt(Math.floor(Date.now() / 1000)),
                ...(args.threshold === undefined ? {} : { threshold: args.threshold }),
                ...(args.window === undefined ? {} : { window: args.window }),
            });
            return {
                authorization,
                typedData: Accounts.accountAuthorizationTypedData(Accounts.factoryAddress(id), authorization),
            };
        }),
        buildCreateAccounts: (authorization, signature) => build((id) => creation(Accounts.createAccountWithOwnersCall(id, signedBy(id, authorization, signature)), `create ${authorization.indices.length} account(s) of ${authorization.accountId}`, "createAccountWithOwners")),
        buildAddOwner: (account, owner, threshold) => build(() => asUnsigned(Accounts.addOwnerCall(account, owner, threshold), `add owner ${owner}`, "addOwnerWithThreshold")),
        buildSwapOwner: (account, owners, oldOwner, newOwner) => build(() => asUnsigned(Accounts.swapOwnerCall(account, owners, oldOwner, newOwner), `swap owner ${oldOwner}`, "swapOwner")),
        buildRemoveOwner: (account, owners, owner, threshold) => build(() => asUnsigned(Accounts.removeOwnerCall(account, owners, owner, threshold), `remove owner ${owner}`, "removeOwner")),
        buildChangeThreshold: (account, threshold) => build(() => asUnsigned(Accounts.changeThresholdCall(account, threshold), `set threshold ${threshold}`, "changeThreshold")),
        buildTransfer: (args) => build(() => Accounts.transferCalls({
            to: args.to,
            ...(args.native === undefined ? {} : { native: args.native }),
            ...(args.tokens === undefined ? {} : { tokens: args.tokens }),
        }).map((call, i) => asUnsigned(call, `transfer to ${args.to} (${i + 1})`, call.data === "0x" ? undefined : "transfer"))),
        getIndexedAccount: async (address) => indexedRead("getIndexedAccount", [covered()], async (scope) => {
            const [found] = await Accounts.listAccountsAt(address, scope);
            return found ?? null;
        }),
        listDerivedAccounts: async (accountId) => indexedRead("listDerivedAccounts", [covered()], (scope) => everyPage((cursor) => Accounts.getAccountsPage({ ...scope, derivedFrom: accountId, ...cursor }))),
        listControlledAccounts: async (owner, options = {}) => indexedRead("listControlledAccounts", [covered()], (scope) => everyPage((cursor) => Accounts.getAccountsPage({
            ...scope,
            controlledBy: owner,
            ...(options.includeFormer === undefined ? {} : { includeFormer: options.includeFormer }),
            ...cursor,
        }))),
        listOwnerHistory: async (account, options = {}) => indexedRead("listOwnerHistory", [covered()], async (scope) => [
            ...(await Accounts.listOwners(account, {
                ...scope,
                ...(options.includeFormer === undefined ? {} : { includeFormer: options.includeFormer }),
            })),
        ]),
        getActivityPage: async (account, options = {}) => indexedRead("getActivityPage", [covered()], async (scope) => toPage(await Accounts.getActivityPage({
            ...scope,
            account,
            ...pageArgs(options),
            ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
        }))),
        getIndexerStatus: async () => indexedRead("getIndexerStatus", [covered()], async (scope) => {
            const [status] = await Accounts.getIndexerStatus(scope);
            // The accounts SDK answers every chain asked for or throws, so one is there.
            if (status === undefined)
                throw new Error("the indexer returned no status for this chain");
            return toStatus(status);
        }),
        listModuleHistory: async (account, options = {}) => indexedRead("listModuleHistory", [covered()], async (scope) => [
            ...(await Accounts.listModules(account, {
                ...scope,
                ...(options.includeFormer === undefined ? {} : { includeFormer: options.includeFormer }),
            })),
        ]),
        getCreationAuthorization: async (account) => indexedRead("getCreationAuthorization", [covered()], async (scope) => {
            const [found] = await Accounts.listAuthorizations(account, scope);
            return found ?? null;
        }),
        getFactoryState: async () => indexedRead("getFactoryState", [covered()], async (scope) => {
            const [found] = await Accounts.listFactories(scope);
            return found ?? null;
        }),
        getAccountsPage: async (options = {}) => indexedRead("getAccountsPage", [covered()], async (scope) => toPage(await Accounts.getAccountsPage({ ...scope, ...pageArgs(options) }))),
        getNetworkActivityPage: async (options = {}) => indexedRead("getNetworkActivityPage", [covered()], async (scope) => toPage(await Accounts.getActivityPage({
            ...scope,
            ...pageArgs(options),
            ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
        }))),
        getFactoryHistoryPage: async (options = {}) => indexedRead("getFactoryHistoryPage", [covered()], async (scope) => toPage(await Accounts.getFactoryHistoryPage({
            ...scope,
            ...pageArgs(options),
            ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
        }))),
    };
}
