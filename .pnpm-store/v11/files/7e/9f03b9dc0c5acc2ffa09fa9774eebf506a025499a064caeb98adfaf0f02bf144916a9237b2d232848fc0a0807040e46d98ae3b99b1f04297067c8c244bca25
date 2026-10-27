// /system diagnostics reads — the deployed CLOB-family contract state (impl
// pointers, MarketCreator reactivity wiring, oracle links, collateral meta —
// resolved from the per-venue `collateral` address, with `testUsdc` as the
// legacy fallback). Addresses come from the client config (createClient({ addresses })).

import { TransactionNotFoundError, TransactionReceiptNotFoundError } from "viem";
import type { Address, PublicClient } from "viem";
import type { SomniaMarketsAddresses } from "./config.js";
import * as Revert from "./revert.js";
import * as SystemAbi from "./systemAbi.js";

/**
 *  On-chain state of the configured MarketCreator (part of {@link SystemInfo}).
 *  Every field is a live read: a failed read throws, so each value here is
 *  something the chain actually answered.
 *
 * @category system
 */
export interface MarketCreatorInfo {
  /** Markets this creator has minted (`marketCount()`). */
  marketCount: bigint;
  /** Creator owner (`owner()`). */
  owner: Address;
  /** Gas limit its reactivity roll callbacks run with. */
  reactivityGasLimit: bigint;
  /** Reactivity-callback fee ceiling (wei per gas). */
  reactivityMaxFeePerGas: bigint;
  /** Reactivity-callback tip (wei per gas). */
  reactivityPriorityFeePerGas: bigint;
  /** Origin operator id this creator's markets are attributed to. */
  operatorId: number;
  /** Origin venue id within the operator (bytes32 hex). */
  venueId: string;
}

/**
 *  Live snapshot of the deployed CLOB-family contract state, as read by
 *  {@link SomniaMarketsClient.getSystemInfo}. `null` means the contract is not
 *  configured or not wired. A live read that FAILS throws — this snapshot never
 *  reports a value the chain did not answer, because a dashboard cannot tell a
 *  fabricated zero from a real one.
 *
 * @category system
 */
export interface SystemInfo {
  /** BinaryMarketsModule.clobFactory() (authoritative) or the configured fallback. */
  clobFactory: Address | null;
  /**
   *  ClobFactory.binaryMarketImpl(), or null when no ClobFactory resolved (there
   *  is no configured market-impl fallback; `binaryPoolImpl` is a different
   *  contract).
   */
  binaryMarketImpl: Address | null;
  /** True when the live ClobFactory differs from the configured one. */
  factoryMismatch: boolean;
  /**
   *  The BinarySettlement singleton the module is wired to (live
   *  `BinaryMarketsModule.settlement()`, falling back to the configured
   *  `addresses.binarySettlement`). Null pre-wire, on a pre-v2 module that does
   *  not declare the view, and when neither is configured. A failed read throws.
   */
  settlement: Address | null;
  /** True when the module's live settlement differs from the configured one. */
  settlementMismatch: boolean;
  /** The configured MarketCreator's state; null when `addresses.marketCreator` is unset. */
  marketCreator: MarketCreatorInfo | null;
  /** FakeOracle wiring; null when `addresses.fakeOracle` is unset. */
  oracle: {
    /** FakeOracle owner (the resolve/void signer). */
    owner: Address;
    /** The module the oracle delivers to (its `RECEIVER`). */
    binaryModule: Address;
  } | null;
  /**
   *  Collateral ERC-20 metadata (from `addresses.collateral`, falling back to the
   *  legacy `testUsdc`); null when neither is configured.
   */
  usdc: {
    /** Token symbol. */
    symbol: string;
    /** Token decimals. */
    decimals: number;
  } | null;
}

/**
 *  `BinaryMarketsModule.settlement()`, or null on a module that does not declare
 *  it — a pre-v2 deploy. The selector is the version probe, so an undeclared view
 *  is the answer "this module predates settlement extraction". Any other failure
 *  propagates: a dead RPC is not a pre-v2 deploy.
 */
async function readSettlementIfDeclared(client: PublicClient, binaryModule: Address): Promise<Address | null> {
  try {
    return await client.readContract({
      address: binaryModule,
      abi: SystemAbi.binaryModuleReadAbi,
      functionName: "settlement",
    });
  } catch (e) {
    if (Revert.isMissingContractView(e)) return null;
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
export async function getSystemInfo(client: PublicClient, addresses: SomniaMarketsAddresses): Promise<SystemInfo> {
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
  const settlementMismatch =
    !!liveSettlement && !!a.binarySettlement && liveSettlement.toLowerCase() !== a.binarySettlement.toLowerCase();

  // No config fallback here: the addresses map has no binaryMarketImpl key, and
  // binaryPoolImpl is a different contract — never report it under this heading.
  const binaryMarketImpl = clobFactory
    ? await pc.readContract({
        address: clobFactory,
        abi: SystemAbi.clobFactoryReadAbi,
        functionName: "binaryMarketImpl",
      })
    : null;

  let marketCreator: MarketCreatorInfo | null = null;
  if (a.marketCreator) {
    const mc = { address: a.marketCreator, abi: SystemAbi.marketCreatorReadAbi } as const;
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

  let oracle: SystemInfo["oracle"] = null;
  if (a.fakeOracle) {
    const fo = { address: a.fakeOracle, abi: SystemAbi.fakeOracleReadAbi } as const;
    const [owner, binaryModule] = await Promise.all([
      pc.readContract({ ...fo, functionName: "owner" }),
      pc.readContract({ ...fo, functionName: "RECEIVER" }),
    ]);
    oracle = { owner, binaryModule };
  }

  let usdc: SystemInfo["usdc"] = null;
  const collateral = a.collateral ?? a.testUsdc;
  if (collateral) {
    const tu = { address: collateral, abi: SystemAbi.erc20MetaAbi } as const;
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
export async function getNativeBalance(address: Address, client: PublicClient): Promise<bigint> {
  return client.getBalance({ address });
}

/**
 *  Chain-direct summary of one transaction — sender, gas spent, fee paid,
 *  status — for enriching an order/fill view with what the tx cost. One
 *  `eth_getTransactionByHash` + one `eth_getTransactionReceipt`, in parallel.
 */
export interface TransactionSummary {
  /** Sender (the wallet that paid gas), lowercased. */
  from: string;
  /** Target contract, lowercased; null on a deployment. */
  to: string | null;
  nonce: number;
  status: "success" | "reverted";
  gasUsed: bigint;
  /** The sender's gas limit for the tx. */
  gasLimit: bigint;
  effectiveGasPrice: bigint;
  /** gasUsed × effectiveGasPrice — the fee paid, wei of the native token. */
  feeWei: bigint;
  /** Native value sent with the tx (wei). */
  value: bigint;
  /** Log records in the receipt — how much the tx did (batch orders emit many). */
  logCount: number;
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
export async function getTransactionSummary(hash: string, client: PublicClient): Promise<TransactionSummary | null> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return null;
  try {
    const h = hash as `0x${string}`;
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
  } catch (e) {
    // Only the node's own "not found" is absence. viem raises a dedicated error
    // for each of the two reads; anything else (timeout, dropped socket) is an
    // outage and must not read as "this transaction never landed".
    if (e instanceof TransactionNotFoundError || e instanceof TransactionReceiptNotFoundError) return null;
    throw Revert.toSdkError(e, "getTransactionSummary");
  }
}
