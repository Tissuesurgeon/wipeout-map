import type { Address, Hex } from "viem";
/**
 * A block identifier the node accepts: a tag, or an exact block number.
 *
 * @category native RPC
 */
export type SomniaBlockTag = "latest" | "earliest" | "pending" | "safe" | "finalized";
/**
 *  Where to read from: a tag, or an exact block number.
 *
 *  Note the node rejects a JSON *number* (`-32602 invalid parameters`) — pass a
 *  `bigint`/`number` here and this module hex-encodes it for you.
 *
 * @category native RPC
 */
export type SomniaBlockParam = SomniaBlockTag | bigint | number;
/**
 * Resources a consensus block consumed, as the node reports them.
 *
 * @category native RPC
 */
export interface SomniaBlockResources {
    /** Gas spent validating the block's transactions. */
    validationGas: bigint;
    /** Compressed size of the block's data, in bytes. */
    compressedBytes: bigint;
    /** Uncompressed size of the block's data, in bytes. */
    uncompressedBytes: bigint;
}
/**
 *  The consensus half of a Somnia ledger block: ordering, timing, and which
 *  data-chain blocks it commits.
 *
 * @category native RPC
 */
export interface SomniaConsensusBlock {
    /** Ledger block number. */
    blockNumber: bigint;
    /** Block time in unix **milliseconds** (not seconds — Somnia blocks are ~100ms). */
    timestamp: bigint;
    /** Hashes of the data-chain blocks this consensus block commits. */
    dataChainBlocks: Hex[];
    /** The delayed ledger block this one references. */
    delayedLedgerBlockNumber: bigint;
    /** Hash of that delayed ledger block. */
    delayedLedgerBlockHash: Hex;
    /** Parent consensus block hash. */
    parentConsensusBlockHash: Hex;
    /** Validator that proposed the block. */
    proposerAddress: Address;
    /** What the block cost to validate + carry. */
    blockResources: SomniaBlockResources;
    /** This block's own consensus hash. */
    consensusBlockHash: Hex;
}
/**
 * The execution half of a ledger block: what running its transactions produced.
 *
 * @category native RPC
 */
export interface SomniaExecutionBlock {
    /** Hash over the executed transaction ids. */
    transactionIdsHash: Hex;
    /** Hash over the produced receipts. */
    receiptsHash: Hex;
    /** Gas limit for execution. */
    executionGasLimit: bigint;
    /** Gas actually used. */
    executionGasUsed: bigint;
    /** State snapshot this execution built on. */
    executionStateSnapshot: Hex;
    /** Block number of that snapshot. */
    stateSnapshotBlockNumber: bigint;
    /** Rolling hash of the operation sequence. */
    operationSequenceHash: bigint;
}
/**
 *  A Somnia **ledger** block — the native block structure, which is not the same
 *  thing as the Ethereum-compatible block `eth_getBlockByNumber` returns. It pairs
 *  the consensus block (ordering, proposer, timing) with the execution block (what
 *  running the transactions produced), so it exposes detail the eth surface has no
 *  field for: the data-chain blocks committed, the state snapshot, the proposer.
 *
 * @category native RPC
 */
export interface SomniaBlock {
    /** Consensus half: ordering, timing, proposer. */
    consensusBlock: SomniaConsensusBlock;
    /** Execution half: gas, receipts hash, state snapshot. */
    executionBlock: SomniaExecutionBlock;
    /** Parent ledger block hash. */
    parentLedgerBlockHash: Hex;
    /** This block's ledger hash — what `getSomniaBlockByHash` takes. */
    ledgerBlockHash: Hex;
}
/**
 * Aggregate activity over a block range. Every field is a count except the last.
 *
 * @category native RPC
 */
export interface SomniaChainStatistics {
    /** Transactions that executed successfully. */
    successfulTransactions: bigint;
    /** Transactions that reverted. */
    revertedTransactions: bigint;
    /** Contracts deployed. */
    contractsAdded: bigint;
    /** Accounts created. */
    accountsAdded: bigint;
    /** EOAs used for the first time. */
    newUsedEoaAccounts: bigint;
    /** Plain native-value transfers. */
    nativeTransferTransactions: bigint;
    /** Total gas units spent. */
    gasUnitsSpent: bigint;
    /** Total fees paid, in wei. */
    gasFeeSpent: bigint;
}
/**
 *  A registered Solidity reactivity subscription, as the node stores it.
 *
 *  The same subscriptions the reactivity precompile manages — see
 *  `@somnia-chain/markets-sdk/reactivity` for creating them. This read is the way
 *  to enumerate what already exists without decoding events.
 *
 * @category native RPC
 */
