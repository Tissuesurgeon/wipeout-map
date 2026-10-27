export declare const binaryPoolReadAbi: readonly [{
    readonly name: "getBookLevels";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint64";
        readonly name: "numLevels";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "price";
        }, {
            readonly type: "uint256";
            readonly name: "quantity";
        }];
    }];
}, {
    readonly name: "getOrderBookParameters";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "tickSize";
        }, {
            readonly type: "uint256";
            readonly name: "minQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "lotSize";
        }];
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
    readonly name: "marketNonce";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "settlement";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "finalized";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "booksEmpty";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "marketExpiryNs";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "setBacking";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "closingPrice";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "closingMid";
    }, {
        readonly type: "uint256";
        readonly name: "oneCollateral";
    }, {
        readonly type: "uint8";
        readonly name: "state";
    }];
}, {
    readonly name: "closingTop";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "maxSteps";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "bestBid";
    }, {
        readonly type: "uint256";
        readonly name: "bestAsk";
    }, {
        readonly type: "bool";
        readonly name: "bidFound";
    }, {
        readonly type: "bool";
        readonly name: "askFound";
    }];
}, {
    readonly name: "getBinaryPoolParams";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "collateralToken";
        }, {
            readonly type: "address";
            readonly name: "market";
        }, {
            readonly type: "address";
            readonly name: "outcomeToken";
        }, {
            readonly type: "uint256";
            readonly name: "yesId";
        }, {
            readonly type: "uint256";
            readonly name: "noId";
        }, {
            readonly type: "uint256";
            readonly name: "oneCollateral";
        }, {
            readonly type: "uint256";
            readonly name: "setBacking";
        }, {
            readonly type: "address";
            readonly name: "feeRecipient";
        }, {
            readonly type: "uint256";
            readonly name: "makerFeeBpsTimes1k";
        }, {
            readonly type: "uint256";
            readonly name: "takerFeeBpsTimes1k";
        }, {
            readonly type: "uint256";
            readonly name: "maxBuilderFeeBpsTimes1k";
        }, {
            readonly type: "uint256";
            readonly name: "settlementFeeBpsTimes1k";
        }, {
            readonly type: "address";
            readonly name: "settlement";
        }, {
            readonly type: "uint64";
            readonly name: "marketNonce";
        }, {
            readonly type: "bool";
            readonly name: "finalized";
        }];
    }];
}, {
    readonly name: "getOrder";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint128";
        readonly name: "orderId";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint128";
            readonly name: "orderId";
        }, {
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
            readonly name: "price";
        }, {
            readonly type: "uint256";
            readonly name: "fullQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "quantityRemaining";
        }, {
            readonly type: "uint64";
            readonly name: "expireTimestampNs";
        }];
    }];
}, {
    readonly name: "getOwnOpenOrders";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint128[]";
    }];
}, {
    readonly name: "getAllOpenOrdersOffChain";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bool";
        readonly name: "isBid";
    }, {
        readonly type: "uint256";
        readonly name: "maxCount";
    }, {
        readonly type: "uint64";
        readonly name: "startCursor";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "uint128";
            readonly name: "orderId";
        }, {
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
            readonly name: "price";
        }, {
            readonly type: "uint256";
            readonly name: "fullQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "quantityRemaining";
        }, {
            readonly type: "uint64";
            readonly name: "expireTimestampNs";
        }];
        readonly name: "orders";
    }, {
        readonly type: "bool";
        readonly name: "hasMoreOrders";
    }, {
        readonly type: "uint64";
        readonly name: "nextCursor";
    }];
}, {
    readonly name: "IncorrectOrder";
    readonly type: "error";
    readonly inputs: readonly [];
}];
export declare const binaryPoolTokensAbi: readonly [{
    readonly name: "outcomeToken";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "collateralToken";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "marketNonce";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}];
/**
 *  The BinarySettlement redemption singleton — for keepers/tooling reading
 *  settlement records or finalizing/redeeming against it directly.
 *
 * @category ABIs
 */
