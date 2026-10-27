import type { SomniaMarketsSocketFailure, SomniaMarketsWebSocketConstructor } from "./config.js";
type ConstructSocket = (url: string, protocols?: string | string[]) => WebSocket;
/** Private infrastructure forwarded from the configured root, never a capability input. */
export interface Infrastructure {
    readonly rpcWebSocketConstructor?: SomniaMarketsWebSocketConstructor;
}
/** Normalize before viem can discard a falsey cause or reinterpret an SDK class. */
export declare function failure(error: unknown, operation: string): SomniaMarketsSocketFailure;
/** Select before constructing, so the owner can check cancellation after imports. */
export declare function getConstructor(infrastructure?: Infrastructure): Promise<ConstructSocket>;
export {};
