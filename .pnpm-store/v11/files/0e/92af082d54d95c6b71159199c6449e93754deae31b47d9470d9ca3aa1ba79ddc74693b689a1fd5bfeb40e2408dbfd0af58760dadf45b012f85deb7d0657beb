// NetworkTape — the network-wide order-flow firehose, straight off the chain
// WebSocket. One TOPICS-ONLY eth_subscribe("logs") with no address filter sees
// OrderPlaced/OrderFilled from EVERY pool on the network — including pools
// created after the tape started — with zero indexer involvement.
//
// Deliberately NOT the LiveTail (liveTail.ts): no books, no snapshots, no
// seams, no indexer touch. Decoded events fan into three capped ring buffers
// (bids / fills / asks) plus a session-scoped `(pool, orderId) → owner` map
// that attributes fills: the taker's OrderPlaced lands AFTER its fills in the
// same tx (the same ordering the indexer's PendingTakerFill bridge exists for),
// so takers always resolve; makers resolve when their quote was placed while
// the tape was running. Order ids are never reused (monotonic low-64 counter
// per pool), so the owner map can never misattribute — its cap is a memory
// bound, not a correctness mechanism.
//
// Somnia quirks handled (same playbook as liveTail.ts):
//  - WS subscriptions die SILENTLY: a newHeads stream doubles as the liveness
//    probe; sustained head silence while the chain head moves → reconnect.
//  - Instant BFT finality: no reorgs, append-only buffers are safe.
//  - Logs carry no timestamp: rows are stamped with arrival time.
//
// Enrichment (symbols, decimals, market labels) is deliberately OUT of scope —
// join rows to `listMarkets` / `getMarketByPool` at the presentation layer.
import { decodeEventLog, getAbiItem, toEventSelector } from "viem";
import * as EventsAbi from "./eventsAbi.js";
// Derived from the SAME abi this file decodes with, never hand-typed. A restated
// signature that drifts from the ABI — one reordered struct field is enough —
// yields a selector that matches no log: the firehose goes silent with no
// compile error and no runtime error. Same derivation as `logTopics.topic0Set`.
const topicOf = (name) => toEventSelector(getAbiItem({ abi: EventsAbi.orderBookEventsAbi, name }));
const PLACED_TOPIC = topicOf("OrderPlaced");
const FILLED_TOPIC = topicOf("OrderFilled");
const DEFAULT_MAX_ROWS = 60;
const DEFAULT_OWNER_MAP_CAP = 20_000;
const RATE_WINDOW_MS = 5_000;
const HEADS_STALL_MS = 15_000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8_000;
/**
 *  The live network-wide order-flow tape. Construct via
 *  {@link SomniaMarketsClient.createNetworkTape}; nothing connects until the
 *  first {@link subscribe}, and the socket closes when the last listener
 *  unsubscribes. Rows are read synchronously off {@link bids} / {@link fills} /
 *  {@link asks} after a listener fires.
 */
