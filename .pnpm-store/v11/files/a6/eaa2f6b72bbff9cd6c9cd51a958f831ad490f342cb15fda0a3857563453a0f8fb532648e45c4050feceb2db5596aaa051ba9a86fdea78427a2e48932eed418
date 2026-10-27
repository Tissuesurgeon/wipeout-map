// The exchange-level smart-accounts surface — where the factory model pays
// off across chains: the same (accountId, index) derives the same address on
// every covered chain, one owner signature settles creation on all of them,
// and one call builds the multi-chain account the facade trades through.
//
// Engine-level (one chain) lives at `client.accounts`; this module only adds
// what needs the facade: the configured chain set and one engine per chain.
import * as Accounts from "@somnia-chain/accounts-sdk";
import { InvalidInputError, NotConfiguredError } from "../errors.js";
import * as Session from "../native/session.js";
import { everyPage, indexedRead, pageArgs, toPage, toStatus, } from "../smartAccounts.js";
/**
 *  The seed's private key, derived locally. A malformed seed is the caller's
 *  {@link InvalidInputError}, the derivation's own error as `cause`.
 */
function sessionKeyFrom(seed) {
    try {
        return Session.sessionPrivateKey(seed);
    }
    catch (e) {
        throw new InvalidInputError("sessionSeed must be 32 bytes of hex", { cause: e });
    }
}
/**
 *  Build the inner executor for one chain. A seed is derived to its key once
 *  and signs locally on each engine's nonce lane: the node-side session
 *  executor would send the seed with every write.
 */
function innerFactory(inner) {
    if (typeof inner === "function")
        return (chainId) => inner(chainId);
    const privateKey = sessionKeyFrom(inner.sessionSeed);
    return (_chainId, engine) => engine.createExecutor({ privateKey });
}
/**
 *  Bind the exchange-level smart-accounts surface to a facade's chain set.
 *
 * @internal
 */
export function createExchangeSmartAccounts(deps) {
    const covered = () => {
        const ids = deps.chainIds().filter((id) => Accounts.SUPPORTED_CHAIN_IDS.includes(id));
        if (ids.length === 0) {
            throw new InvalidInputError(`no configured chain has an accounts-SDK deployment — smart accounts exist on: ${Accounts.SUPPORTED_CHAIN_IDS.join(", ")}`);
        }
        return ids;
    };
    const first = () => covered()[0] ?? 0; // covered() refuses an empty set
    /** The covered chains with an accounts indexer behind them. */
    const indexed = (operation) => {
        const ids = covered().filter((id) => Accounts.indexerUrl(id) !== null);
        if (ids.length === 0) {
            throw new NotConfiguredError("an accounts indexer", `${operation} reads the accounts indexer, which none of chains ${covered().join(", ")} has`);
        }
        return ids;
    };
    return {
        addressOf: (accountId, index) => Accounts.accountAddress(first(), accountId, index),
        scan: (accountId, options = {}) => Accounts.scanAcrossChains(covered().map((chainId) => ({ client: deps.engineFor(chainId).getViemClient(), chainId })), accountId, options),
        buildCreateAccounts: (authorization, signature) => {
            const ids = covered();
            const signed = {
                factory: Accounts.factoryAddress(first()),
                authorization,
                signature,
            };
            return Accounts.createAccountWithOwnersCalls(ids, signed).map((call) => ({
                call: {
                    chainId: call.chainId,
                    to: call.to,
                    data: call.data,
                    value: call.value,
                    description: `create ${authorization.indices.length} account(s) of ${authorization.accountId} on chain ${call.chainId}`,
                    functionName: "createAccountWithOwners",
                },
                gas: call.gas,
            }));
        },
        accountFor: (accountId, index, inner) => {
            const ids = covered();
            const address = Accounts.accountAddress(first(), accountId, index);
            const innerOn = innerFactory(inner);
            const executors = {};
            for (const chainId of ids) {
                const engine = deps.engineFor(chainId);
                executors[chainId] = engine.createExecutor({ smartAccount: address, inner: innerOn(chainId, engine) });
            }
            return { address, executors };
        },
        listIndexedAccounts: async (address) => indexedRead("listIndexedAccounts", indexed("listIndexedAccounts"), async (scope) => [
            ...(await Accounts.listAccountsAt(address, scope)),
        ]),
        listDerivedAccounts: async (accountId) => indexedRead("listDerivedAccounts", indexed("listDerivedAccounts"), (scope) => everyPage((cursor) => Accounts.getAccountsPage({ ...scope, derivedFrom: accountId, ...cursor }))),
        listControlledAccounts: async (owner, options = {}) => indexedRead("listControlledAccounts", indexed("listControlledAccounts"), (scope) => everyPage((cursor) => Accounts.getAccountsPage({
            ...scope,
            controlledBy: owner,
            ...(options.includeFormer === undefined ? {} : { includeFormer: options.includeFormer }),
            ...cursor,
        }))),
        listOwnerHistory: async (account, options = {}) => indexedRead("listOwnerHistory", indexed("listOwnerHistory"), async (scope) => [
            ...(await Accounts.listOwners(account, {
                ...scope,
                ...(options.includeFormer === undefined ? {} : { includeFormer: options.includeFormer }),
            })),
        ]),
        getActivityPage: async (account, options = {}) => indexedRead("getActivityPage", indexed("getActivityPage"), async (scope) => toPage(await Accounts.getActivityPage({
            ...scope,
            account,
            ...pageArgs(options),
            ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
        }))),
        listIndexerStatus: async () => indexedRead("listIndexerStatus", indexed("listIndexerStatus"), async (scope) => (await Accounts.getIndexerStatus(scope)).map(toStatus)),
        listModuleHistory: async (account, options = {}) => indexedRead("listModuleHistory", indexed("listModuleHistory"), async (scope) => [
            ...(await Accounts.listModules(account, {
                ...scope,
                ...(options.includeFormer === undefined ? {} : { includeFormer: options.includeFormer }),
            })),
        ]),
        listCreationAuthorizations: async (account) => indexedRead("listCreationAuthorizations", indexed("listCreationAuthorizations"), async (scope) => [
            ...(await Accounts.listAuthorizations(account, scope)),
        ]),
        listFactoryStates: async () => indexedRead("listFactoryStates", indexed("listFactoryStates"), async (scope) => [
            ...(await Accounts.listFactories(scope)),
        ]),
        getAccountsPage: async (options = {}) => indexedRead("getAccountsPage", indexed("getAccountsPage"), async (scope) => toPage(await Accounts.getAccountsPage({ ...scope, ...pageArgs(options) }))),
        getNetworkActivityPage: async (options = {}) => indexedRead("getNetworkActivityPage", indexed("getNetworkActivityPage"), async (scope) => toPage(await Accounts.getActivityPage({
            ...scope,
            ...pageArgs(options),
            ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
        }))),
        getFactoryHistoryPage: async (options = {}) => indexedRead("getFactoryHistoryPage", indexed("getFactoryHistoryPage"), async (scope) => toPage(await Accounts.getFactoryHistoryPage({
            ...scope,
            ...pageArgs(options),
            ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
        }))),
    };
}