export declare const binarySettlementAbi: readonly [{
    readonly name: "redeem";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "outcomeId";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "collateralOut";
    }];
}, {
    readonly name: "finalizeAndRedeem";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "uint256";
        readonly name: "outcomeId";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "collateralOut";
    }];
}, {
    readonly name: "finalize";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "marketKey";
    }];
}, {
    readonly name: "claimOwed";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "token";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "getSettlement";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "marketKey";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "collateralToken";
        }, {
            readonly type: "uint128";
            readonly name: "backing";
        }, {
            readonly type: "bool";
            readonly name: "finalized";
        }, {
            readonly type: "bool";
            readonly name: "voided";
        }, {
            readonly type: "uint256";
            readonly name: "settlementFeeBpsTimes1k";
        }, {
            readonly type: "address";
            readonly name: "feeRecipient";
        }, {
            readonly type: "address";
            readonly name: "pool";
        }, {
            readonly type: "uint64";
            readonly name: "nonce";
        }, {
            readonly type: "uint256[]";
            readonly name: "payoutNumerators";
        }];
    }];
}, {
    readonly name: "isFinalized";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "outcomeId";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "owed";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
    }, {
        readonly type: "address";
        readonly name: "token";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "isPoolApproved";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "poolRegistrar";
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
}];
export declare const binaryMarketReadAbi: readonly [{
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
}, {
    readonly name: "pool";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "collateral";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "status";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
}, {
    readonly name: "backing";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "expiry";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "settlementWindow";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "payoutNumerators";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256[]";
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
    readonly name: "voidPolicy";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
}];
export declare const erc20ReadAbi: readonly [{
    readonly name: "decimals";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
}, {
    readonly name: "balanceOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "symbol";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "string";
    }];
}, {
    readonly name: "name";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "string";
    }];
}, {
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
}];
/**
 *  The protocol-wide ERC-6909 outcome-token singleton — for keepers/tooling reading
 *  outcome balances or wiring operator approvals/transfers directly.
 *
 * @category ABIs
 */
export declare const erc6909Abi: readonly [{
    readonly name: "balanceOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "uint256";
        readonly name: "id";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "allowance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "spender";
    }, {
        readonly type: "uint256";
        readonly name: "id";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "isOperator";
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
        readonly type: "bool";
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
        readonly name: "id";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "setOperator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "spender";
    }, {
        readonly type: "bool";
        readonly name: "approved";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "transfer";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "receiver";
    }, {
        readonly type: "uint256";
        readonly name: "id";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "transferFrom";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "sender";
    }, {
        readonly type: "address";
        readonly name: "receiver";
    }, {
        readonly type: "uint256";
        readonly name: "id";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}];
