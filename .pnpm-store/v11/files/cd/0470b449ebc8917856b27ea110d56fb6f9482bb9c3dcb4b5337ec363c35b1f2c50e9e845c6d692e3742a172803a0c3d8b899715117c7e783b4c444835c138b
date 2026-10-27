export declare const marketsCoreWriteAbi: readonly [{
    readonly name: "registerOperator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "feeRecipient";
    }, {
        readonly type: "bool";
        readonly name: "enabled";
    }, {
        readonly type: "address";
        readonly name: "policy";
    }, {
        readonly type: "bytes";
        readonly name: "context";
    }];
    readonly outputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
}, {
    readonly name: "updateOperator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "address";
        readonly name: "feeRecipient";
    }, {
        readonly type: "bool";
        readonly name: "enabled";
    }, {
        readonly type: "address";
        readonly name: "policy";
    }, {
        readonly type: "bytes";
        readonly name: "context";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setOperatorEnabled";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bool";
        readonly name: "enabled";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "transferOperatorOwnership";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "address";
        readonly name: "newOwner";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "acceptOperatorOwnership";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "createVenue";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes4";
        readonly name: "marketType";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "bytes";
            readonly name: "feeParams";
        }, {
            readonly type: "address";
            readonly name: "feeRecipientOverride";
        }, {
            readonly type: "address";
            readonly name: "policy";
        }, {
            readonly type: "address";
            readonly name: "signer";
        }, {
            readonly type: "bool";
            readonly name: "creationEnabled";
        }, {
            readonly type: "bytes";
            readonly name: "context";
        }];
        readonly name: "config";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes32";
        readonly name: "venueId";
    }];
}, {
    readonly name: "updateVenue";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "bytes";
            readonly name: "feeParams";
        }, {
            readonly type: "address";
            readonly name: "feeRecipientOverride";
        }, {
            readonly type: "address";
            readonly name: "policy";
        }, {
            readonly type: "address";
            readonly name: "signer";
        }, {
            readonly type: "bool";
            readonly name: "creationEnabled";
        }, {
            readonly type: "bytes";
            readonly name: "context";
        }];
        readonly name: "config";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setVenueEnabled";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "bool";
        readonly name: "creationEnabled";
    }];
    readonly outputs: readonly [];
}];
export declare const marketsCoreEventsAbi: readonly [{
    readonly name: "OperatorRegistered";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "feeRecipient";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "enabled";
    }, {
        readonly type: "address";
        readonly name: "policy";
    }, {
        readonly type: "bytes";
        readonly name: "context";
    }];
}, {
    readonly name: "OperatorOwnershipTransferred";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "oldOwner";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "newOwner";
        readonly indexed: true;
    }];
}, {
    readonly name: "VenueCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
        readonly indexed: true;
    }, {
        readonly type: "bytes4";
        readonly name: "marketType";
        readonly indexed: true;
    }, {
        readonly type: "bytes";
        readonly name: "feeParams";
    }, {
        readonly type: "address";
        readonly name: "feeRecipientOverride";
    }, {
        readonly type: "address";
        readonly name: "policy";
    }, {
        readonly type: "address";
        readonly name: "signer";
    }, {
        readonly type: "bool";
        readonly name: "creationEnabled";
    }, {
        readonly type: "bytes";
        readonly name: "context";
    }];
}];
export declare const binaryModuleFeeParamsAbi: readonly [{
    readonly name: "encodeVenueFeeParams";
    readonly type: "function";
    readonly stateMutability: "pure";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint64";
            readonly name: "makerFeeBps";
        }, {
            readonly type: "uint64";
            readonly name: "takerFeeBps";
        }, {
            readonly type: "uint64";
            readonly name: "maxBuilderFeeBps";
        }, {
            readonly type: "uint64";
            readonly name: "routingFeeBps";
        }, {
            readonly type: "uint64";
            readonly name: "settlementFeeBps";
        }, {
            readonly type: "uint8";
            readonly name: "voidPolicy";
        }];
        readonly name: "vp";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes";
    }];
}, {
    readonly name: "FEE_PARAMS_VERSION";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
}, {
    readonly name: "MAX_FEE_BPS";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
