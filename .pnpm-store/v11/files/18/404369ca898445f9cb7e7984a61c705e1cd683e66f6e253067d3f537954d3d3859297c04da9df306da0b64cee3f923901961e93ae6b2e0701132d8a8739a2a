// /system diagnostics reads — the deployed CLOB-family contract state (impl
// pointers, MarketCreator reactivity wiring, oracle links, collateral meta —
// resolved from the per-venue `collateral` address, with `testUsdc` as the
// legacy fallback). Addresses come from the client config (createClient({ addresses })).
import { TransactionNotFoundError, TransactionReceiptNotFoundError } from "viem";
import * as Revert from "./revert.js";
import * as SystemAbi from "./systemAbi.js";
/**
 *  `BinaryMarketsModule.settlement()`, or null on a module that does not declare
 *  it — a pre-v2 deploy. The selector is the version probe, so an undeclared view
 *  is the answer "this module predates settlement extraction". Any other failure
 *  propagates: a dead RPC is not a pre-v2 deploy.
 */
async function readSettlementIfDeclared(client, binaryModule) {
    try {
        return await client.readContract({
            address: binaryModule,
            abi: SystemAbi.binaryModuleReadAbi,
            functionName: "settlement",
        });
    }
    catch (e) {
        if (Revert.isMissingContractView(e))
            return null;
        throw e;
    }
}
/**
 *  Live snapshot of the deployed CLOB family (for the /system dashboard).
 *
 *  Every read propagates its failure. A dead RPC throws `RpcError` rather than
 *  resolving with `marketCount: 0n` and `operatorId: 0`, which a dashboard cannot
 *  tell apart from a freshly deployed creator that genuinely holds those zeros.
 *  The one narrowed read is `settlement()`, whose absence is a protocol version
 *  rather than a fault — see {@link readSettlementIfDeclared}.
 */
export async function getSystemInfo(client, addresses) {
    const a = addresses;
    const pc = client;
    const liveFactory = a.binaryModule
        ? await pc.readContract({
            address: a.binaryModule,
            abi: SystemAbi.binaryModuleReadAbi,
            functionName: "clobFactory",
        })
        : null;
    const clobFactory = liveFactory ?? a.clobFactory ?? null;
    const factoryMismatch = !!liveFactory && !!a.clobFactory && liveFactory.toLowerCase() !== a.clobFactory.toLowerCase();
    // Settlement-extraction v2: the module's wired BinarySettlement singleton. The
    // live read is authoritative; a zero/unset wire falls back to the config so a
    // just-deployed env still renders the address it EXPECTS to be wired.
    //
    // A pre-v2 module does not DECLARE settlement(), and that is a real capability
    // absence rather than a failed read — the selector doubles as the version probe
    // here, so it is the one read in this snapshot that narrows instead of
    // propagating. Every other cause still throws.
    const liveSettlementRaw = a.binaryModule ? await readSettlementIfDeclared(pc, a.binaryModule) : null;
    const liveSettlement = liveSettlementRaw && !/^0x0{40}$/.test(liveSettlementRaw) ? liveSettlementRaw : null;
    const settlement = liveSettlement ?? a.binarySettlement ?? null;
    const settlementMismatch = !!liveSettlement && !!a.binarySettlement && liveSettlement.toLowerCase() !== a.binarySettlement.toLowerCase();
    // No config fallback here: the addresses map has no binaryMarketImpl key, and
    // binaryPoolImpl is a different contract — never report it under this heading.
    const binaryMarketImpl = clobFactory
        ? await pc.readContract({
            address: clobFactory,
            abi: SystemAbi.clobFactoryReadAbi,
            functionName: "binaryMarketImpl",
        })
        : null;
    let marketCreator = null;
    if (a.marketCreator) {
        const mc = { address: a.marketCreator, abi: SystemAbi.marketCreatorReadAbi };
        const [marketCount, owner, gasLimit, maxFee, prioFee, operatorId, venueId] = await Promise.all([
            pc.readContract({ ...mc, functionName: "marketCount" }),
            pc.readContract({ ...mc, functionName: "owner" }),
            pc.readContract({ ...mc, functionName: "reactivityGasLimit" }),
            pc.readContract({ ...mc, functionName: "reactivityMaxFeePerGas" }),
            pc.readContract({ ...mc, functionName: "reactivityPriorityFeePerGas" }),
            pc.readContract({ ...mc, functionName: "operatorId" }),
            pc.readContract({ ...mc, functionName: "venueId" }),
        ]);
        marketCreator = {
            marketCount,
            owner,
            reactivityGasLimit: gasLimit,
            reactivityMaxFeePerGas: maxFee,
            reactivityPriorityFeePerGas: prioFee,
            operatorId: Number(operatorId),
            venueId: venueId.toLowerCase(),
        };
    }
    let oracle = null;
    if (a.fakeOracle) {
        const fo = { address: a.fakeOracle, abi: SystemAbi.fakeOracleReadAbi };
        const [owner, binaryModule] = await Promise.all([
            pc.readContract({ ...fo, functionName: "owner" }),
            pc.readContract({ ...fo, functionName: "RECEIVER" }),
        ]);
        oracle = { owner, binaryModule };
    }
    let usdc = null;
    const collateral = a.collateral ?? a.testUsdc;
    if (collateral) {
        const tu = { address: collateral, abi: SystemAbi.erc20MetaAbi };
        const [symbol, decimals] = await Promise.all([
            pc.readContract({ ...tu, functionName: "symbol" }),
            pc.readContract({ ...tu, functionName: "decimals" }),
        ]);
        usdc = { symbol, decimals: Number(decimals) };
    }
    return {
        clobFactory,
        binaryMarketImpl,
        factoryMismatch,
        settlement,
        settlementMismatch,
        marketCreator,
        oracle,
        usdc,
    };
}
/** Native (gas-token) balance of an address. */
export async function getNativeBalance(address, client) {
    return client.getBalance({ address });
}
/**
 *  {@link TransactionSummary} for `hash`, or null when the tx is unknown to the
 *  node (never landed, or pruned). Rejected inputs (not a 32-byte hash) also
 *  return null rather than throwing — callers treat this as best-effort
 *  enrichment.
 *
 *  **Gotchas**
 *
 *  `null` means the NODE answered "I do not have that": either the hash is
 *  malformed or the node reported the transaction (or its receipt) as not found.
 *  A read that never got an answer throws instead. "It never landed" and "I could
 *  not ask" are different facts, and a fill view that renders them alike hides an
 *  outage.
 */
export async function getTransactionSummary(hash, client) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
        return null;
    try {
        const h = hash;
        const [tx, receipt] = await Promise.all([
            client.getTransaction({ hash: h }),
            client.getTransactionReceipt({ hash: h }),
        ]);
        return {
            from: tx.from.toLowerCase(),
            to: tx.to?.toLowerCase() ?? null,
            nonce: tx.nonce,
            status: receipt.status,
            gasUsed: receipt.gasUsed,
            gasLimit: tx.gas,
            effectiveGasPrice: receipt.effectiveGasPrice,
            feeWei: receipt.gasUsed * receipt.effectiveGasPrice,
            value: tx.value,
            logCount: receipt.logs.length,
        };
    }
    catch (e) {
        // Only the node's own "not found" is absence. viem raises a dedicated error
        // for each of the two reads; anything else (timeout, dropped socket) is an
        // outage and must not read as "this transaction never landed".
        if (e instanceof TransactionNotFoundError || e instanceof TransactionReceiptNotFoundError)
            return null;
        throw Revert.toSdkError(e, "getTransactionSummary");
    }
}
