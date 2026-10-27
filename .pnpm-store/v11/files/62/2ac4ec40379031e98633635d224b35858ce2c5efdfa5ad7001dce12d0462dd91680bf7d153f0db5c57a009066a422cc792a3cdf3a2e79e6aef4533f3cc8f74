/**
 * Order lifecycle events shared by SpotPool + BinaryPool (the OrderBook base).
 *
 * @category ABIs
 */
export declare const orderBookEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "OrderPlaced";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "placedOrder";
        readonly type: "tuple";
        readonly indexed: false;
        readonly components: readonly [{
            readonly name: "orderId";
            readonly type: "uint128";
        }, {
            readonly name: "isBid";
            readonly type: "bool";
        }, {
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly name: "userData";
            readonly type: "uint64";
        }, {
            readonly name: "price";
            readonly type: "uint256";
        }, {
            readonly name: "fullQuantity";
            readonly type: "uint256";
        }, {
            readonly name: "quantityRemaining";
            readonly type: "uint256";
        }, {
            readonly name: "expireTimestampNs";
            readonly type: "uint64";
        }];
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderRested";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderCancelled";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderExpired";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderReduced";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "newQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderFilled";
    readonly inputs: readonly [{
        readonly name: "takerOrderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "makerOrderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "quantityFilled";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "takerRemainingQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "makerRemainingQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "fillPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderCancelledSelfMatch";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MakerOrderCancelledExceedsPosition";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderCancelledPreFill";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}];
/** SpotPool-only events the live tail materializes (mark price + book params). */
export declare const spotPoolEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "MarkPriceUpdated";
    readonly inputs: readonly [{
        readonly name: "asset";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "markPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "rawMidpoint";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderBookParametersUpdated";
    readonly inputs: readonly [{
        readonly name: "newParameters";
        readonly type: "tuple";
        readonly indexed: false;
        readonly components: readonly [{
            readonly name: "tickSize";
            readonly type: "uint256";
        }, {
            readonly name: "minQuantity";
            readonly type: "uint256";
        }, {
            readonly name: "lotSize";
            readonly type: "uint256";
        }];
    }];
    readonly anonymous: false;
}];
/**
 *  PerpPool-only events the live tail materializes (funding + open interest).
 *  Signatures verified against the DEPLOYED implementation's runtime bytecode, not
 *  against a source tree — the claim they previously carried ("mirror IPerpPool exactly,
 *  deployed testnet implementation") was false for both events here, and being false in a
 *  comment is how it survived: a wrong arity is a different topic0, so `watchEvent`
 *  filtered on something no pool ever emitted and the live funding tail silently never
 *  fired. `mise run verify:abis` in the indexer package is what now checks this class of
 *  claim mechanically.
 */
