// Minimal ABI for a Hyperlane Warp Route router (`TokenRouter` and its
// native/collateral/synthetic subclasses) — the only contract the bridge helpers
// touch. Kept self-contained like every other ABI in this package; the ERC-20
// `approve` a collateral transfer needs comes from `erc20WriteAbi` (tradeAbi.ts)
// rather than a second copy here.
//
// Every signature below was verified against the LIVE routers on Somnia Testnet
// and Hideki Testnet (see test/bridge.e2e.test.ts): each function was called and
// returned a decodable value, and `transferRemote` was simulated via `eth_call`
// with `value = amount` on the native route, returning a real message id.
//
// Upstream: github.com/hyperlane-xyz/hyperlane-monorepo —
// `solidity/contracts/token/libs/TokenRouter.sol` + `GasRouter.sol`.
import { parseAbi } from "viem";
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
export const warpRouterAbi = parseAbi([
    "function transferRemote(uint32 destination, bytes32 recipient, uint256 amount) payable returns (bytes32 messageId)",
    // Interchain gas quote for a destination. This lane has NO InterchainGasPaymaster
    // and its Mailbox `requiredHook` is a protocol-fee hook quoting 0, so today this
    // returns 0 on every router — the relayer absorbs delivery gas. Read it anyway
    // rather than assuming: the hook's owner could price it later.
    "function quoteGasPayment(uint32 destinationDomain) view returns (uint256)",
    // The enrolled counterpart router for a domain, left-padded to bytes32. Reverts
    // `No router enrolled for domain: <n>` when the lane doesn't exist — which is
    // also what `transferRemote` does for an unenrolled destination.
    "function routers(uint32 domain) view returns (bytes32)",
    // Gas the router asks the destination to provision for delivery (44k native,
    // 64k–68k collateral/synthetic on this lane). Informational for callers.
    "function destinationGas(uint32 domain) view returns (uint256)",
    // The escrowed ERC-20 on a collateral router. NOTE: a NATIVE router answers with
    // the zero address rather than reverting — never treat the result as an ERC-20
    // without checking. Use the registry's `model` instead of probing.
    "function token() view returns (address)",
    "function owner() view returns (address)",
    "function mailbox() view returns (address)",
    "function interchainSecurityModule() view returns (address)",
    // Emitted by the DESTINATION router when the relayer delivers a transfer —
    // the signal a sender watches for to know the funds have landed. `recipient`
    // is the bytes32-padded address `transferRemote` was given.
    "event ReceivedTransferRemote(uint32 indexed origin, bytes32 indexed recipient, uint256 amount)",
    // Emitted by the ORIGIN router when `transferRemote` dispatches.
    "event SentTransferRemote(uint32 indexed destination, bytes32 indexed recipient, uint256 amount)",
]);
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
export const mailboxAbi = parseAbi([
    "event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes message)",
    "event DispatchId(bytes32 indexed messageId)",
    "event ProcessId(bytes32 indexed messageId)",
    "function delivered(bytes32 messageId) view returns (bool)",
]);
