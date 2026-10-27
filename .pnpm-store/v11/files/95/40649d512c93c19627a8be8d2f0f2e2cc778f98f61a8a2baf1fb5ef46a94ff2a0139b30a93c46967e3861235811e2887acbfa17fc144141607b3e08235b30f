/**
 *  The Warp Route router surface used to bridge and to preflight a bridge.
 *
 *  `transferRemote` is the one write: selector `0x81b4e8b4`, payable, returns the
 *  dispatched message id. On a **native** route the amount rides in `msg.value`;
 *  on a **collateral** route the router pulls a pre-approved ERC-20 and `msg.value`
 *  carries only the (currently zero) interchain gas payment; on a **synthetic**
 *  route the router burns the sender's balance, no approval needed.
 *
 * @category bridging
 */
export declare const warpRouterAbi: readonly [{
    readonly name: "transferRemote";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "destination";
    }, {
        readonly type: "bytes32";
        readonly name: "recipient";
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes32";
        readonly name: "messageId";
    }];
}, {
    readonly name: "quoteGasPayment";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "destinationDomain";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "routers";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "domain";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes32";
    }];
}, {
    readonly name: "destinationGas";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "domain";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "token";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "mailbox";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "interchainSecurityModule";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "ReceivedTransferRemote";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "origin";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "recipient";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}, {
    readonly name: "SentTransferRemote";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint32";
        readonly name: "destination";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "recipient";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}];
/**
 *  The Hyperlane Mailbox surface the exchange bridge uses to track one message.
 *
 *  On the origin, `transferRemote` makes the Mailbox emit `Dispatch` and then
 *  `DispatchId` for the same message, next to each other in the receipt. On the
 *  destination, the relayer's `process` emits `ProcessId` in the same transaction
 *  as the router's `ReceivedTransferRemote`. `delivered` answers whether a message
 *  id was processed, for a wait that starts after the delivery landed.
 *
 *  Upstream: `solidity/contracts/Mailbox.sol`. Verified on both lanes on 2026-09-23.
 *
 * @internal
 */
export declare const mailboxAbi: readonly [{
    readonly name: "Dispatch";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "sender";
        readonly indexed: true;
    }, {
        readonly type: "uint32";
        readonly name: "destination";
        readonly indexed: true;
    }, {
        readonly type: "bytes32";
        readonly name: "recipient";
        readonly indexed: true;
    }, {
        readonly type: "bytes";
        readonly name: "message";
    }];
}, {
    readonly name: "DispatchId";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "messageId";
        readonly indexed: true;
    }];
}, {
    readonly name: "ProcessId";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "messageId";
        readonly indexed: true;
    }];
}, {
    readonly name: "delivered";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "bytes32";
        readonly name: "messageId";
    }];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}];