export declare const perpPoolEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "FundingUpdated";
    readonly inputs: readonly [{
        readonly name: "fundingRate";
        readonly type: "int256";
        readonly indexed: false;
    }, {
        readonly name: "cumulativeFundingPerUnit";
        readonly type: "int256";
        readonly indexed: false;
    }, {
        readonly name: "indexPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "intervalsSettled";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "markPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OpenInterestUpdated";
    readonly inputs: readonly [{
        readonly name: "openInterest";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MakerOrderCancelledNegativeEquity";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MakerOrderCancelledStaleMark";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}];
/**
 *  The published MarginBank event ABI — every fragment, in one const.
 *
 * @category ABIs
 */
export declare const marginBankEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "PositionUpdated";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newSize";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "avgEntryPrice";
        readonly type: "uint128";
        readonly indexed: false;
    }, {
        readonly name: "realizedPnl";
        readonly type: "int256";
        readonly indexed: false;
    }, {
        readonly name: "entryFundingIndex";
        readonly type: "int256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "FundingSettled";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "payment";
        readonly type: "int256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Deposited";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "DepositedFor";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Withdrawn";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CollateralLocked";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CollateralUnlocked";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "FeeCharged";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "insurancePortion";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "RebatePaid";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AutoDeleveraged";
    readonly inputs: readonly [{
        readonly name: "counterparty";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "bankrupt";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "sizeReduced";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "bankruptcyPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CloseOutMarginSettled";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "BadDebtAbsorbed";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "badDebt";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "covered";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "absorbedBy";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionTransferred";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "size";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "collateralTransferred";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationOrderPanicked";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "panicCode";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MainFundedChild";
    readonly inputs: readonly [{
        readonly name: "child";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "payer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "outstandingPrincipal";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "IsolatedModeSet";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "enabled";
        readonly type: "bool";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MaxLeverageSet";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "leverageX";
        readonly type: "uint16";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "BuilderFeeCharged";
    readonly inputs: readonly [{
        readonly name: "payer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "builder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
/**
 *  LiquidationEngine events — the liquidation waterfall. Also a singleton, and the
 *  waterfall is SPLIT with MarginBank: the engine emits the stages and their costs,
 *  while the settlement legs (`AutoDeleveraged`, `CloseOutMarginSettled`,
 *  `BadDebtAbsorbed`, `PositionTransferred`) land on `marginBankEventsAbi` above.
 *  A consumer that wants the whole story needs both ABIs.
 *
 *  Account-level events carry NO pool: `AccountLiquidated` covers every position the
 *  stage walked, and the residual/ADL-shortfall events describe the account's hole.
 *  Only the per-position events are pool-scoped, which is why a per-pool liquidation
 *  filter is lossy.
 *
 *  Owner-parameter `*Updated` events, bidder registration, and the scan-progress
 *  checkpoints (`AdlScanCheckpointed`, `AdlNoBadDebtToSocialize`) are out: they are
 *  keeper mechanics, not account outcomes.
 *
 *  Generated from `indexer/abis/LiquidationEngine.json` and pinned by topic0 in
 *  `test/perpEventsAbi.test.ts`.
 *
 * @category ABIs
 */
export declare const liquidationEngineEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "AccountLiquidated";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "positionsProcessed";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "stageReached";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "marginStatusBefore";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "marginStatusAfter";
        readonly type: "uint8";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionLiquidated";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "sizeDelta";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "markPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionSkippedBelowMinQuantity";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "size";
        readonly type: "int128";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionTakenOver";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "bidder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "size";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "takeoverPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationFeeCharged";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "tier";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "fillNotional";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationKeeperRewardPaid";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "keeper";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationThrottled";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "blockVolume";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "volumeCap";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "ResidualBadDebt";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residual";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "ResidualBackedByOpenPnl";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residual";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "equity";
        readonly type: "int256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CoverageDeclinedByEquityCap";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "declined";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "tiers";
        readonly type: "uint256[]";
        readonly indexed: false;
    }, {
        readonly name: "losses";
        readonly type: "uint256[]";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AdlCapacityShortfall";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residualSize";
        readonly type: "uint128";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AdlPriceCapacityExhausted";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residual";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AdlSessionDiscarded";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "absorbed";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "reason";
        readonly type: "uint8";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}];
/**
 *  MarketCreator factory event (13 fields) — live discovery of new binary
 *  markets created through the rolling-series creator, so the tail's watch set
 *  grows without re-touching the indexer.
 */
export declare const marketCreatorEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "MarketCreated";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "market";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "yesId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "noId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "collateral";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "asset";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "strike";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "tradingStart";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "expiry";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "oracleQuestionId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "question";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "intervalSec";
        readonly type: "uint64";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
/**
 *  BinaryMarketsModule creation event (19 fields, different topic0 from the
 *  MarketCreator's) — EVERY market fires this (the module emits inside
 *  `createMarket`, whether called directly or via a wrapping MarketCreator), and
 *  it is the only creation event carrying the (operatorId, venueId) origin
 *  attribution. Watched alongside the MarketCreator in discovery mode so
 *  module-created markets join `watchAllMarkets(discover: true)` live.
 *  Signature mirrors smart-contracts BinaryMarketsModule exactly.
 */
export declare const binaryModuleEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "MarketCreated";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "market";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "oracleQuestionId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "operatorId";
        readonly type: "uint32";
        readonly indexed: false;
    }, {
        readonly name: "venueId";
        readonly type: "bytes32";
        readonly indexed: false;
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "collateral";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "yesId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "noId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "nonce";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "outcomeSlotCount";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "marketType";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "tradingStart";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "expiry";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "voidPolicy";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "asset";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "strike";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "question";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "context";
        readonly type: "bytes";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MarketFinalized";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PoolReleased";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}];
/**
 *  BinaryPool v2 side-attribution + lifecycle events (settlement-extraction).
 *  `BinaryOrderPlaced(orderId, kind)` fires alongside every `OrderPlaced` on a
 *  binary pool — the ONLY authoritative side source (v2 stopped encoding the side
 *  in userData). `PoolFinalized` sweeps the pool's backing to settlement (→ pool
 *  backing 0). `PoolRecycled` re-points the pool at a fresh market (new nonce).
 *  Signatures mirror IBinaryPool exactly.
 */
export declare const binaryPoolEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "BinaryOrderPlaced";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "kind";
        readonly type: "uint8";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PoolFinalized";
    readonly inputs: readonly [{
        readonly name: "marketNonce";
        readonly type: "uint64";
        readonly indexed: true;
    }, {
        readonly name: "backing";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PoolRecycled";
    readonly inputs: readonly [{
        readonly name: "marketNonce";
        readonly type: "uint64";
        readonly indexed: true;
    }, {
        readonly name: "market";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}];
/**
 *  BinarySettlement singleton events (settlement-extraction v2) — the permanent
 *  redemption home. `MarketFinalized` records a market's net backing;
 *  `SettlementFeeCharged` the one-time fee skim; `Redeemed` a payout (debits the
 *  settlement record's backing — NOTE the v2 signature carries `marketKey` +
 *  separate `holder`/`to`, unlike the removed v1 pool `Redeemed`); `PayoutOwed`
 *  the push-fallback booking; `OwedClaimed` the later claim. Signatures mirror
 *  IBinarySettlement exactly.
 */
export declare const binarySettlementEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "MarketFinalized";
    readonly inputs: readonly [{
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "nonce";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "collateralToken";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "netBacking";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "voided";
        readonly type: "bool";
        readonly indexed: false;
    }, {
        readonly name: "payoutNumerators";
        readonly type: "uint256[]";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "SettlementFeeCharged";
    readonly inputs: readonly [{
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "feeRecipient";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "grossBacking";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "fee";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Redeemed";
    readonly inputs: readonly [{
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "holder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "outcomeIdx";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "amountBurned";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "collateralOut";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PayoutOwed";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OwedClaimed";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
/**
 *  BinaryMarket lifecycle events + BinaryPool `backing` events — keep live
 *  status/resolution AND collateral backing current so the tail (not the lagging
 *  indexer) is the authority on trading eligibility and on how much collateral
 *  a market holds. `SetMinted`/`SetBurned`/`Redeemed`/`SettlementFeeCharged`
 *  fire from the BinaryPool (log source = the pool) and drive the same `backing`
 *  running total the Envio indexer maintains (indexer/src/handlers/binary.ts).
 *  Signatures mirror somnia-dex-protocol IBinaryPool exactly.
 */
export declare const binaryMarketEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "StatusChanged";
    readonly inputs: readonly [{
        readonly name: "oldStatus";
        readonly type: "uint8";
        readonly indexed: true;
    }, {
        readonly name: "newStatus";
        readonly type: "uint8";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Resolved";
    readonly inputs: readonly [{
        readonly name: "payoutDenominator";
        readonly type: "uint32";
        readonly indexed: false;
    }, {
        readonly name: "payoutNumerators";
        readonly type: "uint256[]";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Voided";
    readonly inputs: readonly [];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "VoidVector";
    readonly inputs: readonly [{
        readonly name: "payoutNumerators";
        readonly type: "uint256[]";
        readonly indexed: false;
    }, {
        readonly name: "policy";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "source";
        readonly type: "uint8";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "SetMinted";
    readonly inputs: readonly [{
        readonly name: "payer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "yesTo";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "noTo";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "SetBurned";
    readonly inputs: readonly [{
        readonly name: "holder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
/**
 *  Everything the live tail decodes, in one ABI. Event names are disjoint
 *  except `MarketCreated` (MarketCreator 13-field vs BinaryMarketsModule
 *  19-field) and `MarketFinalized` (module vs BinarySettlement) — those have
 *  distinct topic0 hashes, so viem's `decodeEventLog` resolves the right variant
 *  per log. `test/perpPlaneTail.test.ts` pins the disjointness.
 *
 *  The two perp singletons contribute more fragments than the reducer cases: the
 *  liquidation and funding-settlement plane is handled, the per-account position and
 *  margin channel is not yet. Decoding one of those is inert, not wrong — see the
 *  file header — and a block of only those does not commit the store.
 */
export declare const liveEventsAbi: readonly [{
    readonly type: "event";
    readonly name: "OrderPlaced";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "placedOrder";
        readonly type: "tuple";
        readonly indexed: false;
        readonly components: readonly [{
            readonly name: "orderId";
            readonly type: "uint128";
        }, {
            readonly name: "isBid";
            readonly type: "bool";
        }, {
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly name: "userData";
            readonly type: "uint64";
        }, {
            readonly name: "price";
            readonly type: "uint256";
        }, {
            readonly name: "fullQuantity";
            readonly type: "uint256";
        }, {
            readonly name: "quantityRemaining";
            readonly type: "uint256";
        }, {
            readonly name: "expireTimestampNs";
            readonly type: "uint64";
        }];
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderRested";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderCancelled";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderExpired";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderReduced";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "newQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderFilled";
    readonly inputs: readonly [{
        readonly name: "takerOrderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "makerOrderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "quantityFilled";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "takerRemainingQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "makerRemainingQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "fillPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderCancelledSelfMatch";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MakerOrderCancelledExceedsPosition";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderCancelledPreFill";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderAmendedInPlace";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "userData";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "price";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "fullQuantity";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "expireTimestampNs";
        readonly type: "uint64";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MarkPriceUpdated";
    readonly inputs: readonly [{
        readonly name: "asset";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "markPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "rawMidpoint";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OrderBookParametersUpdated";
    readonly inputs: readonly [{
        readonly name: "newParameters";
        readonly type: "tuple";
        readonly indexed: false;
        readonly components: readonly [{
            readonly name: "tickSize";
            readonly type: "uint256";
        }, {
            readonly name: "minQuantity";
            readonly type: "uint256";
        }, {
            readonly name: "lotSize";
            readonly type: "uint256";
        }];
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "FundingUpdated";
    readonly inputs: readonly [{
        readonly name: "fundingRate";
        readonly type: "int256";
        readonly indexed: false;
    }, {
        readonly name: "cumulativeFundingPerUnit";
        readonly type: "int256";
        readonly indexed: false;
    }, {
        readonly name: "indexPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "intervalsSettled";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "markPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OpenInterestUpdated";
    readonly inputs: readonly [{
        readonly name: "openInterest";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MakerOrderCancelledNegativeEquity";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MakerOrderCancelledStaleMark";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionUpdated";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "newSize";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "avgEntryPrice";
        readonly type: "uint128";
        readonly indexed: false;
    }, {
        readonly name: "realizedPnl";
        readonly type: "int256";
        readonly indexed: false;
    }, {
        readonly name: "entryFundingIndex";
        readonly type: "int256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "FundingSettled";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "payment";
        readonly type: "int256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Deposited";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "DepositedFor";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Withdrawn";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CollateralLocked";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CollateralUnlocked";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "FeeCharged";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "insurancePortion";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "RebatePaid";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AutoDeleveraged";
    readonly inputs: readonly [{
        readonly name: "counterparty";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "bankrupt";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "sizeReduced";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "bankruptcyPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CloseOutMarginSettled";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "BadDebtAbsorbed";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "badDebt";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "covered";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "absorbedBy";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionTransferred";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "size";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "collateralTransferred";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationOrderPanicked";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "panicCode";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MainFundedChild";
    readonly inputs: readonly [{
        readonly name: "child";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "payer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "outstandingPrincipal";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "IsolatedModeSet";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "enabled";
        readonly type: "bool";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MaxLeverageSet";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "leverageX";
        readonly type: "uint16";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AccountLiquidated";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "positionsProcessed";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "stageReached";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "marginStatusBefore";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "marginStatusAfter";
        readonly type: "uint8";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionLiquidated";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "sizeDelta";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "markPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionSkippedBelowMinQuantity";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "size";
        readonly type: "int128";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionTakenOver";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "bidder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "size";
        readonly type: "int128";
        readonly indexed: false;
    }, {
        readonly name: "takeoverPrice";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationFeeCharged";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "tier";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "fillNotional";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationKeeperRewardPaid";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "keeper";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "LiquidationThrottled";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "blockVolume";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "volumeCap";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "ResidualBadDebt";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residual";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "ResidualBackedByOpenPnl";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residual";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "equity";
        readonly type: "int256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "CoverageDeclinedByEquityCap";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "declined";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "tiers";
        readonly type: "uint256[]";
        readonly indexed: false;
    }, {
        readonly name: "losses";
        readonly type: "uint256[]";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AdlCapacityShortfall";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "perpPool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residualSize";
        readonly type: "uint128";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AdlPriceCapacityExhausted";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "residual";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "AdlSessionDiscarded";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "absorbed";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "reason";
        readonly type: "uint8";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MarketCreated";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "market";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "yesId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "noId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "collateral";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "asset";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "strike";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "tradingStart";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "expiry";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "oracleQuestionId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "question";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "intervalSec";
        readonly type: "uint64";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MarketCreated";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "market";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "oracleQuestionId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "operatorId";
        readonly type: "uint32";
        readonly indexed: false;
    }, {
        readonly name: "venueId";
        readonly type: "bytes32";
        readonly indexed: false;
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "collateral";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "yesId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "noId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "nonce";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "outcomeSlotCount";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "marketType";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "tradingStart";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "expiry";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "voidPolicy";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "asset";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "strike";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "question";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "context";
        readonly type: "bytes";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MarketFinalized";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PoolReleased";
    readonly inputs: readonly [{
        readonly name: "marketId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "StatusChanged";
    readonly inputs: readonly [{
        readonly name: "oldStatus";
        readonly type: "uint8";
        readonly indexed: true;
    }, {
        readonly name: "newStatus";
        readonly type: "uint8";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Resolved";
    readonly inputs: readonly [{
        readonly name: "payoutDenominator";
        readonly type: "uint32";
        readonly indexed: false;
    }, {
        readonly name: "payoutNumerators";
        readonly type: "uint256[]";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Voided";
    readonly inputs: readonly [];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "VoidVector";
    readonly inputs: readonly [{
        readonly name: "payoutNumerators";
        readonly type: "uint256[]";
        readonly indexed: false;
    }, {
        readonly name: "policy";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "source";
        readonly type: "uint8";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "SetMinted";
    readonly inputs: readonly [{
        readonly name: "payer";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "yesTo";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "noTo";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "SetBurned";
    readonly inputs: readonly [{
        readonly name: "holder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "BinaryOrderPlaced";
    readonly inputs: readonly [{
        readonly name: "orderId";
        readonly type: "uint128";
        readonly indexed: true;
    }, {
        readonly name: "kind";
        readonly type: "uint8";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PoolFinalized";
    readonly inputs: readonly [{
        readonly name: "marketNonce";
        readonly type: "uint64";
        readonly indexed: true;
    }, {
        readonly name: "backing";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PoolRecycled";
    readonly inputs: readonly [{
        readonly name: "marketNonce";
        readonly type: "uint64";
        readonly indexed: true;
    }, {
        readonly name: "market";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MarketFinalized";
    readonly inputs: readonly [{
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "pool";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "nonce";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "collateralToken";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "netBacking";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "voided";
        readonly type: "bool";
        readonly indexed: false;
    }, {
        readonly name: "payoutNumerators";
        readonly type: "uint256[]";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "SettlementFeeCharged";
    readonly inputs: readonly [{
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "feeRecipient";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "grossBacking";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "fee";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Redeemed";
    readonly inputs: readonly [{
        readonly name: "marketKey";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "holder";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "outcomeIdx";
        readonly type: "uint8";
        readonly indexed: false;
    }, {
        readonly name: "amountBurned";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "collateralOut";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PayoutOwed";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OwedClaimed";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
