import type { DecodedEvent } from "../reducer.js";
import type { MaterializerStore } from "../store.js";
/**
 *  Fold one perp-plane event into the store. Does NOT commit — the tail batches per block.
 *
 *  The names this handles are the ones `applyEvent` routes here; anything else is ignored,
 *  so a drift between the two switches drops a row rather than writing a malformed one.
 */
export declare function applyPlaneEvent(ev: DecodedEvent, store: MaterializerStore): void;
