/**
 *  BinaryMarketsModule write surface — for keepers/tooling redeeming, minting/merging
 *  complete sets, or driving `finalizeMarket`/`releasePool` directly.
 *
 * @category ABIs
 */
export declare const binaryModuleWriteAbi: readonly [{
    readonly name: "redeem";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
    }, {
        readonly type: "uint8";
        readonly name: "outcomeIdx";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "redeemMany";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "bytes32[]";
        readonly name: "marketIds";
    }, {
        readonly type: "uint8[]";
        readonly name: "outcomeIdxs";
    }, {
        readonly type: "uint256[]";
        readonly name: "amounts";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "redeemFor";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "uint256";
        readonly name: "nonce";
    }, {
        readonly type: "uint256";
        readonly name: "deadline";
    }, {
        readonly type: "bytes";
        readonly name: "sig";
    }, {
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
    }, {
        readonly type: "uint8";
        readonly name: "outcomeIdx";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "mintCompleteSet";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "mergeCompleteSet";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "finalizeMarket";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "releasePool";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "syncSettlement";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "pokeOracle";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
    readonly outputs: readonly [];
}];
/**
 *  The slice of {@link https://github.com/somnia-chain/somnia-markets IOracleAdapter}
 *  a client needs to read a market's resolution price straight from chain.
 *
 *  Only the numeric answer and its scale. `pullNumericAnswer` REVERTS while the
 *  question is not final (the interface's own contract), so callers treat a
 *  revert as "no answer yet", not as an error.
 *
 *  `PRICE_DECIMALS` is NOT part of IOracleAdapter — the answer scale is a
 *  per-question `numericDecimals` the adapter is free to carry however it
 *  likes, and adapters differ in practice: the price-feed adapter answers in 18
 *  decimals and exposes this getter, while OracleHub answers in 2 and has no
 *  getter at all. So a caller reads it opportunistically and falls back.
 */
export declare const oracleAdapterReadAbi: readonly [{
    readonly name: "pullNumericAnswer";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
    readonly outputs: readonly [{
        readonly type: "int256";
        readonly name: "numericValue";
    }, {
        readonly type: "bool";
        readonly name: "voided";
    }];
}, {
    readonly name: "PRICE_DECIMALS";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
/**
 * Read-only BinaryMarketsModule ABI for settlement discovery, pool reuse, and
 * market records.
 *
 * **When to use**
 *
 * Use when keeper or verification code needs the module's chain state without
 * constructing contract signatures by hand.
 *
 * **Gotchas**
 *
 * The `markets` tuple keeps its v1 layout. Read `marketNonce` separately when
 * you need the outcome-token identifier encoding.
 *
 * @category ABIs
 */
export declare const binaryModuleReadAbi: readonly [{
    readonly name: "settlement";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "poolCreator";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
    }];
}, {
    readonly name: "getFreePools";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
    }, {
        readonly type: "address";
        readonly name: "collateral";
    }];
    readonly outputs: readonly [{
        readonly type: "address[]";
        readonly name: "pools";
    }];
}, {
    readonly name: "freePoolCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
    }, {
        readonly type: "address";
        readonly name: "collateral";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "count";
    }];
}, {
    readonly name: "marketNonce";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
        readonly name: "nonce";
    }];
}, {
    readonly name: "markets";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }, {
        readonly type: "uint8";
        readonly name: "outcomeSlotCount";
    }, {
        readonly type: "uint8";
        readonly name: "voidPolicy";
    }, {
        readonly type: "address";
        readonly name: "collateral";
    }, {
        readonly type: "uint32";
        readonly name: "originOperatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "originVenueId";
    }, {
        readonly type: "address";
        readonly name: "oracleAdapter";
    }, {
        readonly type: "address";
        readonly name: "creator";
    }, {
        readonly type: "address";
        readonly name: "market";
    }, {
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "uint256";
        readonly name: "yesId";
    }, {
        readonly type: "uint256";
        readonly name: "noId";
    }, {
        readonly type: "uint64";
        readonly name: "tradingStart";
    }, {
        readonly type: "uint64";
        readonly name: "expiry";
    }];
}, {
    readonly name: "marketIdByAddress";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "market";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
}];
