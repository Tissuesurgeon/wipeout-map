export declare const erc20WriteAbi: readonly [{
    readonly name: "allowance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "spender";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "approve";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "spender";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}];
/**
 * Write ABI for binary order placement, order maintenance, and complete sets.
 *
 * **Gotchas**
 *
 * Binary placement uses `placeBinaryOrder`; the generic `placeOrder` entry
 * reverts on a binary pool. Prices use the YES side even for NO orders.
 *
 * @category ABIs
 */
export declare const binaryPoolWriteAbi: readonly [{
    readonly name: "placeBinaryOrder";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "uint8";
        readonly name: "kind";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint64";
        readonly name: "expireTimestampNs";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "uint8";
        readonly name: "selfMatchingOption";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }, {
        readonly type: "uint64";
        readonly name: "userData";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "success";
    }, {
        readonly type: "uint128";
        readonly name: "id";
    }];
}, {
    readonly name: "placeBinaryOrderFor";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "uint8";
        readonly name: "kind";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint64";
        readonly name: "expireTimestampNs";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "uint8";
        readonly name: "selfMatchingOption";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }, {
        readonly type: "uint64";
        readonly name: "userData";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "success";
    }, {
        readonly type: "uint128";
        readonly name: "id";
    }];
}, {
    readonly name: "cancelOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "reduceOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }, {
        readonly type: "uint256";
        readonly name: "newQuantityRemaining";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelExpiredOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128[]";
        readonly name: "orderIds";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "sweepExpiredAtLevel";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "maxCount";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "cleaned";
    }];
}, {
    readonly name: "captureClose";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "maxSteps";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "approveBuilder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint256";
        readonly name: "maxFeeBpsTimes1k";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getBuilderApproval";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getEffectiveBuilderApproval";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getMaxBuilderFeeBpsTimes1k";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "mintSet";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "yesTo";
    }, {
        readonly type: "address";
        readonly name: "noTo";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "burnSet";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}];
/**
 * Write ABI for single spot order placement, cancellation, and amendment.
 *
 * **Gotchas**
 *
 * `placeOrder` is payable because native-base sells can carry value. The
 * singular amend has a different revert surface from batch amendment.
 *
 * @category ABIs
 */
export declare const spotPoolWriteAbi: readonly [{
    readonly name: "placeOrder";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint64";
        readonly name: "userData";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint64";
        readonly name: "expireTimestampNs";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "uint8";
        readonly name: "selfMatchingOption";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "amendOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint128";
            readonly name: "oldOrderId";
        }, {
            readonly type: "bool";
            readonly name: "alwaysPlace";
        }, {
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "price";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }, {
                readonly type: "uint64";
                readonly name: "expireTimestampNs";
            }, {
                readonly type: "uint8";
                readonly name: "orderType";
            }, {
                readonly type: "uint8";
                readonly name: "selfMatchingOption";
            }, {
                readonly type: "address";
                readonly name: "builder";
            }, {
                readonly type: "uint96";
                readonly name: "builderFeeBpsTimes1k";
            }];
            readonly name: "newOrder";
        }];
        readonly name: "request";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128";
        readonly name: "newOrderId";
    }];
}];
export declare const orderBookBatchWriteAbi: readonly [{
    readonly name: "placeOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "bool";
            readonly name: "isBid";
        }, {
            readonly type: "uint64";
            readonly name: "userData";
        }, {
            readonly type: "uint256";
            readonly name: "price";
        }, {
            readonly type: "uint256";
            readonly name: "quantity";
        }, {
            readonly type: "uint64";
            readonly name: "expireTimestampNs";
        }, {
            readonly type: "uint8";
            readonly name: "orderType";
        }, {
            readonly type: "uint8";
            readonly name: "selfMatchingOption";
        }, {
            readonly type: "address";
            readonly name: "builder";
        }, {
            readonly type: "uint96";
            readonly name: "builderFeeBpsTimes1k";
        }];
        readonly name: "requests";
    }];
    readonly outputs: readonly [{
        readonly type: "bool[]";
        readonly name: "successes";
    }, {
        readonly type: "uint128[]";
        readonly name: "ids";
    }];
}, {
    readonly name: "cancelOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128[]";
        readonly name: "orderIds";
    }];
    readonly outputs: readonly [{
        readonly type: "bool[]";
        readonly name: "cancelled";
    }];
}, {
    readonly name: "reduceOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "uint128";
            readonly name: "orderId";
        }, {
            readonly type: "uint256";
            readonly name: "newQuantityRemaining";
        }];
        readonly name: "requests";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "amendOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "uint128";
            readonly name: "oldOrderId";
        }, {
            readonly type: "bool";
            readonly name: "alwaysPlace";
        }, {
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "price";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }, {
                readonly type: "uint64";
                readonly name: "expireTimestampNs";
            }, {
                readonly type: "uint8";
                readonly name: "orderType";
            }, {
                readonly type: "uint8";
                readonly name: "selfMatchingOption";
            }, {
                readonly type: "address";
                readonly name: "builder";
            }, {
                readonly type: "uint96";
                readonly name: "builderFeeBpsTimes1k";
            }];
            readonly name: "newOrder";
        }];
        readonly name: "requests";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128[]";
        readonly name: "newOrderIds";
    }];
}, {
    readonly name: "EmptyBatch";
    readonly type: "error";
    readonly inputs: readonly [];
}];
/**
 * Write ABI for perpetual order placement, cancellation, and funding updates.
 *
 * **Gotchas**
 *
 * Perpetual placement is not payable. Margin comes from MarginBank rather than
 * per-order escrow.
 *
 * @category ABIs
 */