export interface SomniaReactivitySubscription {
    /** Subscription id. */
    id: bigint;
    /** The four topic filters; `bytes32(0)` is a wildcard / unused slot. */
    topics: [Hex, Hex, Hex, Hex];
    /** `tx.origin` filter; zero address is a wildcard. */
    origin: Address;
    /** Reserved by the protocol — currently always the zero address. */
    caller: Address;
    /** Emitting-contract filter; zero address is a wildcard. */
    emitter: Address;
    /** Who owns the subscription, and whose balance funds its callbacks. */
    owner: Address;
    /** Handler contract the validator calls. */
    handlerContractAddress: Address;
    /** Handler entrypoint (`0x53edf33d` for the default `onEvent`). */
    handlerFunctionSelector: Hex;
    /** Gas provisioned per callback. */
    gasLimit: bigint;
    /** Tip per gas for the callback, in wei. */
    priorityFeePerGas: bigint;
    /** Fee ceiling per gas for the callback, in wei. */
    maxFeePerGas: bigint;
}
/**
 *  The serving node's identity keys for the current epoch — the node's
 *  `EpochNodePublicKeys`, all five fields.
 *
 *  The two proofs are what bind the keys together: without them the address and
 *  the BLS key are just three unrelated values, which is why the node publishes
 *  them alongside and why they are not dropped here.
 *
 * @category native RPC
 */
export interface SomniaNodePublicKeys {
    /** The node's address. */
    address: Address;
    /** Its secp256k1 public key (compressed). */
    ecdsaPublicKey: Hex;
    /** Its BLS public key. */
    blsPublicKey: Hex;
    /** BLS proof of possession — proves the node holds the BLS private key. */
    blsProofOfPossession: Hex;
    /** Proof binding the BLS key to {@link SomniaNodePublicKeys.address}. */
    proofOfAddress: Hex;
}
/**
 *  A transaction to submit through a **session** — the node derives the key from
 *  `seed`, assigns the nonce, signs, submits, retries, and returns the receipt.
 *
 *  ⚠️ `seed` is a **secret with the authority of a private key**: anyone who knows
 *  it controls the derived account (the derivation is public — see
 *  {@link sessionAddress}). Treat it exactly as you would a key.
 *
 * @category native RPC
 */
export interface SessionTransactionRequest {
    /** 32-byte seed identifying the session, and therefore the sending account. */
    seed: Hex;
    /** Execution gas limit. Required — the node does not estimate it. */
    gas: bigint;
    /** Recipient. **Omit to deploy a contract** (`data` is then the init code). */
    to?: Address;
    /** Native value to send, in wei. Defaults to 0. */
    value?: bigint;
    /** Calldata, or contract init code when `to` is omitted. Defaults to empty. */
    data?: Hex;
}
/**
 * Raw `somnia_getBlockByHash` / `somnia_getBlockByNumber` payload.
 *
 * @category native RPC
 */
export interface RpcSomniaBlock {
    consensus_block: {
        block_number: Hex;
        timestamp: Hex;
        data_chain_blocks: Hex[];
        delayed_ledger_block_number: Hex;
        delayed_ledger_block_hash: Hex;
        parent_consensus_block_hash: Hex;
        proposer_address: Address;
        block_resources: {
            validation_gas: Hex;
            compressed_bytes: Hex;
            uncompressed_bytes: Hex;
        };
        consensus_block_hash: Hex;
    };
    execution_block: {
        transaction_ids_hash: Hex;
        receipts_hash: Hex;
        execution_gas_limit: Hex;
        execution_gas_used: Hex;
        execution_state_snapshot: Hex;
        state_snapshot_block_number: Hex;
        operation_sequence_hash: Hex;
    };
    parent_ledger_block_hash: Hex;
    ledger_block_hash: Hex;
}
/**
 * Raw `somnia_getStatistics` payload — camelCase on the wire, unlike the blocks.
 *
 * @category native RPC
 */
export interface RpcSomniaChainStatistics {
    numSuccessfulTransactions: Hex;
    numRevertedTransactions: Hex;
    numContractsAdded: Hex;
    numAccountsAdded: Hex;
    numNewUsedEoaAccounts: Hex;
    numNativeTransferTransactions: Hex;
    numGasUnitsSpent: Hex;
    gasFeeSpent: Hex;
}
/**
 * Raw `somnia_reactivityGetSubscriptionInfo` element.
 *
 * @category native RPC
 */
export interface RpcSomniaReactivitySubscription {
    id: Hex;
    topics: Hex[];
    origin: Address;
    caller: Address;
    emitter: Address;
    owner: Address;
    handler_contract_address: Address;
    handler_function_selector: Hex;
    gas_limit: Hex;
    priority_fee_per_gas: Hex;
    max_fee_per_gas: Hex;
}
/**
 * Raw `somnia_nodePublicKeys` payload.
 *
 * @category native RPC
 */
export interface RpcSomniaNodePublicKeys {
    address: Address;
    ecdsa_public_key: Hex;
    bls_public_key: Hex;
    bls_proof_of_possession: Hex;
    proof_of_address: Hex;
}
