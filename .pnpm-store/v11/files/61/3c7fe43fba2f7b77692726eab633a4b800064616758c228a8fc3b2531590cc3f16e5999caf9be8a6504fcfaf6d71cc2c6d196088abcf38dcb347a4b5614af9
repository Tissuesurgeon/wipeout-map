import { type Abi } from "viem";
/**
 *  SomniaLend Pool (Aave v3 `IPool` subset) — the user actions the SDK sends
 *  (supply / withdraw / borrow / repay and the collateral toggle) plus the
 *  account-aggregate and per-reserve reads backing the lend client's `getAccount`.
 *
 * @category lending
 */
export declare const lendPoolAbi: readonly [{
    readonly name: "supply";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "onBehalfOf";
    }, {
        readonly type: "uint16";
        readonly name: "referralCode";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "withdraw";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "borrow";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "uint256";
        readonly name: "interestRateMode";
    }, {
        readonly type: "uint16";
        readonly name: "referralCode";
    }, {
        readonly type: "address";
        readonly name: "onBehalfOf";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "repay";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "uint256";
        readonly name: "interestRateMode";
    }, {
        readonly type: "address";
        readonly name: "onBehalfOf";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "repayWithATokens";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "uint256";
        readonly name: "interestRateMode";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "setUserUseReserveAsCollateral";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }, {
        readonly type: "bool";
        readonly name: "useAsCollateral";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getUserAccountData";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "user";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }, {
        readonly type: "uint256";
    }, {
        readonly type: "uint256";
    }, {
        readonly type: "uint256";
    }, {
        readonly type: "uint256";
    }, {
        readonly type: "uint256";
    }];
}, {
    readonly name: "getReservesList";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
}, {
    readonly name: "getReserveData";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "asset";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "uint256";
                readonly name: "data";
            }];
            readonly name: "configuration";
        }, {
            readonly type: "uint128";
            readonly name: "liquidityIndex";
        }, {
            readonly type: "uint128";
            readonly name: "currentLiquidityRate";
        }, {
            readonly type: "uint128";
            readonly name: "variableBorrowIndex";
        }, {
            readonly type: "uint128";
            readonly name: "currentVariableBorrowRate";
        }, {
            readonly type: "uint128";
            readonly name: "currentStableBorrowRate";
        }, {
            readonly type: "uint40";
            readonly name: "lastUpdateTimestamp";
        }, {
            readonly type: "uint16";
            readonly name: "id";
        }, {
            readonly type: "address";
            readonly name: "aTokenAddress";
        }, {
            readonly type: "address";
            readonly name: "stableDebtTokenAddress";
        }, {
            readonly type: "address";
            readonly name: "variableDebtTokenAddress";
        }, {
            readonly type: "address";
            readonly name: "interestRateStrategyAddress";
        }, {
            readonly type: "uint128";
            readonly name: "accruedToTreasury";
        }, {
            readonly type: "uint128";
            readonly name: "unbacked";
        }, {
            readonly type: "uint128";
            readonly name: "isolationModeTotalDebt";
        }];
    }];
}];
/**
 *  UiPoolDataProviderV3 — Aave's aggregated read: the whole market and a user's
 *  every position in one eth_call each (see the signature const above for the
 *  verified v3.0 tuple shape; typed as plain `Abi` deliberately).
 *
 * @category lending
 */
export declare const lendUiPoolDataProviderAbi: Abi;
/**
 *  WrappedTokenGatewayV3 — wraps/unwraps native SOMI around the WSOMI reserve so
 *  users lend/borrow the native token without touching WSOMI themselves. The
 *  v3.0 gateway takes the Pool address as its first argument on every call.
 *
 * @category lending
 */
export declare const lendGatewayAbi: readonly [{
    readonly name: "depositETH";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "address";
        readonly name: "onBehalfOf";
    }, {
        readonly type: "uint16";
        readonly name: "referralCode";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "withdrawETH";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "borrowETH";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "uint256";
        readonly name: "interestRateMode";
    }, {
        readonly type: "uint16";
        readonly name: "referralCode";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "repayETH";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "pool";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }, {
        readonly type: "uint256";
        readonly name: "interestRateMode";
    }, {
        readonly type: "address";
        readonly name: "onBehalfOf";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "getWETHAddress";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}];
/**
 *  Aave variable-debt-token credit delegation — `borrowNative` routes the borrow
 *  through the gateway, so the user must first delegate borrowing power on the
 *  WSOMI variable debt token to it (`approveDelegation`); `borrowAllowance`
 *  reads the remaining delegated headroom.
 *
 * @category lending
 */
export declare const lendDebtTokenAbi: readonly [{
    readonly name: "approveDelegation";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "delegatee";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "borrowAllowance";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "fromUser";
    }, {
        readonly type: "address";
        readonly name: "toUser";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