export declare const perpPoolWriteAbi: readonly [{
    readonly name: "placeOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint64";
        readonly name: "userData";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint64";
        readonly name: "expireTimestampNs";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "uint8";
        readonly name: "selfMatchingOption";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "updateFunding";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}, {
    readonly name: "marginBank";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const marginBankWriteAbi: readonly [{
    readonly name: "deposit";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "withdraw";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setMaxLeverage";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }, {
        readonly type: "uint16";
        readonly name: "leverageX";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "repayFunding";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "recallFromChild";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}];
export declare const linkedWalletRegistryWriteAbi: readonly [{
    readonly name: "proposeLink";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "acceptLink";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "main";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelLinkProposal";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "unlink";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "counterparty";
    }];
    readonly outputs: readonly [];
}];
export declare const voucherDistributorWriteAbi: readonly [{
    readonly name: "claim";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}];
export declare const erc20VaultWriteAbi: readonly [{
    readonly name: "withdraw";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "token";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "deposit";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "token";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "depositNative";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}, {
    readonly name: "depositNativeFor";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }];
    readonly outputs: readonly [];
}];
export declare const spotVaultModeAbi: readonly [{
    readonly name: "setManualVaultMode";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "enabled";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getManualVaultMode";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}];
export declare const spotStopRegistryWriteAbi: readonly [{
    readonly name: "createPendingOrder";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "address";
                readonly name: "owner";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }];
            readonly name: "order";
        }, {
            readonly type: "uint8";
            readonly name: "orderType";
        }, {
            readonly type: "uint256";
            readonly name: "triggerPrice";
        }, {
            readonly type: "uint8";
            readonly name: "triggerOperator";
        }, {
            readonly type: "uint256";
            readonly name: "limitPrice";
        }, {
            readonly type: "address";
            readonly name: "builder";
        }, {
            readonly type: "uint96";
            readonly name: "builderFeeBpsTimes1k";
        }];
        readonly name: "orderWithTrigger";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128";
    }];
}, {
    readonly name: "cancelPendingOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "somiPaymentPerOrder";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const spotStopRegistryEventsAbi: readonly [{
    readonly name: "PendingOrderCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint256";
        readonly name: "triggerPrice";
    }, {
        readonly type: "uint8";
        readonly name: "triggerOperator";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }];
}, {
    readonly name: "PendingOrderTriggered";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "pendingOrderId";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "success";
    }, {
        readonly type: "uint128";
        readonly name: "spotOrderId";
        readonly indexed: true;
    }];
}, {
    readonly name: "PendingOrderCancelled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }];
}, {
    readonly name: "InertOrderCancelled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "somiCredited";
    }];
}];
export declare const perpStopRegistryWriteAbi: readonly [{
    readonly name: "createPendingOrder";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "address";
                readonly name: "owner";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }];
            readonly name: "order";
        }, {
            readonly type: "uint8";
            readonly name: "orderType";
        }, {
            readonly type: "uint256";
            readonly name: "triggerPrice";
        }, {
            readonly type: "uint8";
            readonly name: "triggerOperator";
        }, {
            readonly type: "uint256";
            readonly name: "limitPrice";
        }, {
            readonly type: "address";
            readonly name: "builder";
        }, {
            readonly type: "uint96";
            readonly name: "builderFeeBpsTimes1k";
        }];
        readonly name: "orderWithTrigger";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128";
        readonly name: "pendingOrderId";
    }];
}, {
    readonly name: "createTriggerOrder";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "address";
                readonly name: "owner";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }];
            readonly name: "order";
        }, {
            readonly type: "uint8";
            readonly name: "orderType";
        }, {
            readonly type: "uint256";
            readonly name: "triggerPrice";
        }, {
            readonly type: "uint8";
            readonly name: "triggerOperator";
        }, {
            readonly type: "uint256";
            readonly name: "limitPrice";
        }, {
            readonly type: "address";
            readonly name: "builder";
        }, {
            readonly type: "uint96";
            readonly name: "builderFeeBpsTimes1k";
        }];
        readonly name: "orderWithTrigger";
    }, {
        readonly type: "uint8";
        readonly name: "intent";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128";
        readonly name: "pendingOrderId";
    }];
}, {
    readonly name: "createLinkedPendingOrders";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "address";
                readonly name: "owner";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }];
            readonly name: "order";
        }, {
            readonly type: "uint8";
            readonly name: "orderType";
        }, {
            readonly type: "uint256";
            readonly name: "triggerPrice";
        }, {
            readonly type: "uint8";
            readonly name: "triggerOperator";
        }, {
            readonly type: "uint256";
            readonly name: "limitPrice";
        }, {
            readonly type: "address";
            readonly name: "builder";
        }, {
            readonly type: "uint96";
            readonly name: "builderFeeBpsTimes1k";
        }];
        readonly name: "gteOrder";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
                readonly name: "isBid";
            }, {
                readonly type: "address";
                readonly name: "owner";
            }, {
                readonly type: "uint64";
                readonly name: "userData";
            }, {
                readonly type: "uint256";
                readonly name: "quantity";
            }];
            readonly name: "order";
        }, {
            readonly type: "uint8";
            readonly name: "orderType";
        }, {
            readonly type: "uint256";
            readonly name: "triggerPrice";
        }, {
            readonly type: "uint8";
            readonly name: "triggerOperator";
        }, {
            readonly type: "uint256";
            readonly name: "limitPrice";
        }, {
            readonly type: "address";
            readonly name: "builder";
        }, {
            readonly type: "uint96";
            readonly name: "builderFeeBpsTimes1k";
        }];
        readonly name: "lteOrder";
    }];
    readonly outputs: readonly [{
        readonly type: "uint128";
        readonly name: "gteOrderId";
    }, {
        readonly type: "uint128";
        readonly name: "lteOrderId";
    }];
}, {
    readonly name: "linkPendingOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderIdA";
    }, {
        readonly type: "uint128";
        readonly name: "orderIdB";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelPendingOrder";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelPendingOrders";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint128[]";
        readonly name: "orderIds";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getPendingOrder";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "live";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "tuple";
                readonly components: readonly [{
                    readonly type: "bool";
                    readonly name: "isBid";
                }, {
                    readonly type: "address";
                    readonly name: "owner";
                }, {
                    readonly type: "uint64";
                    readonly name: "userData";
                }, {
                    readonly type: "uint256";
                    readonly name: "quantity";
                }];
                readonly name: "order";
            }, {
                readonly type: "uint8";
                readonly name: "orderType";
            }, {
                readonly type: "uint256";
                readonly name: "triggerPrice";
            }, {
                readonly type: "uint8";
                readonly name: "triggerOperator";
            }, {
                readonly type: "uint256";
                readonly name: "limitPrice";
            }, {
                readonly type: "address";
                readonly name: "builder";
            }, {
                readonly type: "uint96";
                readonly name: "builderFeeBpsTimes1k";
            }];
            readonly name: "orderWithTrigger";
        }, {
            readonly type: "uint128";
            readonly name: "orderId";
        }, {
            readonly type: "uint256";
            readonly name: "somiPaid";
        }, {
            readonly type: "uint128";
            readonly name: "siblingOrderId";
        }, {
            readonly type: "uint8";
            readonly name: "intent";
        }];
        readonly name: "order";
    }];
}, {
    readonly name: "somiPaymentPerOrder";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "claimSomi";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}, {
    readonly name: "unclaimedSomi";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const perpStopRegistryEventsAbi: readonly [{
    readonly name: "PendingOrderCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint256";
        readonly name: "triggerPrice";
    }, {
        readonly type: "uint8";
        readonly name: "triggerOperator";
    }, {
        readonly type: "uint8";
        readonly name: "orderType";
    }, {
        readonly type: "address";
        readonly name: "builder";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }];
}, {
    readonly name: "PendingOrdersLinked";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "gteOrderId";
        readonly indexed: true;
    }, {
        readonly type: "uint128";
        readonly name: "lteOrderId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }];
}];
export declare const operatorAuthorizationReadAbi: readonly [{
    readonly name: "isOperatorAuthorized";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "operator";
    }, {
        readonly type: "bytes4";
        readonly name: "selector";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}];