export declare const spotStopRegistryReadAbi: readonly [{
    readonly name: "somiPaymentPerOrder";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const spotPoolOperatorRegistryReadAbi: readonly [{
    readonly name: "getOperatorPermissionsRegistry";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const perpPoolReadAbi: readonly [{
    readonly name: "marginBank";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "oracle";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "getMarkPrice";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getIndexPrice";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "price";
    }, {
        readonly type: "uint256";
        readonly name: "updatedAt";
    }];
}, {
    readonly name: "getCurrentFundingRate";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getCumulativeFundingPerUnit";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getProjectedCumulativeFundingPerUnit";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getOpenInterest";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "openInterest";
    }];
}, {
    readonly name: "getOneBase";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getFundingParameters";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "fundingCalculationWindowSec";
        }, {
            readonly type: "uint256";
            readonly name: "fundingSettlementIntervalSec";
        }, {
            readonly type: "int256";
            readonly name: "interestRatePerWindow";
        }, {
            readonly type: "uint256";
            readonly name: "maxFundingRatePerWindow";
        }, {
            readonly type: "uint256";
            readonly name: "dampener";
        }, {
            readonly type: "uint256";
            readonly name: "emaSmoothingAlpha";
        }, {
            readonly type: "uint256";
            readonly name: "maxOracleStalenessSec";
        }];
    }];
}, {
    readonly name: "getLastFundingUpdateTimestampNs";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "getEmaPremium";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getTimeWeightedPremium";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getLastObservedPremium";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getPremiumWindowState";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "int256";
        readonly name: "accumulator";
    }, {
        readonly type: "uint64";
        readonly name: "intervalStartNs";
    }, {
        readonly type: "uint64";
        readonly name: "observedAtNs";
    }, {
        readonly type: "uint64";
        readonly name: "validUntilNs";
    }];
}, {
    readonly name: "tryGetMarkPrice";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "ok";
    }, {
        readonly type: "uint256";
        readonly name: "price";
    }];
}, {
    readonly name: "getOrderBookParameters";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "tickSize";
        }, {
            readonly type: "uint256";
            readonly name: "minQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "lotSize";
        }];
    }];
}, {
    readonly name: "getPerpPoolParameters";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "initialMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "maintenanceMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "closeOutMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "maxOpenInterest";
        }, {
            readonly type: "uint256";
            readonly name: "maxPositionSize";
        }, {
            readonly type: "uint256";
            readonly name: "takerFeeBpsTimes1k";
        }, {
            readonly type: "int256";
            readonly name: "makerFeeBpsTimes1k";
        }, {
            readonly type: "uint256";
            readonly name: "insuranceFundShareBps";
        }];
    }];
}, {
    readonly name: "getEffectiveIMF";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getHealthSnapshot";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "oneBase";
        }, {
            readonly type: "uint256";
            readonly name: "markPrice";
        }, {
            readonly type: "int256";
            readonly name: "projectedCumulativeFunding";
        }, {
            readonly type: "uint256";
            readonly name: "effectiveIMFBps";
        }, {
            readonly type: "uint256";
            readonly name: "maintenanceMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "closeOutMarginBps";
        }];
        readonly name: "snapshot";
    }];
}, {
    readonly name: "tryGetHealthSnapshot";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "ok";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "oneBase";
        }, {
            readonly type: "uint256";
            readonly name: "markPrice";
        }, {
            readonly type: "int256";
            readonly name: "projectedCumulativeFunding";
        }, {
            readonly type: "uint256";
            readonly name: "effectiveIMFBps";
        }, {
            readonly type: "uint256";
            readonly name: "maintenanceMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "closeOutMarginBps";
        }];
        readonly name: "snapshot";
    }];
}, {
    readonly name: "getReducingCapacity";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "int128";
            readonly name: "positionSize";
        }, {
            readonly type: "uint256";
            readonly name: "pendingBidQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "pendingAskQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "pendingOppositeQuantity";
        }, {
            readonly type: "uint256";
            readonly name: "effectiveReducingCapacity";
        }];
        readonly name: "capacity";
    }];
}, {
    readonly name: "isRestricted";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getMarketStatus";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
}];
export declare const perpPoolFactoryReadAbi: readonly [{
    readonly name: "getPerpPools";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
}, {
    readonly name: "perpPoolCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getBaseTokenForPool";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "getPoolForBaseToken";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "baseToken";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "isDeployedByFactory";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "supportsInterface";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes4";
        readonly name: "interfaceId";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getPerpPoolStatuses";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "perpPool";
        }, {
            readonly type: "address";
            readonly name: "baseToken";
        }, {
            readonly type: "bool";
            readonly name: "restricted";
        }];
        readonly name: "statuses";
    }];
}, {
    readonly name: "getUnrestrictedPerpPools";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address[]";
        readonly name: "perpPools";
    }];
}, {
    readonly name: "getRestrictedPerpPools";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address[]";
        readonly name: "perpPools";
    }];
}, {
    readonly name: "getStopOrderRegistry";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "stopOrderRegistry";
    }];
}];
export declare const marginBankReadAbi: readonly [{
    readonly name: "getSystemConfig";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "marginBank";
        }, {
            readonly type: "address";
            readonly name: "collateralToken";
        }, {
            readonly type: "address";
            readonly name: "perpPoolFactory";
        }, {
            readonly type: "address";
            readonly name: "liquidationEngine";
        }, {
            readonly type: "address";
            readonly name: "insuranceFund";
        }, {
            readonly type: "address";
            readonly name: "feeRecipient";
        }, {
            readonly type: "uint16";
            readonly name: "maxLeverageLimit";
        }, {
            readonly type: "bool";
            readonly name: "fullyWired";
        }];
    }];
}, {
    readonly name: "getPosition";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "int128";
            readonly name: "size";
        }, {
            readonly type: "uint128";
            readonly name: "avgEntryPrice";
        }, {
            readonly type: "int256";
            readonly name: "entryFundingIndex";
        }, {
            readonly type: "uint64";
            readonly name: "lastUpdatedTimestampNs";
        }];
    }];
}, {
    readonly name: "getAccountState";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "int256";
            readonly name: "unlockedCollateralBalance";
        }, {
            readonly type: "uint256";
            readonly name: "lockedCollateral";
        }, {
            readonly type: "address[]";
            readonly name: "activePerpPools";
        }];
    }];
}, {
    readonly name: "getAccountEquity";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "int256";
    }];
}, {
    readonly name: "getWithdrawableCollateral";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getActivePerpPools";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
}, {
    readonly name: "getAccountHealth";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "int256";
        readonly name: "equity";
    }, {
        readonly type: "uint256";
        readonly name: "imReq";
    }, {
        readonly type: "uint256";
        readonly name: "mmReq";
    }, {
        readonly type: "uint256";
        readonly name: "cmReq";
    }];
}, {
    readonly name: "getMarginStatus";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
}, {
    readonly name: "tryGetAccountEquity";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "ok";
    }, {
        readonly type: "int256";
        readonly name: "equity";
    }];
}, {
    readonly name: "getCollateralBasis";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getInsuranceFundAddress";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "isInsuranceFundCoverageEnabled";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getPoolTier";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "quoteMeetsIMForOrder";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "perpPool";
    }, {
        readonly type: "uint256";
        readonly name: "additionalSize";
    }, {
        readonly type: "uint256";
        readonly name: "orderPrice";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "meetsIMForFill";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "perpPool";
    }, {
        readonly type: "uint256";
        readonly name: "additionalSize";
    }, {
        readonly type: "uint256";
        readonly name: "orderPrice";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "quoteOrderTopUp";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "perpPool";
    }, {
        readonly type: "uint256";
        readonly name: "lockAmount";
    }, {
        readonly type: "uint256";
        readonly name: "feeHeadroom";
    }, {
        readonly type: "uint256";
        readonly name: "increasingQuantity";
    }, {
        readonly type: "uint256";
        readonly name: "orderPrice";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "topUp";
    }];
}, {
    readonly name: "isolationAllowsMarket";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "market";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "isolated";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getMaxLeverage";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "uint16";
    }];
}, {
    readonly name: "getMaxLeverageLimit";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint16";
    }];
}, {
    readonly name: "getCreditFloor";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getVoucherLeverageCap";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint16";
    }];
}, {
    readonly name: "isVoucherMarketAllowed";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getCreditGranter";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "isPerpPoolRegistered";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getSideHoldersPaginated";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "bool";
        readonly name: "isLong";
    }, {
        readonly type: "uint256";
        readonly name: "start";
    }, {
        readonly type: "uint256";
        readonly name: "count";
    }];
    readonly outputs: readonly [{
        readonly type: "address[]";
        readonly name: "holders";
    }];
}, {
    readonly name: "getSideHolderStatesPaginated";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "bool";
        readonly name: "isLong";
    }, {
        readonly type: "uint256";
        readonly name: "start";
    }, {
        readonly type: "uint256";
        readonly name: "count";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "account";
        }, {
            readonly type: "bool";
            readonly name: "priceable";
        }, {
            readonly type: "uint8";
            readonly name: "status";
        }, {
            readonly type: "int256";
            readonly name: "equity";
        }, {
            readonly type: "uint256";
            readonly name: "imReq";
        }, {
            readonly type: "uint256";
            readonly name: "mmReq";
        }, {
            readonly type: "uint256";
            readonly name: "cmReq";
        }, {
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "int128";
                readonly name: "size";
            }, {
                readonly type: "uint128";
                readonly name: "avgEntryPrice";
            }, {
                readonly type: "int256";
                readonly name: "entryFundingIndex";
            }, {
                readonly type: "uint64";
                readonly name: "lastUpdatedTimestampNs";
            }];
            readonly name: "position";
        }, {
            readonly type: "int256";
            readonly name: "unlockedCollateralBalance";
        }, {
            readonly type: "uint256";
            readonly name: "lockedCollateral";
        }];
        readonly name: "states";
    }, {
        readonly type: "uint256";
        readonly name: "listLength";
    }, {
        readonly type: "bool";
        readonly name: "poolPriceable";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "oneBase";
        }, {
            readonly type: "uint256";
            readonly name: "markPrice";
        }, {
            readonly type: "int256";
            readonly name: "projectedCumulativeFunding";
        }, {
            readonly type: "uint256";
            readonly name: "effectiveIMFBps";
        }, {
            readonly type: "uint256";
            readonly name: "maintenanceMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "closeOutMarginBps";
        }, {
            readonly type: "uint256";
            readonly name: "staticIMFBps";
        }];
        readonly name: "poolSnapshot";
    }];
}, {
    readonly name: "getBankruptcyPrice";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }, {
        readonly type: "address";
        readonly name: "perpPool";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "price";
    }];
}, {
    readonly name: "NoOpenPosition";
    readonly type: "error";
    readonly inputs: readonly [];
}, {
    readonly name: "AdlZeroNotional";
    readonly type: "error";
    readonly inputs: readonly [];
}, {
    readonly name: "getLeverageImSurcharge";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "quoteFundingPayer";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "payer";
    }];
}, {
    readonly name: "quoteWalletCapacity";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "wallet";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getMainFundedPrincipal";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getMainFundingPayer";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "getLinkedWalletRegistry";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const linkedWalletRegistryReadAbi: readonly [{
    readonly name: "mainOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "wallet";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "childrenOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "main";
    }];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
}, {
    readonly name: "groupOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "wallet";
    }];
    readonly outputs: readonly [{
        readonly type: "address[]";
        readonly name: "group";
    }];
}, {
    readonly name: "areLinked";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "a";
    }, {
        readonly type: "address";
        readonly name: "b";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "linkageOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "wallet";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "main";
        }, {
            readonly type: "address[]";
            readonly name: "members";
        }, {
            readonly type: "uint64";
            readonly name: "linkedAt";
        }, {
            readonly type: "uint64";
            readonly name: "maturesAt";
        }];
        readonly name: "linkage";
    }];
}, {
    readonly name: "linkedAtOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "child";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "linkMaturitySeconds";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "maxChildren";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const voucherDistributorReadAbi: readonly [{
    readonly name: "getConfig";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "marginBank";
        }, {
            readonly type: "address";
            readonly name: "collateralToken";
        }, {
            readonly type: "uint256";
            readonly name: "grantAmount";
        }, {
            readonly type: "uint64";
            readonly name: "expiryDuration";
        }, {
            readonly type: "uint64";
            readonly name: "campaignStart";
        }, {
            readonly type: "uint64";
            readonly name: "campaignEnd";
        }];
        readonly name: "config";
    }];
}, {
    readonly name: "budgetRemaining";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "isClaimed";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "claimant";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "voucherExpiryOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}];
export declare const insuranceFundReadAbi: readonly [{
    readonly name: "getMaxTiers";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getTotalTierBalances";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getTierBalance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "tier";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getPoolCountForTier";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "tier";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getTierForPool";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const liquidationEngineReadAbi: readonly [{
    readonly name: "isLiquidatable";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "account";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "getMarginBank";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "getBidderCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getBidders";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
}, {
    readonly name: "getLiquidationPenaltyBps";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getMinLiquidationSpreadBps";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getMaxLiquidationSpreadBps";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getMaxLiquidationVolumePerBlock";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getLiquidationVolumeForBlock";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "blockNumber";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getAdlRanker";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "getMaxAdlScanPerCall";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getLinkedWalletRegistry";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const adlRankerReadAbi: readonly [{
    readonly name: "rank";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "bankrupt";
    }, {
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "account";
        }, {
            readonly type: "address";
            readonly name: "perpPool";
        }, {
            readonly type: "int128";
            readonly name: "size";
        }, {
            readonly type: "uint128";
            readonly name: "entryPrice";
        }, {
            readonly type: "uint256";
            readonly name: "markPrice";
        }, {
            readonly type: "int256";
            readonly name: "accountEquity";
        }];
        readonly name: "candidates";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256[]";
        readonly name: "ordering";
    }];
}];
export declare const erc20VaultReadAbi: readonly [{
    readonly name: "getWithdrawableBalance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "token";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
