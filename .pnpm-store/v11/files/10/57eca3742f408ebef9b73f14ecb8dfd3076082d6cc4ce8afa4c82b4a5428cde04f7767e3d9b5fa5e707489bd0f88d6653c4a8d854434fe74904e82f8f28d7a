/** Tuning knobs for {@link SomniaMarketsClient.createNetworkTape}. All optional. */
export interface NetworkTapeOptions {
    /** Rows retained per column (bids / fills / asks). Default 60. */
    maxRows?: number;
    /** `(pool, orderId) → owner` entries retained for fill attribution. Default 20 000. */
    ownerMapCap?: number;
}
/** An order placement as the tape saw it (either side of the book). */
export interface TapeOrder {
    /** Stable row key: `${blockNumber}_${logIndex}_${pool}`. */
    key: string;
    /** Lowercased pool address the order landed on. */
    pool: string;
    /** uint128 order id — with `pool`, a permanent identity (ids never reuse). */
    orderId: bigint;
    /** Order owner, lowercased. */
    owner: string;
    isBid: boolean;
    /** Limit price, raw quote units per whole base (binary: YES-probability scale). */
    price: bigint;
    /** Full order size, raw base/outcome units. */
    quantity: bigint;
    blockNumber: number;
    logIndex: number;
    /** Arrival time (ms since epoch) — Somnia logs carry no timestamp. */
    at: number;
}
/** An executed fill as the tape saw it. */
export interface TapeFill {
    /** Stable row key: `${blockNumber}_${logIndex}_${pool}`. */
    key: string;
    pool: string;
    takerOrderId: bigint;
    makerOrderId: bigint;
    /** Execution price, raw quote units per whole base. */
    price: bigint;
    /** Quantity filled, raw base/outcome units. */
    quantity: bigint;
    /**
     *  Resolved from the session's OrderPlaced stream. The taker's placement
     *  follows its fills in the same tx, so this back-fills within one message
     *  batch; null until then (and forever, for a maker quoted before the tape
     *  started — resolve those via {@link SomniaMarketsClient.getFill} if needed).
     */
    taker: string | null;
    maker: string | null;
    blockNumber: number;
    logIndex: number;
    at: number;
}
/** The tape's health + rolling event rates. */
export interface NetworkTapeStatus {
    connected: boolean;
    /** Highest block seen on the heads stream (0 until the first head). */
    lastBlock: number;
    /** Distinct pools that have emitted since the tape started. */
    poolsSeen: number;
    /** Events per second over the tape's rolling 5s window, by column. */
    bidRate: number;
    fillRate: number;
    askRate: number;
}
/**
 *  The live network-wide order-flow tape. Construct via
 *  {@link SomniaMarketsClient.createNetworkTape}; nothing connects until the
 *  first {@link subscribe}, and the socket closes when the last listener
 *  unsubscribes. Rows are read synchronously off {@link bids} / {@link fills} /
 *  {@link asks} after a listener fires.
 */
export declare class NetworkTape {
    private readonly wsUrl;
    /** Newest-first ring buffer of bid placements (capped at `maxRows`). */
    bids: TapeOrder[];
    /** Newest-first ring buffer of fills. */
    fills: TapeFill[];
    /** Newest-first ring buffer of ask placements. */
    asks: TapeOrder[];
    private readonly maxRows;
    private readonly ownerMapCap;
    private ws;
    private listeners;
    private notifyScheduled;
    private owners;
    private pools;
    private connected;
    private closed;
    private lastBlock;
    private lastHeadAt;
    private reconnectDelay;
    private reconnectTimer;
    private stallTimer;
    private probeId;
    private rpcId;
    private bidTimes;
    private fillTimes;
    private askTimes;
    /** @internal Use {@link SomniaMarketsClient.createNetworkTape}. */
    constructor(wsUrl: string, opts?: NetworkTapeOptions);
    /**
     *  Register a listener (fired, microtask-coalesced, after each applied batch —
     *  read the row buffers in it). The FIRST subscription opens the socket; the
     *  returned unsubscribe closes it again when it releases the last one.
     */
    subscribe(listener: () => void): () => void;
    getStatus(): NetworkTapeStatus;
    private start;
    private stop;
    private connect;
    private teardownSocket;
    private scheduleReconnect;
    private checkStall;
    private onProbeResult;
    private send;
    private onMessage;
    private onLog;
    private rememberOwner;
    private patchFills;
    private pushTime;
    private notify;
}