export declare const spotPoolStopReadAbi: readonly [{
    readonly name: "getAutoPullRequirement";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "quantity";
    }, {
        readonly type: "uint96";
        readonly name: "builderFeeBpsTimes1k";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "inputToken";
    }, {
        readonly type: "uint256";
        readonly name: "requiredAmount";
    }, {
        readonly type: "uint256";
        readonly name: "delta";
    }];
}];
export declare const spotPoolLockReadAbi: readonly [{
    readonly name: "getOwnLockedBalance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "lockedBase";
    }, {
        readonly type: "uint256";
        readonly name: "lockedQuote";
    }];
}, {
    readonly name: "getLockedTokenBreakdown";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "principalLocked";
        }, {
            readonly type: "uint256";
            readonly name: "lockedSurplus";
        }, {
            readonly type: "uint256";
            readonly name: "leftover";
        }];
        readonly name: "base";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "principalLocked";
        }, {
            readonly type: "uint256";
            readonly name: "lockedSurplus";
        }, {
            readonly type: "uint256";
            readonly name: "leftover";
        }];
        readonly name: "quote";
    }];
}, {
    readonly name: "convertToQuoteAtPriceCeil";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "baseQuantity";
    }, {
        readonly type: "uint256";
        readonly name: "priceQuote";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const operatorRegistryWriteAbi: readonly [{
    readonly name: "setOperatorApprovalGlobal";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "operator";
    }, {
        readonly type: "bytes4[]";
        readonly name: "selectors";
    }, {
        readonly type: "bool";
        readonly name: "approved";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setOperatorApprovalForPool";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "address";
        readonly name: "operator";
    }, {
        readonly type: "bytes4[]";
        readonly name: "selectors";
    }, {
        readonly type: "bool";
        readonly name: "approved";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "isGloballyApproved";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "operator";
    }, {
        readonly type: "bytes4";
        readonly name: "selector";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "isApprovedForPool";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "operator";
    }, {
        readonly type: "bytes4";
        readonly name: "selector";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}];
export declare const binaryMarketReadAbi: readonly [{
    readonly name: "payoutNumerators";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256[]";
    }];
}, {
    readonly name: "payoutDenominator";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint32";
    }];
}, {
    readonly name: "isResolved";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "isVoided";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "pool";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "outcomeToken";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "yesId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "noId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
/**
 *  CollateralRouter write surface — the periphery over BinaryMarketsModule's
 *  plain-ERC-20 complete-set flow that adds native (wrap/unwrap) and Permit2
 *  entry ergonomics. Mirrors smart-contracts ICollateralRouter. `(operatorId,
 *  venueId)` is the routing attribution (operator uint32 + bytes32 venue id
 *  within it), `marketId` the bytes32 market key. The Permit2 mint takes the
 *  canonical Permit2 `PermitTransferFrom` tuple + the EIP-712 signature.
 */
export declare const collateralRouterWriteAbi: readonly [{
    readonly type: "function";
    readonly name: "mintCompleteSetNative";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly name: "operatorId";
        readonly type: "uint32";
    }, {
        readonly name: "venueId";
        readonly type: "bytes32";
    }, {
        readonly name: "marketId";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "mintCompleteSetPermit2";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "operatorId";
        readonly type: "uint32";
    }, {
        readonly name: "venueId";
        readonly type: "bytes32";
    }, {
        readonly name: "marketId";
        readonly type: "bytes32";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }, {
        readonly name: "permit";
        readonly type: "tuple";
        readonly components: readonly [{
            readonly name: "permitted";
            readonly type: "tuple";
            readonly components: readonly [{
                readonly name: "token";
                readonly type: "address";
            }, {
                readonly name: "amount";
                readonly type: "uint256";
            }];
        }, {
            readonly name: "nonce";
            readonly type: "uint256";
        }, {
            readonly name: "deadline";
            readonly type: "uint256";
        }];
    }, {
        readonly name: "sig";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "redeemNative";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "operatorId";
        readonly type: "uint32";
    }, {
        readonly name: "venueId";
        readonly type: "bytes32";
    }, {
        readonly name: "marketId";
        readonly type: "bytes32";
    }, {
        readonly name: "outcomeIdx";
        readonly type: "uint8";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
}];