export class NetworkTape {
    wsUrl;
    /** Newest-first ring buffer of bid placements (capped at `maxRows`). */
    bids = [];
    /** Newest-first ring buffer of fills. */
    fills = [];
    /** Newest-first ring buffer of ask placements. */
    asks = [];
    maxRows;
    ownerMapCap;
    ws = null;
    listeners = new Set();
    notifyScheduled = false;
    owners = new Map();
    pools = new Set();
    connected = false;
    closed = true;
    lastBlock = 0;
    lastHeadAt = 0;
    reconnectDelay = RECONNECT_BASE_MS;
    reconnectTimer = null;
    stallTimer = null;
    probeId = null;
    rpcId = 1;
    bidTimes = [];
    fillTimes = [];
    askTimes = [];
    /** @internal Use {@link SomniaMarketsClient.createNetworkTape}. */
    constructor(wsUrl, opts = {}) {
        this.wsUrl = wsUrl;
        this.maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS;
        this.ownerMapCap = opts.ownerMapCap ?? DEFAULT_OWNER_MAP_CAP;
    }
    /**
     *  Register a listener (fired, microtask-coalesced, after each applied batch —
     *  read the row buffers in it). The FIRST subscription opens the socket; the
     *  returned unsubscribe closes it again when it releases the last one.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        if (this.listeners.size === 1)
            this.start();
        return () => {
            this.listeners.delete(listener);
            if (this.listeners.size === 0)
                this.stop();
        };
    }
    getStatus() {
        const now = Date.now();
        const rate = (times) => times.filter((t) => now - t < RATE_WINDOW_MS).length / (RATE_WINDOW_MS / 1000);
        return {
            connected: this.connected,
            lastBlock: this.lastBlock,
            poolsSeen: this.pools.size,
            bidRate: rate(this.bidTimes),
            fillRate: rate(this.fillTimes),
            askRate: rate(this.askTimes),
        };
    }
    /* ---- lifecycle ---- */
    start() {
        if (typeof WebSocket === "undefined")
            return; // SSR — subscribe again client-side
        this.closed = false;
        this.connect();
        this.stallTimer = setInterval(() => this.checkStall(), HEADS_STALL_MS / 3);
    }
    stop() {
        this.closed = true;
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        if (this.stallTimer)
            clearInterval(this.stallTimer);
        this.stallTimer = null;
        this.teardownSocket();
        this.connected = false;
    }
    connect() {
        if (this.closed || this.ws)
            return;
        let ws;
        try {
            ws = new WebSocket(this.wsUrl);
        }
        catch {
            this.scheduleReconnect();
            return;
        }
        this.ws = ws;
        ws.onopen = () => {
            if (this.ws !== ws)
                return;
            this.connected = true;
            this.reconnectDelay = RECONNECT_BASE_MS;
            this.lastHeadAt = Date.now();
            // Topics-only: every contract emitting these signatures, network-wide.
            this.send(ws, "eth_subscribe", ["logs", { topics: [[PLACED_TOPIC, FILLED_TOPIC]] }]);
            this.send(ws, "eth_subscribe", ["newHeads"]);
            this.notify();
        };
        ws.onmessage = (e) => {
            if (this.ws !== ws)
                return;
            this.onMessage(String(e.data));
        };
        ws.onclose = () => {
            if (this.ws !== ws)
                return;
            this.ws = null;
            this.connected = false;
            // A probe outstanding when the socket drops can never be answered. Clearing
            // it here as well as in `teardownSocket` is what stops it latching across
            // the reconnect and disabling stall detection for the tape's lifetime.
            this.probeId = null;
            this.notify();
            this.scheduleReconnect();
        };
        ws.onerror = () => {
            /* onclose follows */
        };
    }
    teardownSocket() {
        // An in-flight probe dies with the socket: its reply can never arrive, so
        // clear it here rather than waiting for a response that is not coming.
        this.probeId = null;
        const ws = this.ws;
        this.ws = null;
        if (!ws)
            return;
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        try {
            ws.close();
        }
        catch {
            /* already dead */
        }
    }
    scheduleReconnect() {
        if (this.closed || this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    }
    // A Somnia WS sub can die with the socket still answering requests. Heads
    // land multiple times per second, so silence + a moving chain head is
    // unambiguous; a quiet chain (idle local anvil) is ruled out by the probe.
    checkStall() {
        if (!this.connected || this.probeId !== null || Date.now() - this.lastHeadAt < HEADS_STALL_MS)
            return;
        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        this.probeId = this.send(ws, "eth_blockNumber", []);
    }
    onProbeResult(headHex) {
        const head = Number.parseInt(headHex, 16);
        // Seed from the probe itself the first time. `lastBlock` is otherwise only
        // written by newHeads, so on a chain quiet enough to deliver none it stayed
        // 0 and every probe read as "the chain moved" — thrashing the reconnect on
        // exactly the idle chain this probe exists to recognise.
        if (this.lastBlock === 0 && Number.isFinite(head)) {
            this.lastBlock = head;
            this.lastHeadAt = Date.now();
            return;
        }
        if (Number.isFinite(head) && head > this.lastBlock) {
            // Chain moved while our heads stream was silent → the sub is dead.
            this.teardownSocket();
            this.connected = false;
            this.notify();
            this.scheduleReconnect();
        }
        else {
            this.lastHeadAt = Date.now(); // genuinely quiet chain — don't thrash
        }
    }
    send(ws, method, params) {
        const id = this.rpcId++;
        ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
        return id;
    }
    /* ---- inbound ---- */
    onMessage(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (msg.id != null && msg.id === this.probeId) {
            // ANY reply bearing the probe's id ends the probe. A JSON-RPC error carries
            // `error` and no `result`; treating only a string result as an answer left
            // a latched probe disables stall detection for good.
            this.probeId = null;
            if (typeof msg.result === "string")
                this.onProbeResult(msg.result);
            return;
        }
        if (msg.method !== "eth_subscription")
            return;
        const result = msg.params?.result;
        if (!result)
            return;
        if (typeof result.number === "string") {
            // newHeads
            this.lastHeadAt = Date.now();
            const n = Number.parseInt(result.number, 16);
            if (Number.isFinite(n) && n > this.lastBlock) {
                this.lastBlock = n;
                this.notify();
            }
            return;
        }
        if (Array.isArray(result.topics))
            this.onLog(result);
    }
    onLog(log) {
        let decoded;
        try {
            decoded = decodeEventLog({
                abi: EventsAbi.orderBookEventsAbi,
                data: log.data,
                topics: log.topics,
            });
        }
        catch {
            return; // topic collision from an unrelated contract — ignore
        }
        const pool = log.address.toLowerCase();
        const blockNumber = Number.parseInt(log.blockNumber, 16) || this.lastBlock;
        const logIndex = Number.parseInt(log.logIndex, 16) || 0;
        const key = `${blockNumber}_${logIndex}_${pool}`;
        const at = Date.now();
        this.pools.add(pool);
        if (decoded.eventName === "OrderPlaced") {
            const o = decoded.args.placedOrder;
            const owner = o.owner.toLowerCase();
            this.rememberOwner(pool, o.orderId, owner);
            // The taker's OrderPlaced lands AFTER its fills in the same tx — patch
            // any recent fill still missing this identity.
            this.patchFills(pool, o.orderId, owner);
            const row = {
                key,
                pool,
                orderId: o.orderId,
                owner,
                isBid: o.isBid,
                price: o.price,
                quantity: o.fullQuantity,
                blockNumber,
                logIndex,
                at,
            };
            if (o.isBid) {
                this.bids = [row, ...this.bids].slice(0, this.maxRows);
                this.pushTime(this.bidTimes, at);
            }
            else {
                this.asks = [row, ...this.asks].slice(0, this.maxRows);
                this.pushTime(this.askTimes, at);
            }
        }
        else if (decoded.eventName === "OrderFilled") {
            const a = decoded.args;
            this.fills = [
                {
                    key,
                    pool,
                    takerOrderId: a.takerOrderId,
                    makerOrderId: a.makerOrderId,
                    price: a.fillPrice,
                    quantity: a.quantityFilled,
                    taker: this.owners.get(`${pool}_${a.takerOrderId}`) ?? null,
                    maker: this.owners.get(`${pool}_${a.makerOrderId}`) ?? null,
                    blockNumber,
                    logIndex,
                    at,
                },
                ...this.fills,
            ].slice(0, this.maxRows);
            this.pushTime(this.fillTimes, at);
        }
        else {
            return; // another orderBookEventsAbi member sharing neither topic — unreachable
        }
        this.notify();
    }
    rememberOwner(pool, orderId, owner) {
        if (this.owners.size >= this.ownerMapCap) {
            // Map iteration order = insertion order → evicting the first key is
            // oldest-first. Ids never reuse, so eviction can only lose attribution,
            // never corrupt it.
            const oldest = this.owners.keys().next().value;
            if (oldest !== undefined)
                this.owners.delete(oldest);
        }
        this.owners.set(`${pool}_${orderId}`, owner);
    }
    patchFills(pool, orderId, owner) {
        for (const f of this.fills) {
            if (f.pool !== pool)
                continue;
            if (f.taker === null && f.takerOrderId === orderId)
                f.taker = owner;
            if (f.maker === null && f.makerOrderId === orderId)
                f.maker = owner;
        }
    }
    pushTime(times, at) {
        times.push(at);
        while (times.length > 0 && at - times[0] > RATE_WINDOW_MS * 2)
            times.shift();
    }
    notify() {
        if (this.notifyScheduled)
            return;
        this.notifyScheduled = true;
        queueMicrotask(() => {
            this.notifyScheduled = false;
            for (const l of this.listeners)
                l();
        });
    }
}
