/**
 *  OracleHub function ABI (writes + point-status views) — mirrors
 *  `smart-contracts/src/adapters/OracleHub.sol` exactly. Backs the
 *  `OracleHubAdmin` writes and the standalone oracleHub.ts reads.
 *
 * @category ABIs
 */
export declare const oracleHubAbi: readonly [{
    readonly name: "scheduleQuestion";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "string";
            readonly name: "questionText";
        }, {
            readonly type: "tuple[]";
            readonly components: readonly [{
                readonly type: "uint8";
                readonly name: "sourceType";
            }, {
                readonly type: "bytes";
                readonly name: "params";
            }];
            readonly name: "sources";
        }, {
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "uint8";
                readonly name: "answerType";
            }, {
                readonly type: "string[]";
                readonly name: "discreteOutcomes";
            }, {
                readonly type: "tuple[]";
                readonly components: readonly [{
                    readonly type: "int256";
                    readonly name: "low";
                }, {
                    readonly type: "int256";
                    readonly name: "high";
                }];
                readonly name: "numericIntervals";
            }, {
                readonly type: "uint64";
                readonly name: "numericDecimals";
            }];
            readonly name: "validAnswers";
        }, {
            readonly type: "uint256";
            readonly name: "resolutionTime";
        }, {
            readonly type: "uint256";
            readonly name: "minAgreement";
        }, {
            readonly type: "uint256";
            readonly name: "subcommitteeSize";
        }, {
            readonly type: "uint256";
            readonly name: "subcommitteeThreshold";
        }];
        readonly name: "def";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
}, {
    readonly name: "getSchedulingCost";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "string";
            readonly name: "questionText";
        }, {
            readonly type: "tuple[]";
            readonly components: readonly [{
                readonly type: "uint8";
                readonly name: "sourceType";
            }, {
                readonly type: "bytes";
                readonly name: "params";
            }];
            readonly name: "sources";
        }, {
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "uint8";
                readonly name: "answerType";
            }, {
                readonly type: "string[]";
                readonly name: "discreteOutcomes";
            }, {
                readonly type: "tuple[]";
                readonly components: readonly [{
                    readonly type: "int256";
                    readonly name: "low";
                }, {
                    readonly type: "int256";
                    readonly name: "high";
                }];
                readonly name: "numericIntervals";
            }, {
                readonly type: "uint64";
                readonly name: "numericDecimals";
            }];
            readonly name: "validAnswers";
        }, {
            readonly type: "uint256";
            readonly name: "resolutionTime";
        }, {
            readonly type: "uint256";
            readonly name: "minAgreement";
        }, {
            readonly type: "uint256";
            readonly name: "subcommitteeSize";
        }, {
            readonly type: "uint256";
            readonly name: "subcommitteeThreshold";
        }];
        readonly name: "def";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "cost";
    }];
}, {
    readonly name: "questionKeyOf";
    readonly type: "function";
    readonly stateMutability: "pure";
    readonly inputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "string";
            readonly name: "questionText";
        }, {
            readonly type: "tuple[]";
            readonly components: readonly [{
                readonly type: "uint8";
                readonly name: "sourceType";
            }, {
                readonly type: "bytes";
                readonly name: "params";
            }];
            readonly name: "sources";
        }, {
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "uint8";
                readonly name: "answerType";
            }, {
                readonly type: "string[]";
                readonly name: "discreteOutcomes";
            }, {
                readonly type: "tuple[]";
                readonly components: readonly [{
                    readonly type: "int256";
                    readonly name: "low";
                }, {
                    readonly type: "int256";
                    readonly name: "high";
                }];
                readonly name: "numericIntervals";
            }, {
                readonly type: "uint64";
                readonly name: "numericDecimals";
            }];
            readonly name: "validAnswers";
        }, {
            readonly type: "uint256";
            readonly name: "resolutionTime";
        }, {
            readonly type: "uint256";
            readonly name: "minAgreement";
        }, {
            readonly type: "uint256";
            readonly name: "subcommitteeSize";
        }, {
            readonly type: "uint256";
            readonly name: "subcommitteeThreshold";
        }];
        readonly name: "def";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes32";
        readonly name: "key";
    }];
}, {
    readonly name: "withdraw";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "resolveReserve";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "reserve";
    }];
}, {
    readonly name: "earmarkedOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "locked";
    }];
}, {
    readonly name: "creditOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "balance";
    }];
}, {
    readonly name: "outstandingOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "count";
    }];
}, {
    readonly name: "withdrawableOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "payerCreditOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "payer";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "payerOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "payer";
    }];
}, {
    readonly name: "withdrawMyCredit";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "operatorOf";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
    }];
}, {
    readonly name: "reservedFor";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "reserve";
    }];
}, {
    readonly name: "bindCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint32";
        readonly name: "count";
    }];
}, {
    readonly name: "marketsForQuestion";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes32[]";
        readonly name: "markets";
    }];
}, {
    readonly name: "questionIdByKey";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "questionKey";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
}, {
    readonly name: "pendingResolves";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "remaining";
    }];
}, {
    readonly name: "continuationSubId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "MAX_BINDS_PER_QUESTION";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint32";
    }];
}, {
    readonly name: "getSlotCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint8";
        readonly name: "slotCount";
    }];
}, {
    readonly name: "pullAnswer";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint8";
        readonly name: "outcomeIdx";
    }, {
        readonly type: "bool";
        readonly name: "voided";
    }];
}, {
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
    readonly name: "setGasParams";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint64";
        readonly name: "priorityFeePerGas";
    }, {
        readonly type: "uint64";
        readonly name: "maxFeePerGas";
    }, {
        readonly type: "uint64";
        readonly name: "gasLimit";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setDrainParams";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint64";
        readonly name: "perMarketResolveGas";
    }, {
        readonly type: "uint64";
        readonly name: "callbackBaseGas";
    }, {
        readonly type: "uint32";
        readonly name: "maxResolvesPerCallback";
    }, {
        readonly type: "uint64";
        readonly name: "resolveGasReserve";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "enableReactivity";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "subId";
    }];
}, {
    readonly name: "migrateSubscription";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "subId";
    }];
}, {
    readonly name: "subscriptionId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "priorityFeePerGas";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "maxFeePerGas";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "gasLimit";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "perMarketResolveGas";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "callbackBaseGas";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "maxResolvesPerCallback";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint32";
    }];
}, {
    readonly name: "resolveGasReserve";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
/**
 *  OracleHub event ABI — decoded from `scheduleQuestion` receipts
 *  (`QuestionScheduled` vs `QuestionReused`) and by keepers reconciling the
 *  §8e exact-metering invariants. Indexed-ness mirrors OracleHub.sol.
 *
 * @category ABIs
 */
export declare const oracleHubEventsAbi: readonly [{
    readonly name: "QuestionScheduled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "questionKey";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "scheduler";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "oracleCost";
    }];
}, {
    readonly name: "QuestionReused";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "questionKey";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "scheduler";
        readonly indexed: true;
    }];
}, {
    readonly name: "QuestionCapSplit";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "questionKey";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "supersededQuestionId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "newQuestionId";
        readonly indexed: true;
    }];
}, {
    readonly name: "ReserveEarmarked";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "SurplusCredited";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "CreditWithdrawn";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "to";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "PayerSurplusCredited";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "payer";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "PayerCreditWithdrawn";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "payer";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "to";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "MarketBound";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "bindCount";
    }];
}, {
    readonly name: "MarketResolveCharged";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "marketId";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "measuredGas";
    }, {
        readonly type: "uint256";
        readonly name: "overheadShare";
    }, {
        readonly type: "uint256";
        readonly name: "cost";
    }, {
        readonly type: "uint256";
        readonly name: "charged";
    }];
}, {
    readonly name: "AnswerDelivered";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "oracleQuestionId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "marketId";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "payoutDenominator";
    }, {
        readonly type: "uint256[]";
        readonly name: "payoutNumerators";
    }, {
        readonly type: "bool";
        readonly name: "voided";
    }];
}, {
    readonly name: "CallbackAccounted";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "marketsResolved";
    }, {
        readonly type: "uint256";
        readonly name: "gasPrice";
    }, {
        readonly type: "uint256";
        readonly name: "measuredGas";
    }, {
        readonly type: "uint256";
        readonly name: "overheadGasAttributed";
    }, {
        readonly type: "uint256";
        readonly name: "totalCost";
    }, {
        readonly type: "uint256";
        readonly name: "totalCharged";
    }, {
        readonly type: "uint256";
        readonly name: "subsidy";
    }, {
        readonly type: "uint256";
        readonly name: "pendingRemaining";
    }];
}, {
    readonly name: "DrainContinuation";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "subscriptionId";
    }, {
        readonly type: "uint256";
        readonly name: "pendingRemaining";
    }];
}, {
    readonly name: "Deposited";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "from";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
        readonly indexed: true;
    }];
}, {
    readonly name: "GasParamsUpdated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint64";
        readonly name: "priorityFeePerGas";
        readonly indexed: true;
    }, {
        readonly type: "uint64";
        readonly name: "maxFeePerGas";
        readonly indexed: true;
    }, {
        readonly type: "uint64";
        readonly name: "gasLimit";
        readonly indexed: true;
    }];
}, {
    readonly name: "DrainParamsUpdated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint64";
        readonly name: "perMarketResolveGas";
    }, {
        readonly type: "uint64";
        readonly name: "callbackBaseGas";
    }, {
        readonly type: "uint32";
        readonly name: "maxResolvesPerCallback";
    }, {
        readonly type: "uint64";
        readonly name: "resolveGasReserve";
    }];
}];
export declare const marketCreatorFactoryAbi: readonly [{
    readonly name: "createMarketCreator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "owner";
    }, {
        readonly type: "address";
        readonly name: "core";
    }, {
        readonly type: "address";
        readonly name: "adapter";
    }, {
        readonly type: "uint32";
        readonly name: "operatorId";
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
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
        readonly name: "defaultBookParams";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
    }, {
        readonly type: "address";
        readonly name: "policy";
    }];
}, {
    readonly name: "creators";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "index";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "creatorCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "creatorsPaged";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "offset";
    }, {
        readonly type: "uint256";
        readonly name: "limit";
    }];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
}];
export declare const marketCreatorFactoryEventsAbi: readonly [{
    readonly name: "MarketCreatorCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "owner";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "operatorId";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "venueId";
    }, {
        readonly type: "address";
        readonly name: "policy";
    }, {
        readonly type: "address";
        readonly name: "core";
    }, {
        readonly type: "address";
        readonly name: "adapter";
    }];
}];
export declare const marketCreatorAbi: readonly [{
    readonly name: "registerSeries";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "collateral";
        }, {
            readonly type: "string";
            readonly name: "asset";
        }, {
            readonly type: "uint64";
            readonly name: "numericDecimals";
        }, {
            readonly type: "uint64";
            readonly name: "intervalSec";
        }, {
            readonly type: "uint64";
            readonly name: "settlementWindow";
        }];
        readonly name: "s";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "triggerRoll";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "armFirstRoll";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }, {
        readonly type: "uint256";
        readonly name: "firesAtSec";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "reclaimOracleCredit";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "reclaimed";
    }];
}, {
    readonly name: "withdrawNative";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "to";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelSubscription";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "firesAtSec";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "firstRollArmed";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
        readonly name: "armed";
    }];
}, {
    readonly name: "latestExpiryBySeriesId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
        readonly name: "expiry";
    }];
}, {
    readonly name: "armedBoundary";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "marketCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "setReactivityGasParams";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint64";
        readonly name: "priorityFeePerGas";
    }, {
        readonly type: "uint64";
        readonly name: "maxFeePerGas";
    }, {
        readonly type: "uint64";
        readonly name: "gasLimit";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "seriesById";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "collateral";
    }, {
        readonly type: "string";
        readonly name: "asset";
    }, {
        readonly type: "uint64";
        readonly name: "numericDecimals";
    }, {
        readonly type: "uint64";
        readonly name: "intervalSec";
    }, {
        readonly type: "uint64";
        readonly name: "settlementWindow";
    }];
}, {
    readonly name: "core";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "adapter";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "operatorId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint32";
    }];
}, {
    readonly name: "venueId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bytes32";
    }];
}, {
    readonly name: "defaultBookParams";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "tickSize";
    }, {
        readonly type: "uint256";
        readonly name: "minQuantity";
    }, {
        readonly type: "uint256";
        readonly name: "lotSize";
    }];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const marketCreatorV2Abi: readonly [{
    readonly name: "registerSeries";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }, {
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "collateral";
        }, {
            readonly type: "string";
            readonly name: "asset";
        }, {
            readonly type: "uint64";
            readonly name: "numericDecimals";
        }, {
            readonly type: "uint64";
            readonly name: "intervalSec";
        }, {
            readonly type: "uint64";
            readonly name: "settlementWindow";
        }];
        readonly name: "s";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "armFirstRoll";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }, {
        readonly type: "uint256";
        readonly name: "firesAtSec";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "recoverSeries";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "lastPermissionlessRecoveryAt";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
        readonly name: "t";
    }];
}, {
    readonly name: "reclaimOracleCredit";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "reclaimed";
    }];
}, {
    readonly name: "withdrawNative";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "to";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancelSubscriptions";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}, {
    readonly name: "adoptFrom";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "old";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "handoffTo";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "successor";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "migratedFrom";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "adoptedBy";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "retired";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "latestExpiryBySeriesId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
        readonly name: "expiry";
    }];
}, {
    readonly name: "marketCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "setReactivityGasParams";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint64";
        readonly name: "priorityFeePerGas";
    }, {
        readonly type: "uint64";
        readonly name: "maxFeePerGas";
    }, {
        readonly type: "uint64";
        readonly name: "gasLimit";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "seriesById";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
        readonly name: "collateral";
    }, {
        readonly type: "string";
        readonly name: "asset";
    }, {
        readonly type: "uint64";
        readonly name: "numericDecimals";
    }, {
        readonly type: "uint64";
        readonly name: "intervalSec";
    }, {
        readonly type: "uint64";
        readonly name: "settlementWindow";
    }];
}, {
    readonly name: "referenceQidBySeries";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "qid";
    }];
}, {
    readonly name: "seriesByPendingQid";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "qid";
    }];
    readonly outputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
}, {
    readonly name: "pendingExpiryBySeries";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
        readonly name: "expiry";
    }];
}, {
    readonly name: "firstRollBoundaryBySeries";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "seriesId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint64";
        readonly name: "firesAtSec";
    }];
}, {
    readonly name: "answerSubId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "backstopSubId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "core";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "adapter";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "operatorId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint32";
    }];
}, {
    readonly name: "venueId";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bytes32";
    }];
}, {
    readonly name: "defaultBookParams";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
        readonly name: "tickSize";
    }, {
        readonly type: "uint256";
        readonly name: "minQuantity";
    }, {
        readonly type: "uint256";
        readonly name: "lotSize";
    }];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const marketCreatorPolicyAbi: readonly [{
    readonly name: "approved";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "setCreator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "creator";
    }, {
        readonly type: "bool";
        readonly name: "allowed";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "swapCreator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "from";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const moduleGovernanceAbi: readonly [{
    readonly name: "setAdapterApproved";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "adapter";
    }, {
        readonly type: "bool";
        readonly name: "approved";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "approvedAdapters";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "adapter";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
export declare const moduleGovernanceEventsAbi: readonly [{
    readonly name: "AdapterApproved";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "adapter";
        readonly indexed: true;
    }, {
        readonly type: "bool";
        readonly name: "approved";
        readonly indexed: true;
    }];
}];
