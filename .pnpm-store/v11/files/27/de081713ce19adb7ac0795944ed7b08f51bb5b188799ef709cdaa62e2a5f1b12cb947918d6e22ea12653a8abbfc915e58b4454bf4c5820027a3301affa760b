/**
 * Safe's own proxy factory — theirs, not ours, and not the one we deploy accounts through.
 *
 * A separate Safe deployment exists on Somnia mainnet and testnet, and its `ProxyCreation` is
 * how the indexer discovers every Safe under it without a hand-maintained address list. Our
 * `SomniaAccountFactory` never calls this: it deploys through CREATE3 directly, so the two
 * estates cannot be confused for one another by an address that appears in both.
 */
export declare const safeProxyFactoryAbi: readonly [{
    readonly type: "function";
    readonly name: "createChainSpecificProxyWithNonce";
    readonly inputs: readonly [{
        readonly name: "_singleton";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly internalType: "contract SafeProxy";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "createChainSpecificProxyWithNonceL2";
    readonly inputs: readonly [{
        readonly name: "_singleton";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly internalType: "contract SafeProxy";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "createProxyWithNonce";
    readonly inputs: readonly [{
        readonly name: "_singleton";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly internalType: "contract SafeProxy";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "createProxyWithNonceL2";
    readonly inputs: readonly [{
        readonly name: "_singleton";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly internalType: "contract SafeProxy";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "getChainId";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "proxyCreationCode";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly stateMutability: "pure";
}, {
    readonly type: "event";
    readonly name: "ChainSpecificProxyCreationL2";
    readonly inputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "contract SafeProxy";
    }, {
        readonly name: "singleton";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "chainId";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "ProxyCreation";
    readonly inputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "contract SafeProxy";
    }, {
        readonly name: "singleton";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "ProxyCreationL2";
    readonly inputs: readonly [{
        readonly name: "proxy";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "contract SafeProxy";
    }, {
        readonly name: "singleton";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "initializer";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }, {
        readonly name: "saltNonce";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}];
//# sourceMappingURL=SafeProxyFactory.d.ts.map