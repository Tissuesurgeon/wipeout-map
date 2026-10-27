/**
 * Safe's batcher, which refuses nested delegatecalls.
 *
 * The batching route for a signed transaction. Reached by `operation = DelegateCall` from the
 * account, so the batch runs with the account's authority — but because every entry is forced
 * to be a plain call, the batch can never do more than its calls could do one at a time.
 */
export declare const multiSendCallOnlyAbi: readonly [{
    readonly type: "function";
    readonly name: "multiSend";
    readonly inputs: readonly [{
        readonly name: "transactions";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}];
//# sourceMappingURL=MultiSendCallOnly.d.ts.map